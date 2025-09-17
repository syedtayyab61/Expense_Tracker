from app import db
from datetime import datetime, date
from sqlalchemy import Index, Numeric

class Budget(db.Model):
    __tablename__ = 'budgets'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    category = db.Column(db.String(50), nullable=False, index=True)
    amount = db.Column(Numeric(10, 2), nullable=False)
    period = db.Column(db.String(20), nullable=False, default='monthly')  # monthly, yearly, weekly
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    alert_threshold = db.Column(db.Integer, default=80)  # Alert when 80% of budget is used
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes for better query performance
    __table_args__ = (
        Index('idx_user_category_period', 'user_id', 'category', 'period'),
        Index('idx_user_active_dates', 'user_id', 'is_active', 'start_date', 'end_date'),
    )
    
    # Valid periods
    VALID_PERIODS = ['weekly', 'monthly', 'yearly', 'custom']
    
    # Valid categories (should match Expense categories)
    VALID_CATEGORIES = [
        'food', 'transport', 'entertainment', 'shopping', 
        'bills', 'healthcare', 'education', 'other', 'total'
    ]
    
    def __init__(self, user_id, category, amount, period='monthly', start_date=None, end_date=None, **kwargs):
        self.user_id = user_id
        self.category = category.lower()
        self.amount = float(amount)
        self.period = period.lower()
        
        # Validate inputs
        if self.category not in self.VALID_CATEGORIES:
            raise ValueError(f"Invalid category. Must be one of: {', '.join(self.VALID_CATEGORIES)}")
        
        if self.period not in self.VALID_PERIODS:
            raise ValueError(f"Invalid period. Must be one of: {', '.join(self.VALID_PERIODS)}")
        
        if self.amount <= 0:
            raise ValueError("Budget amount must be greater than 0")
        
        # Set dates based on period
        if start_date and end_date:
            self.start_date = start_date
            self.end_date = end_date
        else:
            self._set_default_dates()
        
        # Optional fields
        self.alert_threshold = kwargs.get('alert_threshold', 80)
        self.is_active = kwargs.get('is_active', True)
    
    def _set_default_dates(self):
        """Set default start and end dates based on period"""
        today = date.today()
        
        if self.period == 'monthly':
            # Current month
            self.start_date = today.replace(day=1)
            if today.month == 12:
                self.end_date = date(today.year + 1, 1, 1) - timedelta(days=1)
            else:
                self.end_date = date(today.year, today.month + 1, 1) - timedelta(days=1)
        
        elif self.period == 'yearly':
            # Current year
            self.start_date = today.replace(month=1, day=1)
            self.end_date = today.replace(month=12, day=31)
        
        elif self.period == 'weekly':
            # Current week (Monday to Sunday)
            days_since_monday = today.weekday()
            self.start_date = today - timedelta(days=days_since_monday)
            self.end_date = self.start_date + timedelta(days=6)
        
        else:  # custom
            # Default to current month for custom periods
            self.start_date = today.replace(day=1)
            if today.month == 12:
                self.end_date = date(today.year + 1, 1, 1) - timedelta(days=1)
            else:
                self.end_date = date(today.year, today.month + 1, 1) - timedelta(days=1)
    
    def to_dict(self):
        """Convert budget object to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'category': self.category,
            'category_display': self.get_category_display_name(),
            'amount': float(self.amount),
            'period': self.period,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'is_active': self.is_active,
            'alert_threshold': self.alert_threshold,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'spent': self.get_spent_amount(),
            'remaining': self.get_remaining_amount(),
            'percentage_used': self.get_percentage_used(),
            'days_remaining': self.get_days_remaining(),
            'is_over_budget': self.is_over_budget(),
            'should_alert': self.should_send_alert()
        }
    
    def get_category_display_name(self):
        """Get display name for category"""
        from models.expense import Expense
        if self.category == 'total':
            return '💰 Total Budget'
        return Expense.get_category_display_name(self.category)
    
    def get_spent_amount(self):
        """Get total amount spent in this budget period"""
        from models.expense import Expense
        
        if self.category == 'total':
            # Total spending across all categories
            expenses = Expense.query.filter(
                Expense.user_id == self.user_id,
                Expense.date >= self.start_date,
                Expense.date <= self.end_date
            ).all()
        else:
            # Spending for specific category
            expenses = Expense.query.filter(
                Expense.user_id == self.user_id,
                Expense.category == self.category,
                Expense.date >= self.start_date,
                Expense.date <= self.end_date
            ).all()
        
        return sum(float(expense.amount) for expense in expenses)
    
    def get_remaining_amount(self):
        """Get remaining budget amount"""
        return float(self.amount) - self.get_spent_amount()
    
    def get_percentage_used(self):
        """Get percentage of budget used"""
        spent = self.get_spent_amount()
        if float(self.amount) == 0:
            return 0
        return (spent / float(self.amount)) * 100
    
    def get_days_remaining(self):
        """Get number of days remaining in budget period"""
        today = date.today()
        if today > self.end_date:
            return 0
        return (self.end_date - today).days + 1
    
    def is_over_budget(self):
        """Check if budget is exceeded"""
        return self.get_spent_amount() > float(self.amount)
    
    def should_send_alert(self):
        """Check if alert should be sent based on threshold"""
        percentage_used = self.get_percentage_used()
        return percentage_used >= self.alert_threshold
    
    def get_daily_budget_remaining(self):
        """Get suggested daily budget for remaining days"""
        remaining_amount = self.get_remaining_amount()
        days_remaining = self.get_days_remaining()
        
        if days_remaining <= 0:
            return 0
        
        return remaining_amount / days_remaining
    
    def update(self, **kwargs):
        """Update budget with provided fields"""
        allowed_fields = [
            'category', 'amount', 'period', 'start_date', 
            'end_date', 'is_active', 'alert_threshold'
        ]
        
        for field, value in kwargs.items():
            if field in allowed_fields and hasattr(self, field):
                if field == 'amount':
                    value = float(value)
                    if value <= 0:
                        raise ValueError("Budget amount must be greater than 0")
                elif field == 'category':
                    value = value.lower()
                    if value not in self.VALID_CATEGORIES:
                        raise ValueError(f"Invalid category. Must be one of: {', '.join(self.VALID_CATEGORIES)}")
                elif field == 'period':
                    value = value.lower()
                    if value not in self.VALID_PERIODS:
                        raise ValueError(f"Invalid period. Must be one of: {', '.join(self.VALID_PERIODS)}")
                elif field == 'alert_threshold':
                    value = int(value)
                    if not 0 <= value <= 100:
                        raise ValueError("Alert threshold must be between 0 and 100")
                
                setattr(self, field, value)
        
        self.updated_at = datetime.utcnow()
    
    @classmethod
    def get_active_budgets(cls, user_id, category=None):
        """Get active budgets for a user"""
        query = cls.query.filter(
            cls.user_id == user_id,
            cls.is_active == True,
            cls.start_date <= date.today(),
            cls.end_date >= date.today()
        )
        
        if category:
            query = query.filter_by(category=category.lower())
        
        return query.all()
    
    @classmethod
    def get_budgets_needing_alerts(cls, user_id):
        """Get budgets that need alerts"""
        active_budgets = cls.get_active_budgets(user_id)
        return [budget for budget in active_budgets if budget.should_send_alert()]
    
    @classmethod
    def get_budget_performance(cls, user_id, months=6):
        """Get budget performance over time"""
        from sqlalchemy import and_
        from datetime import datetime, timedelta
        
        # Get budgets from the last N months
        start_date = datetime.utcnow().date() - timedelta(days=30 * months)
        
        budgets = cls.query.filter(
            cls.user_id == user_id,
            cls.end_date >= start_date
        ).order_by(cls.start_date.desc()).all()
        
        performance_data = []
        for budget in budgets:
            performance_data.append({
                'budget': budget.to_dict(),
                'performance_score': min(100, (1 - budget.get_percentage_used() / 100) * 100) if not budget.is_over_budget() else 0
            })
        
        return performance_data
    
    def __repr__(self):
        return f'<Budget {self.id}: {self.category} - {self.amount} ({self.period})>'

# Import to avoid circular imports
from datetime import timedelta
