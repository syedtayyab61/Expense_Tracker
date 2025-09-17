from app import db
from datetime import datetime
from sqlalchemy import Index, Numeric

class Expense(db.Model):
    __tablename__ = 'expenses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    amount = db.Column(Numeric(10, 2), nullable=False)
    category = db.Column(db.String(50), nullable=False, index=True)
    description = db.Column(db.Text, nullable=False)
    date = db.Column(db.Date, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Optional fields
    receipt_url = db.Column(db.String(255))  # For receipt images
    notes = db.Column(db.Text)  # Additional notes
    tags = db.Column(db.String(255))  # Comma-separated tags
    location = db.Column(db.String(100))  # Expense location
    payment_method = db.Column(db.String(50), default='cash')  # cash, card, transfer, etc.
    
    # Indexes for better query performance
    __table_args__ = (
        Index('idx_user_date', 'user_id', 'date'),
        Index('idx_user_category', 'user_id', 'category'),
        Index('idx_user_date_category', 'user_id', 'date', 'category'),
    )
    
    # Valid categories
    VALID_CATEGORIES = [
        'food', 'transport', 'entertainment', 'shopping', 
        'bills', 'healthcare', 'education', 'other'
    ]
    
    # Valid payment methods
    VALID_PAYMENT_METHODS = [
        'cash', 'debit_card', 'credit_card', 'bank_transfer', 
        'digital_wallet', 'check', 'other'
    ]
    
    def __init__(self, user_id, amount, category, description, date, **kwargs):
        self.user_id = user_id
        self.amount = float(amount)
        self.category = category.lower()
        self.description = description
        self.date = date
        
        # Optional fields
        self.receipt_url = kwargs.get('receipt_url')
        self.notes = kwargs.get('notes')
        self.tags = kwargs.get('tags')
        self.location = kwargs.get('location')
        self.payment_method = kwargs.get('payment_method', 'cash')
        
        # Validate category
        if self.category not in self.VALID_CATEGORIES:
            raise ValueError(f"Invalid category. Must be one of: {', '.join(self.VALID_CATEGORIES)}")
        
        # Validate payment method
        if self.payment_method not in self.VALID_PAYMENT_METHODS:
            raise ValueError(f"Invalid payment method. Must be one of: {', '.join(self.VALID_PAYMENT_METHODS)}")
        
        # Validate amount
        if self.amount <= 0:
            raise ValueError("Amount must be greater than 0")
    
    def to_dict(self):
        """Convert expense object to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'amount': float(self.amount),
            'category': self.category,
            'description': self.description,
            'date': self.date.isoformat() if self.date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'receipt_url': self.receipt_url,
            'notes': self.notes,
            'tags': self.tags.split(',') if self.tags else [],
            'location': self.location,
            'payment_method': self.payment_method
        }
    
    def update(self, **kwargs):
        """Update expense with provided fields"""
        allowed_fields = [
            'amount', 'category', 'description', 'date', 
            'receipt_url', 'notes', 'tags', 'location', 'payment_method'
        ]
        
        for field, value in kwargs.items():
            if field in allowed_fields and hasattr(self, field):
                if field == 'amount':
                    value = float(value)
                    if value <= 0:
                        raise ValueError("Amount must be greater than 0")
                elif field == 'category':
                    value = value.lower()
                    if value not in self.VALID_CATEGORIES:
                        raise ValueError(f"Invalid category. Must be one of: {', '.join(self.VALID_CATEGORIES)}")
                elif field == 'payment_method':
                    if value not in self.VALID_PAYMENT_METHODS:
                        raise ValueError(f"Invalid payment method. Must be one of: {', '.join(self.VALID_PAYMENT_METHODS)}")
                
                setattr(self, field, value)
        
        self.updated_at = datetime.utcnow()
    
    @classmethod
    def get_category_display_name(cls, category):
        """Get display name for category"""
        category_names = {
            'food': '🍕 Food & Dining',
            'transport': '🚗 Transportation',
            'entertainment': '🎬 Entertainment',
            'shopping': '🛒 Shopping',
            'bills': '📄 Bills & Utilities',
            'healthcare': '🏥 Healthcare',
            'education': '📚 Education',
            'other': '🔧 Other'
        }
        return category_names.get(category, category.title())
    
    @classmethod
    def get_expenses_by_user(cls, user_id, start_date=None, end_date=None, category=None, limit=None):
        """Get expenses for a specific user with optional filters"""
        query = cls.query.filter_by(user_id=user_id)
        
        if start_date:
            query = query.filter(cls.date >= start_date)
        if end_date:
            query = query.filter(cls.date <= end_date)
        if category:
            query = query.filter_by(category=category.lower())
        
        query = query.order_by(cls.date.desc(), cls.created_at.desc())
        
        if limit:
            query = query.limit(limit)
        
        return query.all()
    
    @classmethod
    def get_monthly_totals(cls, user_id, months=6):
        """Get monthly spending totals for the last N months"""
        from sqlalchemy import func, extract
        from datetime import datetime, timedelta
        
        # Calculate start date (N months ago)
        start_date = datetime.utcnow().replace(day=1) - timedelta(days=30 * (months - 1))
        
        # Query to get monthly totals
        monthly_data = db.session.query(
            extract('year', cls.date).label('year'),
            extract('month', cls.date).label('month'),
            func.sum(cls.amount).label('total')
        ).filter(
            cls.user_id == user_id,
            cls.date >= start_date.date()
        ).group_by(
            extract('year', cls.date),
            extract('month', cls.date)
        ).order_by(
            extract('year', cls.date),
            extract('month', cls.date)
        ).all()
        
        return monthly_data
    
    @classmethod
    def get_category_totals(cls, user_id, start_date=None, end_date=None):
        """Get spending totals by category"""
        from sqlalchemy import func
        
        query = db.session.query(
            cls.category,
            func.sum(cls.amount).label('total'),
            func.count(cls.id).label('count')
        ).filter_by(user_id=user_id)
        
        if start_date:
            query = query.filter(cls.date >= start_date)
        if end_date:
            query = query.filter(cls.date <= end_date)
        
        return query.group_by(cls.category).order_by(func.sum(cls.amount).desc()).all()
    
    @classmethod
    def get_spending_trends(cls, user_id, days=30):
        """Get daily spending trends for the last N days"""
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        start_date = datetime.utcnow().date() - timedelta(days=days)
        
        daily_data = db.session.query(
            cls.date,
            func.sum(cls.amount).label('total'),
            func.count(cls.id).label('count')
        ).filter(
            cls.user_id == user_id,
            cls.date >= start_date
        ).group_by(cls.date).order_by(cls.date).all()
        
        return daily_data
    
    def __repr__(self):
        return f'<Expense {self.id}: {self.amount} - {self.category}>'
