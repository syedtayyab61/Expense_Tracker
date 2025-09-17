from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_socketio import emit, join_room, leave_room
from app import db, socketio
from models.notification import Notification
from models.budget import Budget
from models.expense import Expense
from models.user import User
from datetime import datetime, timedelta

notifications_bp = Blueprint('notifications', __name__)

# Store active WebSocket connections
active_connections = {}

@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get user notifications with pagination"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        notification_type = request.args.get('type')
        limit = request.args.get('limit', default=50, type=int)
        offset = request.args.get('offset', default=0, type=int)
        unread_only = request.args.get('unread_only', default=False, type=bool)
        
        # Get notifications
        query = Notification.query.filter_by(user_id=current_user_id)
        
        if notification_type:
            query = query.filter_by(type=notification_type)
        
        if unread_only:
            query = query.filter_by(is_read=False)
        
        # Get total count for pagination
        total_count = query.count()
        
        # Apply pagination and ordering
        notifications = query.order_by(
            Notification.created_at.desc()
        ).limit(limit).offset(offset).all()
        
        # Get unread count
        unread_count = Notification.query.filter(
            Notification.user_id == current_user_id,
            Notification.is_read == False
        ).count()
        
        return jsonify({
            'notifications': [notification.to_dict() for notification in notifications],
            'pagination': {
                'total_count': total_count,
                'unread_count': unread_count,
                'limit': limit,
                'offset': offset,
                'has_more': offset + len(notifications) < total_count
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to get notifications',
            'error': str(e)
        }), 500

@notifications_bp.route('/<int:notification_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(notification_id):
    """Mark a specific notification as read"""
    try:
        current_user_id = get_jwt_identity()
        
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=current_user_id
        ).first()
        
        if not notification:
            return jsonify({
                'message': 'Notification not found',
                'error': 'notification_not_found'
            }), 404
        
        notification.mark_as_read()
        
        # Emit real-time update
        emit_notification_update(current_user_id, {
            'type': 'notification_read',
            'notification_id': notification_id
        })
        
        return jsonify({
            'message': 'Notification marked as read',
            'notification': notification.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to mark notification as read',
            'error': str(e)
        }), 500

@notifications_bp.route('/mark-all-read', methods=['POST'])
@jwt_required()
def mark_all_notifications_read():
    """Mark all notifications as read for the user"""
    try:
        current_user_id = get_jwt_identity()
        
        count = Notification.mark_all_as_read(current_user_id)
        
        # Emit real-time update
        emit_notification_update(current_user_id, {
            'type': 'all_notifications_read',
            'count': count
        })
        
        return jsonify({
            'message': f'Marked {count} notifications as read'
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to mark all notifications as read',
            'error': str(e)
        }), 500

@notifications_bp.route('/budget-alerts', methods=['POST'])
@jwt_required()
def create_budget_alert():
    """Create a budget alert notification"""
    try:
        current_user_id = get_jwt_identity()
        
        data = request.get_json()
        budget_id = data.get('budget_id')
        
        if not budget_id:
            return jsonify({
                'message': 'Budget ID is required',
                'error': 'missing_budget_id'
            }), 400
        
        # Get budget
        budget = Budget.query.filter_by(
            id=budget_id,
            user_id=current_user_id
        ).first()
        
        if not budget:
            return jsonify({
                'message': 'Budget not found',
                'error': 'budget_not_found'
            }), 404
        
        # Check if alert should be sent
        if budget.should_send_alert():
            percentage_used = budget.get_percentage_used()
            
            notification = Notification.create_budget_alert(
                current_user_id,
                budget,
                percentage_used
            )
            
            db.session.add(notification)
            db.session.commit()
            
            # Send real-time notification
            emit_notification_update(current_user_id, {
                'type': 'new_notification',
                'notification': notification.to_dict()
            })
            
            return jsonify({
                'message': 'Budget alert created',
                'notification': notification.to_dict()
            }), 201
        else:
            return jsonify({
                'message': 'Budget alert not needed at this time'
            }), 200
            
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to create budget alert',
            'error': str(e)
        }), 500

