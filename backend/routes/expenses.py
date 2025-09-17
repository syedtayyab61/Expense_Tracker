from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import Schema, fields, ValidationError
from app import db
from models.expense import Expense
from models.user import User
from datetime import datetime, date
from decimal import Decimal

expenses_bp = Blueprint('expenses', __name__)

# Validation schemas
class ExpenseSchema(Schema):
    amount = fields.Decimal(required=True, places=2, validate=lambda x: x > 0)
    category = fields.Str(required=True, validate=lambda x: x.lower() in Expense.VALID_CATEGORIES)
    description = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    date = fields.Date(required=True)
    notes = fields.Str(load_default=None)
    tags = fields.Str(load_default=None)
    location = fields.Str(load_default=None)
    payment_method = fields.Str(load_default='cash', validate=lambda x: x in Expense.VALID_PAYMENT_METHODS)

class ExpenseUpdateSchema(Schema):
    amount = fields.Decimal(places=2, validate=lambda x: x > 0)
    category = fields.Str(validate=lambda x: x.lower() in Expense.VALID_CATEGORIES)
    description = fields.Str(validate=lambda x: len(x.strip()) > 0)
    date = fields.Date()
    notes = fields.Str()
    tags = fields.Str()
    location = fields.Str()
    payment_method = fields.Str(validate=lambda x: x in Expense.VALID_PAYMENT_METHODS)

