from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from marshmallow import Schema, fields, ValidationError
import re
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

# Validation schemas
class UserRegistrationSchema(Schema):
    first_name = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    last_name = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=lambda x: len(x) >= 8)
    currency = fields.Str(load_default='USD')
    email_notifications = fields.Bool(load_default=True)

class UserLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)
    remember_me = fields.Bool(load_default=False)

class UserUpdateSchema(Schema):
    first_name = fields.Str()
    last_name = fields.Str()
    currency = fields.Str()
    email_notifications = fields.Bool()

# JWT blacklist (in production, use Redis or database)
blacklisted_tokens = set()

def validate_password_strength(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one digit"
    
    if not re.search(r'[!@#$%^&*()_+=\[{\]};:<>|./?,-]', password):
        return False, "Password must contain at least one special character"
    
    return True, "Password is strong"

@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        # Import models within function to avoid circular imports
        from models.user import User
        from models.notification import Notification
        from app import db
        
        # Validate request data
        schema = UserRegistrationSchema()
        data = schema.load(request.get_json())
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=data['email'].lower()).first()
        if existing_user:
            return jsonify({
                'message': 'User with this email already exists',
                'error': 'email_exists'
            }), 400
        
        # Validate password strength
        is_strong, message = validate_password_strength(data['password'])
        if not is_strong:
            return jsonify({
                'message': message,
                'error': 'weak_password'
            }), 400
        
        # Create new user
        user = User(
            email=data['email'].lower(),
            password=data['password'],
            first_name=data['first_name'].strip(),
            last_name=data['last_name'].strip(),
            currency=data.get('currency', 'USD'),
            email_notifications=data.get('email_notifications', True)
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Create welcome notification
        welcome_notification = Notification.create_welcome_notification(
            user.id, 
            user.first_name
        )
        db.session.add(welcome_notification)
        db.session.commit()
        
        return jsonify({
            'message': 'User registered successfully',
            'user': user.to_dict()
        }), 201
        
    except ValidationError as err:
        return jsonify({
            'message': 'Validation error',
            'errors': err.messages
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Registration failed',
            'error': str(e)
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        # Validate request data
        schema = UserLoginSchema()
        data = schema.load(request.get_json())
        
        # Find user
        user = User.query.filter_by(email=data['email'].lower()).first()
        
        # Check credentials
        if not user or not user.check_password(data['password']):
            return jsonify({
                'message': 'Invalid email or password',
                'error': 'invalid_credentials'
            }), 401
        
        # Check if account is active
        if not user.is_active:
            return jsonify({
                'message': 'Account is deactivated',
                'error': 'account_deactivated'
            }), 401
        
        # Generate tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        # Update last login
        user.update_last_login()
        
        return jsonify({
            'message': 'Login successful',
            'token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200
        
    except ValidationError as err:
        return jsonify({
            'message': 'Validation error',
            'errors': err.messages
        }), 400
    except Exception as e:
        return jsonify({
            'message': 'Login failed',
            'error': str(e)
        }), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_active:
            return jsonify({
                'message': 'User not found or inactive',
                'error': 'user_not_found'
            }), 404
        
        # Generate new access token
        new_access_token = create_access_token(identity=current_user_id)
        
        return jsonify({
            'token': new_access_token
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Token refresh failed',
            'error': str(e)
        }), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout endpoint"""
    try:
        # Get JWT token
        jti = get_jwt()['jti']
        
        # Add token to blacklist
        blacklisted_tokens.add(jti)
        
        return jsonify({
            'message': 'Logout successful'
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Logout failed',
            'error': str(e)
        }), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get user profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'message': 'User not found',
                'error': 'user_not_found'
            }), 404
        
        # Get user statistics
        from models.expense import Expense
        from models.budget import Budget
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        # Total expenses
        total_expenses = user.get_total_expenses()
        
        # This month's expenses
        now = datetime.utcnow()
        this_month_expenses = user.get_monthly_spending(now.year, now.month)
        
        # Number of expenses
        expense_count = user.expenses.count()
        
        # Active budgets
        active_budgets = Budget.get_active_budgets(current_user_id)
        
        # Recent activity (last 30 days)
        thirty_days_ago = now.date() - timedelta(days=30)
        recent_expenses = Expense.get_expenses_by_user(
            current_user_id, 
            start_date=thirty_days_ago, 
            limit=5
        )
        
        profile_data = user.to_dict()
        profile_data.update({
            'statistics': {
                'total_expenses': float(total_expenses),
                'this_month_expenses': float(this_month_expenses),
                'expense_count': expense_count,
                'active_budgets_count': len(active_budgets),
                'recent_expenses': [expense.to_dict() for expense in recent_expenses]
            }
        })
        
        return jsonify(profile_data), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to get profile',
            'error': str(e)
        }), 500

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'message': 'User not found',
                'error': 'user_not_found'
            }), 404
        
        # Validate request data
        schema = UserUpdateSchema()
        data = schema.load(request.get_json())
        
        # Update user fields
        if 'first_name' in data:
            user.first_name = data['first_name'].strip()
        if 'last_name' in data:
            user.last_name = data['last_name'].strip()
        if 'currency' in data:
            user.currency = data['currency']
        if 'email_notifications' in data:
            user.email_notifications = data['email_notifications']
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
        
    except ValidationError as err:
        return jsonify({
            'message': 'Validation error',
            'errors': err.messages
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Profile update failed',
            'error': str(e)
        }), 500

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'message': 'User not found',
                'error': 'user_not_found'
            }), 404
        
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({
                'message': 'Current password and new password are required',
                'error': 'missing_fields'
            }), 400
        
        # Verify current password
        if not user.check_password(current_password):
            return jsonify({
                'message': 'Current password is incorrect',
                'error': 'invalid_password'
            }), 401
        
        # Validate new password strength
        is_strong, message = validate_password_strength(new_password)
        if not is_strong:
            return jsonify({
                'message': message,
                'error': 'weak_password'
            }), 400
        
        # Update password
        user.set_password(new_password)
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Password change failed',
            'error': str(e)
        }), 500

@auth_bp.route('/delete-account', methods=['DELETE'])
@jwt_required()
def delete_account():
    """Delete user account"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'message': 'User not found',
                'error': 'user_not_found'
            }), 404
        
        data = request.get_json()
        password = data.get('password')
        
        if not password:
            return jsonify({
                'message': 'Password confirmation required',
                'error': 'password_required'
            }), 400
        
        # Verify password
        if not user.check_password(password):
            return jsonify({
                'message': 'Password is incorrect',
                'error': 'invalid_password'
            }), 401
        
        # Soft delete (deactivate) or hard delete based on preference
        # For GDPR compliance, we'll do a soft delete first
        user.is_active = False
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Account deactivated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'message': 'Account deletion failed',
            'error': str(e)
        }), 500

# JWT token blacklist checker
# JWT token blacklist checker (used as callback, not as route)
def check_if_token_revoked(jwt_header, jwt_payload):
    """Check if JWT token is blacklisted"""
    jti = jwt_payload['jti']
    return jti in blacklisted_tokens
