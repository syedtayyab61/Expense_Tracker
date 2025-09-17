from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import json
import os
from datetime import datetime, timedelta

# Simple in-memory storage for demo
users_db = {}
expenses_db = {}
user_counter = 1

app = Flask(__name__)

# Configuration
app.config['JWT_SECRET_KEY'] = 'demo-secret-key-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)

# Initialize extensions
jwt = JWTManager(app)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:8001", "http://127.0.0.1:8001", "file:///*"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Health check
@app.route('/api/health')
def health_check():
    return {'status': 'healthy', 'message': 'Personal Finance API is running'}, 200

@app.route('/')
def index():
    return {'message': 'Personal Finance API Demo', 'version': '1.0.0'}, 200

# Authentication Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['first_name', 'last_name', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'message': f'{field} is required'}), 400
        
        email = data['email'].lower()
        
        # Check if user already exists
        if email in users_db:
            return jsonify({'message': 'User with this email already exists'}), 400
        
        # Create user
        global user_counter
        user_id = user_counter
        user_counter += 1
        
        users_db[email] = {
            'id': user_id,
            'first_name': data['first_name'].strip().title(),
            'last_name': data['last_name'].strip().title(),
            'email': email,
            'password': data['password'],  # In real app, this would be hashed
            'created_at': datetime.now().isoformat(),
            'is_active': True
        }
        
        # Generate token
        access_token = create_access_token(identity=user_id)
        
        return jsonify({
            'message': 'User registered successfully',
            'user': {
                'id': user_id,
                'first_name': users_db[email]['first_name'],
                'last_name': users_db[email]['last_name'],
                'email': email
            },
            'access_token': access_token
        }), 201
        
    except Exception as e:
        return jsonify({
            'message': 'Registration failed',
            'error': str(e)
        }), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        email = data.get('email', '').lower()
        password = data.get('password', '')
        
        # Check if user exists and password matches
        if email not in users_db or users_db[email]['password'] != password:
            return jsonify({'message': 'Invalid email or password'}), 401
        
        user = users_db[email]
        
        if not user['is_active']:
            return jsonify({'message': 'Account is deactivated'}), 401
        
        # Generate token
        access_token = create_access_token(identity=user['id'])
        
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'first_name': user['first_name'],
                'last_name': user['last_name'],
                'email': user['email']
            },
            'access_token': access_token
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Login failed',
            'error': str(e)
        }), 500

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        current_user_id = get_jwt_identity()
        
        # Find user by ID
        for email, user in users_db.items():
            if user['id'] == current_user_id:
                return jsonify({
                    'user': {
                        'id': user['id'],
                        'first_name': user['first_name'],
                        'last_name': user['last_name'],
                        'email': user['email'],
                        'created_at': user['created_at']
                    }
                }), 200
                
        return jsonify({'message': 'User not found'}), 404
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to get user profile',
            'error': str(e)
        }), 500

# Expenses Routes
@app.route('/api/expenses', methods=['GET'])
@jwt_required()
def get_expenses():
    try:
        current_user_id = get_jwt_identity()
        
        # Get user expenses
        user_expenses = [exp for exp in expenses_db.values() if exp['user_id'] == current_user_id]
        
        return jsonify({
            'expenses': user_expenses,
            'total': len(user_expenses)
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to get expenses',
            'error': str(e)
        }), 500

@app.route('/api/expenses', methods=['POST'])
@jwt_required()
def add_expense():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Generate expense ID
        expense_id = len(expenses_db) + 1
        
        expense = {
            'id': expense_id,
            'user_id': current_user_id,
            'amount': float(data.get('amount', 0)),
            'category': data.get('category', 'Other'),
            'description': data.get('description', ''),
            'date': data.get('date', datetime.now().isoformat()),
            'created_at': datetime.now().isoformat()
        }
        
        expenses_db[expense_id] = expense
        
        return jsonify({
            'message': 'Expense added successfully',
            'expense': expense
        }), 201
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to add expense',
            'error': str(e)
        }), 500