@expenses_bp.route('/', methods=['GET'])
@jwt_required()
def get_expenses():
    """Get user's expenses with optional filtering"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        category = request.args.get('category')
        limit = request.args.get('limit', type=int)
        offset = request.args.get('offset', default=0, type=int)
        
        # Parse dates
        start_date_obj = None
        end_date_obj = None
        
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'message': 'Invalid start_date format. Use YYYY-MM-DD',
                    'error': 'invalid_date_format'
                }), 400
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'message': 'Invalid end_date format. Use YYYY-MM-DD',
                    'error': 'invalid_date_format'
                }), 400
        
        # Get expenses
        query = Expense.query.filter_by(user_id=current_user_id)
        
        if start_date_obj:
            query = query.filter(Expense.date >= start_date_obj)
        if end_date_obj:
            query = query.filter(Expense.date <= end_date_obj)
        if category:
            query = query.filter_by(category=category.lower())
        
        # Get total count for pagination
        total_count = query.count()
        
        # Apply pagination
        query = query.order_by(Expense.date.desc(), Expense.created_at.desc())
        
        if limit:
            query = query.limit(limit)
        if offset:
            query = query.offset(offset)
        
        expenses = query.all()
        
        # Calculate summary statistics
        total_amount = sum(float(expense.amount) for expense in expenses)
        
        return jsonify({
            'expenses': [expense.to_dict() for expense in expenses],
            'pagination': {
                'total_count': total_count,
                'limit': limit,
                'offset': offset,
                'has_more': offset + len(expenses) < total_count
            },
            'summary': {
                'total_amount': total_amount,
                'expense_count': len(expenses),
                'average_amount': total_amount / len(expenses) if expenses else 0
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to get expenses',
            'error': str(e)
        }), 500

@expenses_bp.route('/', methods=['POST'])
@jwt_required()
def create_expense():
    """Create a new expense"""
    try:
        current_user_id = get_jwt_identity()
        
        # Validate request data
        schema = ExpenseSchema()
        data = schema.load(request.get_json())
        
        # Create expense
        expense = Expense(
            user_id=current_user_id,
            amount=data['amount'],
            category=data['category'].lower(),
            description=data['description'].strip(),
            date=data['date'],
            notes=data.get('notes'),
            tags=data.get('tags'),
            location=data.get('location'),
            payment_method=data.get('payment_method', 'cash')
        )
        
        db.session.add(expense)
        db.session.commit()
        
        # Check budget alerts after adding expense
        from models.budget import Budget
        from models.notification import Notification
        
        # Get active budgets for this category and total budget
        category_budget = Budget.query.filter(
            Budget.user_id == current_user_id,
            Budget.category == expense.category,
            Budget.is_active == True,
            Budget.start_date <= expense.date,
            Budget.end_date >= expense.date
        ).first()
        
        total_budget = Budget.query.filter(
            Budget.user_id == current_user_id,
            Budget.category == 'total',
            Budget.is_active == True,
            Budget.start_date <= expense.date,
            Budget.end_date >= expense.date
        ).first()
        
        notifications_created = []
        
        # Check category budget
        if category_budget:
            percentage_used = category_budget.get_percentage_used()
            
            if category_budget.is_over_budget():
                notification = Notification.create_budget_exceeded(current_user_id, category_budget)
                db.session.add(notification)
                notifications_created.append(notification)
            elif category_budget.should_send_alert():
                notification = Notification.create_budget_alert(current_user_id, category_budget, percentage_used)
                db.session.add(notification)
                notifications_created.append(notification)
        
        # Check total budget
        if total_budget:
            percentage_used = total_budget.get_percentage_used()
            
            if total_budget.is_over_budget():
                notification = Notification.create_budget_exceeded(current_user_id, total_budget)
                db.session.add(notification)
                notifications_created.append(notification)
            elif total_budget.should_send_alert():
                notification = Notification.create_budget_alert(current_user_id, total_budget, percentage_used)
                db.session.add(notification)
                notifications_created.append(notification)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Expense created successfully',
            'expense': expense.to_dict(),
            'notifications': [notif.to_dict() for notif in notifications_created]
        }), 201
        
    except ValidationError as err:
        return jsonify({
            'message': 'Validation error',
            'errors': err.messages
        }), 400
    except ValueError as e:
        return jsonify({
            'message': str(e),
            'error': 'validation_error'
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to create expense',
            'error': str(e)
        }), 500

@expenses_bp.route('/<int:expense_id>', methods=['GET'])
@jwt_required()
def get_expense(expense_id):
    """Get a specific expense"""
    try:
        current_user_id = get_jwt_identity()
        
        expense = Expense.query.filter_by(
            id=expense_id,
            user_id=current_user_id
        ).first()
        
        if not expense:
            return jsonify({
                'message': 'Expense not found',
                'error': 'expense_not_found'
            }), 404
        
        return jsonify({
            'expense': expense.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to get expense',
            'error': str(e)
        }), 500

@expenses_bp.route('/<int:expense_id>', methods=['PUT'])
@jwt_required()
def update_expense(expense_id):
    """Update an expense"""
    try:
        current_user_id = get_jwt_identity()
        
        expense = Expense.query.filter_by(
            id=expense_id,
            user_id=current_user_id
        ).first()
        
        if not expense:
            return jsonify({
                'message': 'Expense not found',
                'error': 'expense_not_found'
            }), 404
        
        # Validate request data
        schema = ExpenseUpdateSchema()
        data = schema.load(request.get_json())
        
        # Update expense
        expense.update(**data)
        db.session.commit()
        
        return jsonify({
            'message': 'Expense updated successfully',
            'expense': expense.to_dict()
        }), 200
        
    except ValidationError as err:
        return jsonify({
            'message': 'Validation error',
            'errors': err.messages
        }), 400
    except ValueError as e:
        return jsonify({
            'message': str(e),
            'error': 'validation_error'
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to update expense',
            'error': str(e)
        }), 500

@expenses_bp.route('/<int:expense_id>', methods=['DELETE'])
@jwt_required()
def delete_expense(expense_id):
    """Delete an expense"""
    try:
        current_user_id = get_jwt_identity()
        
        expense = Expense.query.filter_by(
            id=expense_id,
            user_id=current_user_id
        ).first()
        
        if not expense:
            return jsonify({
                'message': 'Expense not found',
                'error': 'expense_not_found'
            }), 404
        
        db.session.delete(expense)
        db.session.commit()
        
        return jsonify({
            'message': 'Expense deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to delete expense',
            'error': str(e)
        }), 500

@expenses_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    """Get available expense categories"""
    try:
        categories = []
        for category in Expense.VALID_CATEGORIES:
            categories.append({
                'value': category,
                'label': Expense.get_category_display_name(category)
            })
        
        return jsonify({
            'categories': categories
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to get categories',
            'error': str(e)
        }), 500

@expenses_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_expense_summary():
    """Get expense summary with statistics"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Parse dates
        start_date_obj = None
        end_date_obj = None
        
        if start_date:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
        if end_date:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Get expenses
        expenses = Expense.get_expenses_by_user(
            current_user_id,
            start_date=start_date_obj,
            end_date=end_date_obj
        )
        
        # Calculate summary statistics
        total_amount = sum(float(expense.amount) for expense in expenses)
        expense_count = len(expenses)
        
        # Category breakdown
        category_totals = {}
        for expense in expenses:
            category = expense.category
            if category not in category_totals:
                category_totals[category] = {
                    'amount': 0,
                    'count': 0,
                    'display_name': Expense.get_category_display_name(category)
                }
            category_totals[category]['amount'] += float(expense.amount)
            category_totals[category]['count'] += 1
        
        # Sort categories by amount
        sorted_categories = sorted(
            category_totals.items(),
            key=lambda x: x[1]['amount'],
            reverse=True
        )
        
        # Payment method breakdown
        payment_method_totals = {}
        for expense in expenses:
            method = expense.payment_method
            if method not in payment_method_totals:
                payment_method_totals[method] = {
                    'amount': 0,
                    'count': 0
                }
            payment_method_totals[method]['amount'] += float(expense.amount)
            payment_method_totals[method]['count'] += 1
        
        return jsonify({
            'summary': {
                'total_amount': total_amount,
                'expense_count': expense_count,
                'average_amount': total_amount / expense_count if expense_count > 0 else 0,
                'date_range': {
                    'start_date': start_date_obj.isoformat() if start_date_obj else None,
                    'end_date': end_date_obj.isoformat() if end_date_obj else None
                }
            },
            'category_breakdown': [
                {
                    'category': category,
                    'display_name': data['display_name'],
                    'amount': data['amount'],
                    'count': data['count'],
                    'percentage': (data['amount'] / total_amount * 100) if total_amount > 0 else 0
                }
                for category, data in sorted_categories
            ],
            'payment_method_breakdown': [
                {
                    'payment_method': method,
                    'amount': data['amount'],
                    'count': data['count'],
                    'percentage': (data['amount'] / total_amount * 100) if total_amount > 0 else 0
                }
                for method, data in payment_method_totals.items()
            ]
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to get expense summary',
            'error': str(e)
        }), 500

