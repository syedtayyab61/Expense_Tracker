from app import db
from datetime import datetime
from sqlalchemy import Index

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    type = db.Column(db.String(50), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    data = db.Column(db.JSON)  # Additional data as JSON
    is_read = db.Column(db.Boolean, default=False, index=True)
    is_sent = db.Column(db.Boolean, default=False)  # For email notifications
    priority = db.Column(db.String(20), default='medium')  # low, medium, high, urgent
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    read_at = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime)  # Optional expiration date
    
    # Indexes for better query performance
    __table_args__ = (
        Index('idx_user_unread', 'user_id', 'is_read'),
        Index('idx_user_type', 'user_id', 'type'),
        Index('idx_user_created', 'user_id', 'created_at'),
    )
    
    # Notification types
    NOTIFICATION_TYPES = {
        'budget_alert': 'Budget Alert',
        'budget_exceeded': 'Budget Exceeded',
        'spending_warning': 'Spending Warning',
        'monthly_report': 'Monthly Report',
        'unusual_spending': 'Unusual Spending Pattern',
        'goal_achieved': 'Goal Achieved',
        'bill_reminder': 'Bill Reminder',
        'system_update': 'System Update',
        'welcome': 'Welcome Message',
        'security_alert': 'Security Alert'
    }
    
    # Priority levels
    PRIORITY_LEVELS = ['low', 'medium', 'high', 'urgent']
    
    def __init__(self, user_id, notification_type, title, message, **kwargs):
        self.user_id = user_id
        self.type = notification_type
        self.title = title
        self.message = message
        
        # Validate notification type
        if notification_type not in self.NOTIFICATION_TYPES:
            raise ValueError(f"Invalid notification type. Must be one of: {', '.join(self.NOTIFICATION_TYPES.keys())}")
        
        # Optional fields
        self.data = kwargs.get('data', {})
        self.priority = kwargs.get('priority', 'medium')
        self.expires_at = kwargs.get('expires_at')
        
        # Validate priority
        if self.priority not in self.PRIORITY_LEVELS:
            raise ValueError(f"Invalid priority. Must be one of: {', '.join(self.PRIORITY_LEVELS)}")
    
    def to_dict(self):
        """Convert notification object to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'type_display': self.NOTIFICATION_TYPES.get(self.type, self.type),
            'title': self.title,
            'message': self.message,
            'data': self.data,
            'is_read': self.is_read,
            'is_sent': self.is_sent,
            'priority': self.priority,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_expired': self.is_expired(),
            'time_ago': self.get_time_ago()
        }
    
    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.utcnow()
            db.session.commit()
    
    def mark_as_sent(self):
        """Mark notification as sent (for email notifications)"""
        self.is_sent = True
        db.session.commit()
    
    def is_expired(self):
        """Check if notification has expired"""
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return False
    
    def get_time_ago(self):
        """Get human-readable time ago string"""
        if not self.created_at:
            return "Unknown"
        
        now = datetime.utcnow()
        diff = now - self.created_at
        
        if diff.days > 0:
            if diff.days == 1:
                return "1 day ago"
            elif diff.days < 7:
                return f"{diff.days} days ago"
            elif diff.days < 30:
                weeks = diff.days // 7
                return f"{weeks} week{'s' if weeks > 1 else ''} ago"
            elif diff.days < 365:
                months = diff.days // 30
                return f"{months} month{'s' if months > 1 else ''} ago"
            else:
                years = diff.days // 365
                return f"{years} year{'s' if years > 1 else ''} ago"
        
        hours = diff.seconds // 3600
        if hours > 0:
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        
        minutes = diff.seconds // 60
        if minutes > 0:
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        
        return "Just now"
    
    def get_icon(self):
        """Get icon for notification type"""
        icons = {
            'budget_alert': '⚠️',
            'budget_exceeded': '🚨',
            'spending_warning': '💸',
            'monthly_report': '📊',
            'unusual_spending': '🔍',
            'goal_achieved': '🎉',
            'bill_reminder': '📄',
            'system_update': '🔄',
            'welcome': '👋',
            'security_alert': '🔒'
        }
        return icons.get(self.type, '📢')
    
    @classmethod
    def create_budget_alert(cls, user_id, budget, percentage_used):
        """Create a budget alert notification"""
        title = f"Budget Alert: {budget.get_category_display_name()}"
        message = f"You've used {percentage_used:.1f}% of your {budget.period} budget for {budget.get_category_display_name()}. Budget: ${budget.amount:.2f}, Spent: ${budget.get_spent_amount():.2f}"
        
        data = {
            'budget_id': budget.id,
            'category': budget.category,
            'percentage_used': percentage_used,
            'amount_spent': budget.get_spent_amount(),
            'budget_amount': float(budget.amount)
        }
        
        return cls(
            user_id=user_id,
            notification_type='budget_alert',
            title=title,
            message=message,
            data=data,
            priority='medium'
        )
    
    @classmethod
    def create_budget_exceeded(cls, user_id, budget):
        """Create a budget exceeded notification"""
        title = f"Budget Exceeded: {budget.get_category_display_name()}"
        over_amount = budget.get_spent_amount() - float(budget.amount)
        message = f"You've exceeded your {budget.period} budget for {budget.get_category_display_name()} by ${over_amount:.2f}. Consider reviewing your spending."
        
        data = {
            'budget_id': budget.id,
            'category': budget.category,
            'over_amount': over_amount,
            'amount_spent': budget.get_spent_amount(),
            'budget_amount': float(budget.amount)
        }
        
        return cls(
            user_id=user_id,
            notification_type='budget_exceeded',
            title=title,
            message=message,
            data=data,
            priority='high'
        )
    
    @classmethod
    def create_spending_warning(cls, user_id, category, current_spending, predicted_spending):
        """Create a spending warning notification"""
        title = f"Spending Warning: {category.title()}"
        message = f"Your {category} spending is trending high. Current: ${current_spending:.2f}, Predicted monthly: ${predicted_spending:.2f}"
        
        data = {
            'category': category,
            'current_spending': current_spending,
            'predicted_spending': predicted_spending
        }
        
        return cls(
            user_id=user_id,
            notification_type='spending_warning',
            title=title,
            message=message,
            data=data,
            priority='medium'
        )
    
    @classmethod
    def create_monthly_report(cls, user_id, month, year, total_spent, top_category):
        """Create a monthly report notification"""
        title = f"Monthly Report: {month} {year}"
        message = f"Your spending summary for {month}: Total spent ${total_spent:.2f}. Top category: {top_category}"
        
        data = {
            'month': month,
            'year': year,
            'total_spent': total_spent,
            'top_category': top_category
        }
        
        return cls(
            user_id=user_id,
            notification_type='monthly_report',
            title=title,
            message=message,
            data=data,
            priority='low'
        )
    
    @classmethod
    def create_welcome_notification(cls, user_id, first_name):
        """Create a welcome notification for new users"""
        title = f"Welcome to FinanceTracker, {first_name}!"
        message = "Start by adding your first expense and setting up budgets to track your spending effectively."
        
        data = {
            'is_welcome': True,
            'tips': [
                "Add expenses regularly for accurate tracking",
                "Set up budgets for better financial control",
                "Check your analytics for spending insights"
            ]
        }
        
        return cls(
            user_id=user_id,
            notification_type='welcome',
            title=title,
            message=message,
            data=data,
            priority='low'
        )
    
    @classmethod
    def get_unread_notifications(cls, user_id, limit=None):
        """Get unread notifications for a user"""
        query = cls.query.filter(
            cls.user_id == user_id,
            cls.is_read == False
        ).order_by(cls.created_at.desc())
        
        if limit:
            query = query.limit(limit)
        
        return query.all()
    
    @classmethod
    def get_notifications(cls, user_id, notification_type=None, limit=50, offset=0):
        """Get notifications for a user with optional filtering"""
        query = cls.query.filter_by(user_id=user_id)
        
        if notification_type:
            query = query.filter_by(type=notification_type)
        
        query = query.order_by(cls.created_at.desc())
        
        if limit:
            query = query.limit(limit)
        if offset:
            query = query.offset(offset)
        
        return query.all()
    
    @classmethod
    def mark_all_as_read(cls, user_id):
        """Mark all notifications as read for a user"""
        notifications = cls.query.filter(
            cls.user_id == user_id,
            cls.is_read == False
        ).all()
        
        for notification in notifications:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
        
        db.session.commit()
        return len(notifications)
    
    @classmethod
    def cleanup_expired_notifications(cls):
        """Remove expired notifications"""
        expired = cls.query.filter(
            cls.expires_at.isnot(None),
            cls.expires_at < datetime.utcnow()
        ).all()
        
        for notification in expired:
            db.session.delete(notification)
        
        db.session.commit()
        return len(expired)
    
    def __repr__(self):
        return f'<Notification {self.id}: {self.type} - {self.title}>'
