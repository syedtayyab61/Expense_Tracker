from datetime import datetime
import bcrypt
from flask_jwt_extended import create_access_token, create_refresh_token

# Import db from app module to avoid circular imports
from app import db

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    currency = db.Column(db.String(3), default='USD', nullable=False)
    email_notifications = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Relationships
    expenses = db.relationship('Expense', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    budgets = db.relationship('Budget', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    def __init__(self, email, password, first_name, last_name, currency='USD', email_notifications=True):
        self.email = email.lower()
        self.set_password(password)
        self.first_name = first_name
        self.last_name = last_name
        self.currency = currency
        self.email_notifications = email_notifications
    
    def set_password(self, password):
        """Hash and set the user's password"""
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password):
        """Check if the provided password matches the stored hash"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def generate_tokens(self):
        """Generate JWT access and refresh tokens"""
        access_token = create_access_token(identity=self.id)
        refresh_token = create_refresh_token(identity=self.id)
        return {
            'access_token': access_token,
            'refresh_token': refresh_token
        }
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def to_dict(self, include_sensitive=False):
        """Convert user object to dictionary"""
        data = {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'currency': self.currency,
            'email_notifications': self.email_notifications,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
        
        if include_sensitive:
            data['password_hash'] = self.password_hash
        
        return data
    
    def update_last_login(self):
        """Update the user's last login timestamp"""
        self.last_login = datetime.utcnow()
        db.session.commit()
    
    def get_total_expenses(self, start_date=None, end_date=None):
        """Get total expenses for the user within a date range"""
        query = self.expenses
        
        if start_date:
            query = query.filter(Expense.date >= start_date)
        if end_date:
            query = query.filter(Expense.date <= end_date)
        
        return sum(expense.amount for expense in query.all())
    
    def get_expenses_by_category(self, start_date=None, end_date=None):
        """Get expenses grouped by category"""
        query = self.expenses
        
        if start_date:
            query = query.filter(Expense.date >= start_date)
        if end_date:
            query = query.filter(Expense.date <= end_date)
        
        expenses = query.all()
        category_totals = {}
        
        for expense in expenses:
            if expense.category not in category_totals:
                category_totals[expense.category] = 0
            category_totals[expense.category] += expense.amount
        
        return category_totals
    
    def get_monthly_spending(self, year=None, month=None):
        """Get spending for a specific month"""
        if not year:
            year = datetime.utcnow().year
        if not month:
            month = datetime.utcnow().month
        
        from sqlalchemy import extract
        monthly_expenses = self.expenses.filter(
            extract('year', Expense.date) == year,
            extract('month', Expense.date) == month
        ).all()
        
        return sum(expense.amount for expense in monthly_expenses)
    
    def __repr__(self):
        return f'<User {self.email}>'

# Import Expense model to avoid circular imports
from models.expense import Expense
