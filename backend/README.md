# Personal Finance Dashboard Backend

A comprehensive Flask-based backend API for the Personal Finance Dashboard, providing user authentication, expense management, advanced analytics, and real-time notifications.

## 🚀 Features

### 🔐 Authentication & User Management
- User registration and login with JWT tokens
- Password hashing with bcrypt
- User profile management
- Session management with refresh tokens

### 💳 Expense Management
- CRUD operations for expenses
- Category-based expense organization
- Receipt upload and processing
- Bulk import/export functionality

### 📊 Advanced Analytics
- Spending pattern analysis
- Budget recommendations
- Advanced forecasting with ML models
- Year-over-year comparisons
- Category insights

### 🔔 Notification System
- Real-time WebSocket notifications
- Email notifications for budget alerts
- Spending warnings and insights
- Customizable notification preferences

### 🛡️ Security Features
- JWT token authentication
- Password strength validation
- Rate limiting
- Input validation and sanitization
- CORS protection

## 🛠️ Setup Instructions

### Prerequisites
- Python 3.8+
- MySQL 8.0+
- Redis (for caching and WebSocket support)
- pip (Python package manager)

### Installation

1. **Clone and Navigate**
   ```bash
   cd backend
   ```

2. **Create Virtual Environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Database Setup**
   ```bash
   # Create MySQL database
   mysql -u root -p
   CREATE DATABASE finance_tracker;
   EXIT;
   ```

5. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env file with your database credentials
   ```

6. **Initialize Database**
   ```bash
   flask db init
   flask db migrate -m "Initial migration"
   flask db upgrade
   ```

7. **Run the Application**
   ```bash
   python app.py
   ```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/settings` - Update user settings

### Expense Management
- `GET /api/expenses` - Get user expenses
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/{id}` - Update expense
- `DELETE /api/expenses/{id}` - Delete expense

### Analytics & Insights
- `GET /api/analytics/spending-trends` - Monthly spending trends
- `GET /api/analytics/category-insights` - Category breakdown
- `GET /api/analytics/monthly-reports` - Monthly reports
- `GET /api/analytics/year-over-year` - YoY comparisons
- `GET /api/analytics/budget-vs-actual` - Budget performance

### Advanced Insights
- `GET /api/insights/spending-patterns` - AI-powered spending patterns
- `GET /api/insights/budget-recommendations` - Personalized budget suggestions
- `GET /api/forecasting/advanced-predictions` - ML-based predictions

### Notifications
- `POST /api/notifications/budget-alerts` - Create budget alerts
- `GET /api/notifications/spending-warnings` - Get spending warnings
- `WebSocket /notifications` - Real-time notifications

## 🗄️ Database Schema

### Users Table
- `id` - Primary key
- `email` - Unique email address
- `password_hash` - Hashed password
- `first_name` - User's first name
- `last_name` - User's last name
- `currency` - Preferred currency
- `created_at` - Account creation timestamp
- `email_notifications` - Email notification preference

### Expenses Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `amount` - Expense amount
- `category` - Expense category
- `description` - Expense description
- `date` - Expense date
- `created_at` - Record creation timestamp

### Budgets Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `category` - Budget category
- `amount` - Budget limit
- `period` - Budget period (monthly/yearly)
- `start_date` - Budget start date
- `end_date` - Budget end date

### Notifications Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `type` - Notification type
- `message` - Notification message
- `read` - Read status
- `created_at` - Notification timestamp

## 🤖 Machine Learning Features

### Spending Pattern Analysis
- Seasonal spending detection
- Unusual expense identification
- Category trend analysis

### Advanced Forecasting
- Time series analysis with ARIMA models
- Linear regression for trend prediction
- Ensemble methods for improved accuracy

### Budget Recommendations
- Historical spending analysis
- Income-based budget suggestions
- Goal-based planning

## 🔄 Real-time Features

### WebSocket Integration
- Live expense updates
- Real-time notifications
- Budget alert system
- Multi-device synchronization

### Background Tasks
- Daily spending summaries
- Weekly budget reports
- Monthly analytics updates
- Automated insights generation

## 🛡️ Security Implementation

### Authentication Security
- JWT tokens with expiration
- Refresh token rotation
- Password strength validation
- Rate limiting on auth endpoints

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration

### Privacy Features
- Data encryption at rest
- Secure password storage
- User data anonymization options
- GDPR compliance features

## 📊 Monitoring & Analytics

### Performance Monitoring
- API response time tracking
- Database query optimization
- Error logging and tracking
- User activity analytics

### Business Intelligence
- User engagement metrics
- Feature usage statistics
- Performance benchmarks
- Cost analysis tools

## 🚀 Deployment

### Production Setup
```bash
# Install production dependencies
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Docker Deployment
```dockerfile
FROM python:3.9-slim
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

### Environment Variables
Set production environment variables:
- `FLASK_ENV=production`
- `DATABASE_URL` - Production database URL
- `REDIS_URL` - Production Redis URL
- `SECRET_KEY` - Strong secret key
- `JWT_SECRET_KEY` - Strong JWT secret

## 🧪 Testing

### Run Tests
```bash
python -m pytest tests/ -v
```

### Test Coverage
```bash
python -m pytest --cov=app tests/
```

## 📚 API Documentation

The API documentation is automatically generated and available at:
- Development: `http://localhost:5000/api/docs`
- Swagger UI with interactive testing
- Complete endpoint documentation
- Request/response examples

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