@notifications_bp.route('/spending-warnings', methods=['GET'])
@jwt_required()
def get_spending_warnings():
    """Get spending warnings based on current patterns"""
    try:
        current_user_id = get_jwt_identity()
        
        warnings = []
        
        # Get current month spending
        now = datetime.utcnow()
        start_of_month = now.replace(day=1).date()
        
        # Get expenses for current month
        current_month_expenses = Expense.get_expenses_by_user(
            current_user_id,
            start_date=start_of_month
        )
        
        # Calculate spending by category
        category_spending = {}
        total_spending = 0
        
        for expense in current_month_expenses:
            category = expense.category
            amount = float(expense.amount)
            total_spending += amount
            
            if category not in category_spending:
                category_spending[category] = 0
            category_spending[category] += amount
        
        # Get historical averages for comparison
        six_months_ago = start_of_month - timedelta(days=180)
        historical_expenses = Expense.get_expenses_by_user(
            current_user_id,
            start_date=six_months_ago,
            end_date=start_of_month
        )
        
        historical_category_spending = {}
        historical_months = {}
        
        for expense in historical_expenses:
            month_key = expense.date.strftime('%Y-%m')
            category = expense.category
            amount = float(expense.amount)
            
            if month_key not in historical_months:
                historical_months[month_key] = {}
            if category not in historical_months[month_key]:
                historical_months[month_key][category] = 0
            historical_months[month_key][category] += amount
        
        # Calculate average monthly spending by category
        for month_data in historical_months.values():
            for category, amount in month_data.items():
                if category not in historical_category_spending:
                    historical_category_spending[category] = []
                historical_category_spending[category].append(amount)
        
        # Calculate averages and detect warnings
        for category, amounts in historical_category_spending.items():
            avg_historical = sum(amounts) / len(amounts)
            current_spending = category_spending.get(category, 0)
            
            # Days into month
            days_in_month = (now.replace(month=now.month + 1, day=1) - timedelta(days=1)).day
            days_elapsed = now.day
            
            # Project spending for full month
            if days_elapsed > 0:
                projected_spending = (current_spending / days_elapsed) * days_in_month
                
                # Check if projected spending is significantly higher
                if projected_spending > avg_historical * 1.3:  # 30% higher than average
                    warnings.append({
                        'type': 'high_spending_projection',
                        'category': category,
                        'display_name': Expense.get_category_display_name(category),
                        'current_spending': current_spending,
                        'projected_spending': projected_spending,
                        'historical_average': avg_historical,
                        'increase_percentage': ((projected_spending - avg_historical) / avg_historical) * 100,
                        'message': f"Your {Expense.get_category_display_name(category)} spending is projected to be {projected_spending:.2f} this month, {(projected_spending - avg_historical):.2f} higher than your average of ${avg_historical:.2f}"
                    })
        
        # Check for budget overruns
        active_budgets = Budget.get_active_budgets(current_user_id)
        
        for budget in active_budgets:
            if budget.is_over_budget():
                over_amount = budget.get_spent_amount() - float(budget.amount)
                warnings.append({
                    'type': 'budget_exceeded',
                    'category': budget.category,
                    'display_name': budget.get_category_display_name(),
                    'budget_amount': float(budget.amount),
                    'spent_amount': budget.get_spent_amount(),
                    'over_amount': over_amount,
                    'message': f"You've exceeded your {budget.get_category_display_name()} budget by ${over_amount:.2f}"
                })
            elif budget.should_send_alert():
                percentage_used = budget.get_percentage_used()
                warnings.append({
                    'type': 'budget_warning',
                    'category': budget.category,
                    'display_name': budget.get_category_display_name(),
                    'budget_amount': float(budget.amount),
                    'spent_amount': budget.get_spent_amount(),
                    'percentage_used': percentage_used,
                    'message': f"You've used {percentage_used:.1f}% of your {budget.get_category_display_name()} budget"
                })
        
        return jsonify({
            'warnings': warnings,
            'summary': {
                'total_warnings': len(warnings),
                'current_month_spending': total_spending,
                'analysis_date': now.isoformat()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to get spending warnings',
            'error': str(e)
        }), 500

@notifications_bp.route('/settings', methods=['GET'])
@jwt_required()
def get_notification_settings():
    """Get user notification settings"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'message': 'User not found',
                'error': 'user_not_found'
            }), 404
        
        return jsonify({
            'email_notifications': user.email_notifications,
            'push_notifications': True,  # Default enabled for web
            'budget_alerts': True,
            'spending_warnings': True,
            'monthly_reports': True
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to get notification settings',
            'error': str(e)
        }), 500

@notifications_bp.route('/settings', methods=['PUT'])
@jwt_required()
def update_notification_settings():
    """Update user notification settings"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'message': 'User not found',
                'error': 'user_not_found'
            }), 404
        
        data = request.get_json()
        
        # Update email notifications setting
        if 'email_notifications' in data:
            user.email_notifications = data['email_notifications']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Notification settings updated',
            'settings': {
                'email_notifications': user.email_notifications
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to update notification settings',
            'error': str(e)
        }), 500

