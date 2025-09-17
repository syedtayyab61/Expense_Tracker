from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from marshmallow import Schema, fields, ValidationError
import re
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

# Blacklisted tokens storage
blacklisted_tokens = set()

# Validation schemas
class UserRegistrationSchema(Schema):
    first_name = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    last_name = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=lambda x: len(x) >= 8)

class UserLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)

def validate_password_strength(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"
    return True, "Password is strong"

@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        from models.user import User
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
            first_name=data['first_name'].strip().title(),
            last_name=data['last_name'].strip().title(),
            email=data['email'].lower(),
            password_hash=generate_password_hash(data['password']),
            created_at=datetime.utcnow(),
            is_active=True
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Generate tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            'message': 'User registered successfully',
            'user': {
                'id': user.id,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 201
        
    except ValidationError as e:
        return jsonify({
            'message': 'Invalid input data',
            'errors': e.messages
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
        from models.user import User
        
        # Validate request data
        schema = UserLoginSchema()
        data = schema.load(request.get_json())
        
        # Find user and verify password
        user = User.query.filter_by(email=data['email'].lower()).first()
        
        if not user or not check_password_hash(user.password_hash, data['password']):
            return jsonify({
                'message': 'Invalid email or password'
            }), 401
        
        if not user.is_active:
            return jsonify({
                'message': 'Account is deactivated'
            }), 401
        
        # Update last login
        user.last_login = datetime.utcnow()
        from app import db
        db.session.commit()
        
        # Generate tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200
        
    except ValidationError as e:
        return jsonify({
            'message': 'Invalid input data',
            'errors': e.messages
        }), 400
    except Exception as e:
        return jsonify({
            'message': 'Login failed',
            'error': str(e)
        }), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user profile"""
    try:
        from models.user import User
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
            
        return jsonify({
            'user': {
                'id': user.id,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'last_login': user.last_login.isoformat() if user.last_login else None
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to get user profile',
            'error': str(e)
        }), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout endpoint"""
    try:
        from flask_jwt_extended import get_jwt
        
        # Add token to blacklist
        jti = get_jwt()['jti']
        blacklisted_tokens.add(jti)
        
        return jsonify({'message': 'Successfully logged out'}), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Logout failed',
            'error': str(e)
        }), 500

# JWT token blacklist checker (used as callback, not as route)
def check_if_token_revoked(jwt_header, jwt_payload):
    """Check if JWT token is blacklisted"""
    jti = jwt_payload['jti']
    return jti in blacklisted_tokens