@expenses_bp.route('/bulk', methods=['POST'])
@jwt_required()
def create_bulk_expenses():
    """Create multiple expenses at once"""
    try:
        current_user_id = get_jwt_identity()
        
        data = request.get_json()
        expenses_data = data.get('expenses', [])
        
        if not expenses_data:
            return jsonify({
                'message': 'No expenses provided',
                'error': 'no_expenses'
            }), 400
        
        # Validate each expense
        schema = ExpenseSchema()
        created_expenses = []
        errors = []
        
        for i, expense_data in enumerate(expenses_data):
            try:
                validated_data = schema.load(expense_data)
                
                expense = Expense(
                    user_id=current_user_id,
                    amount=validated_data['amount'],
                    category=validated_data['category'].lower(),
                    description=validated_data['description'].strip(),
                    date=validated_data['date'],
                    notes=validated_data.get('notes'),
                    tags=validated_data.get('tags'),
                    location=validated_data.get('location'),
                    payment_method=validated_data.get('payment_method', 'cash')
                )
                
                db.session.add(expense)
                created_expenses.append(expense)
                
            except ValidationError as err:
                errors.append({
                    'index': i,
                    'errors': err.messages
                })
            except ValueError as e:
                errors.append({
                    'index': i,
                    'errors': {'general': str(e)}
                })
        
        if errors:
            db.session.rollback()
            return jsonify({
                'message': 'Validation errors in bulk expense creation',
                'errors': errors
            }), 400
        
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully created {len(created_expenses)} expenses',
            'expenses': [expense.to_dict() for expense in created_expenses]
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Failed to create bulk expenses',
            'error': str(e)
        }), 500