# Analytics Routes
@app.route('/api/analytics/summary', methods=['GET'])
@jwt_required()
def get_analytics_summary():
    try:
        current_user_id = get_jwt_identity()
        
        # Get user expenses
        user_expenses = [exp for exp in expenses_db.values() if exp['user_id'] == current_user_id]
        
        # Calculate summary
        total_spent = sum(exp['amount'] for exp in user_expenses)
        total_transactions = len(user_expenses)
        
        # Category breakdown
        categories = {}
        for exp in user_expenses:
            cat = exp['category']
            categories[cat] = categories.get(cat, 0) + exp['amount']
        
        return jsonify({
            'summary': {
                'total_spent': total_spent,
                'total_transactions': total_transactions,
                'categories': categories
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to get analytics',
            'error': str(e)
        }), 500

# Notifications Routes
@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    try:
        # For demo, use default user ID or get from JWT if available
        try:
            current_user_id = get_jwt_identity() if request.headers.get('Authorization') else 1
        except:
            current_user_id = 1
        
        # Demo notifications data
        notifications = [
            {
                'id': 1,
                'user_id': current_user_id,
                'title': 'Welcome to Finance Tracker!',
                'message': 'Start tracking your expenses to gain insights into your spending habits.',
                'type': 'welcome',
                'is_read': False,
                'created_at': datetime.now().isoformat()
            },
            {
                'id': 2,
                'user_id': current_user_id,
                'title': 'Budget Alert',
                'message': 'You have spent ₹2,950 out of your ₹5,000 monthly budget.',
                'type': 'budget_alert',
                'is_read': True,
                'created_at': (datetime.now() - timedelta(hours=2)).isoformat()
            }
        ]
        
        return jsonify({
            'notifications': notifications,
            'total': len(notifications),
            'unread_count': len([n for n in notifications if not n['is_read']])
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to get notifications',
            'error': str(e)
        }), 500

@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_notification_read(notification_id):
    try:
        return jsonify({'message': 'Notification marked as read'}), 200
    except Exception as e:
        return jsonify({'message': 'Failed to mark notification as read', 'error': str(e)}), 500

@app.route('/api/notifications/mark-all-read', methods=['PUT'])
def mark_all_notifications_read():
    try:
        return jsonify({'message': 'All notifications marked as read'}), 200
    except Exception as e:
        return jsonify({'message': 'Failed to mark all notifications as read', 'error': str(e)}), 500

@app.route('/api/notifications/budget-alerts', methods=['GET'])
def get_budget_alerts():
    try:
        return jsonify({
            'alerts': [
                {
                    'category': 'Food',
                    'spent': 1200,
                    'budget': 2000,
                    'percentage': 60
                }
            ]
        }), 200
    except Exception as e:
        return jsonify({'message': 'Failed to get budget alerts', 'error': str(e)}), 500

@app.route('/api/notifications/spending-warnings', methods=['GET'])
def get_spending_warnings():
    try:
        return jsonify({
            'warnings': [
                {
                    'message': 'Your Transportation spending is trending high this month.',
                    'category': 'Transportation'
                }
            ]
        }), 200
    except Exception as e:
        return jsonify({'message': 'Failed to get spending warnings', 'error': str(e)}), 500

if __name__ == '__main__':
    # Add some demo data
    users_db['demo@example.com'] = {
        'id': 1,
        'first_name': 'Demo',
        'last_name': 'User',
        'email': 'demo@example.com',
        'password': 'password123',
        'created_at': datetime.now().isoformat(),
        'is_active': True
    }
    
    # Demo expenses
    expenses_db[1] = {
        'id': 1,
        'user_id': 1,
        'amount': 450.00,
        'category': 'Food',
        'description': 'Lunch at cafe',
        'date': datetime.now().isoformat(),
        'created_at': datetime.now().isoformat()
    }
    
    expenses_db[2] = {
        'id': 2,
        'user_id': 1,
        'amount': 2500.00,
        'category': 'Transportation',
        'description': 'Petrol',
        'date': datetime.now().isoformat(),
        'created_at': datetime.now().isoformat()
    }
    
    print("Starting Personal Finance API Demo Server...")
    print("Available endpoints:")
    print("- GET  /api/health")
    print("- POST /api/auth/register")
    print("- POST /api/auth/login") 
    print("- GET  /api/auth/me")
    print("- GET  /api/expenses")
    print("- POST /api/expenses")
    print("- GET  /api/analytics/summary")
    print("- GET  /api/notifications")
    print("- PUT  /api/notifications/<id>/read")
    print("- PUT  /api/notifications/mark-all-read")
    print("- GET  /api/notifications/budget-alerts")
    print("- GET  /api/notifications/spending-warnings")
    
    app.run(debug=True, host='0.0.0.0', port=5001)