# WebSocket events
@socketio.on('connect')
def handle_connect(auth):
    """Handle client connection"""
    try:
        # In production, verify JWT token from auth
        user_id = auth.get('user_id') if auth else None
        
        if user_id:
            join_room(f'user_{user_id}')
            active_connections[request.sid] = user_id
            emit('connected', {'message': 'Connected to notifications'})
    except Exception as e:
        emit('error', {'message': str(e)})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    try:
        user_id = active_connections.get(request.sid)
        if user_id:
            leave_room(f'user_{user_id}')
            del active_connections[request.sid]
    except Exception as e:
        print(f"Disconnect error: {e}")

@socketio.on('join_notifications')
def handle_join_notifications(data):
    """Join user-specific notification room"""
    try:
        user_id = data.get('user_id')
        if user_id:
            join_room(f'user_{user_id}')
            active_connections[request.sid] = user_id
            emit('joined', {'room': f'user_{user_id}'})
    except Exception as e:
        emit('error', {'message': str(e)})

def emit_notification_update(user_id, data):
    """Emit notification update to specific user"""
    try:
        socketio.emit('notification_update', data, room=f'user_{user_id}')
    except Exception as e:
        print(f"WebSocket emit error: {e}")

def send_real_time_notification(user_id, notification):
    """Send real-time notification to user"""
    try:
        socketio.emit('new_notification', {
            'notification': notification.to_dict()
        }, room=f'user_{user_id}')
    except Exception as e:
        print(f"Real-time notification error: {e}")

# Background task to check for budget alerts (would be called by scheduler)
def check_budget_alerts():
    """Check all users for budget alerts and send notifications"""
    try:
        # Get all active budgets that need alerts
        budgets_needing_alerts = db.session.query(Budget).filter(
            Budget.is_active == True
        ).all()
        
        notifications_created = 0
        
        for budget in budgets_needing_alerts:
            if budget.should_send_alert():
                # Check if alert was already sent recently
                recent_alert = Notification.query.filter(
                    Notification.user_id == budget.user_id,
                    Notification.type == 'budget_alert',
                    Notification.data['budget_id'].astext == str(budget.id),
                    Notification.created_at >= datetime.utcnow() - timedelta(hours=24)
                ).first()
                
                if not recent_alert:
                    percentage_used = budget.get_percentage_used()
                    notification = Notification.create_budget_alert(
                        budget.user_id,
                        budget,
                        percentage_used
                    )
                    
                    db.session.add(notification)
                    notifications_created += 1
                    
                    # Send real-time notification
                    send_real_time_notification(budget.user_id, notification)
        
        db.session.commit()
        return notifications_created
        
    except Exception as e:
        db.session.rollback()
        print(f"Budget alert check error: {e}")
        return 0
