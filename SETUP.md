# Setup Guide - Personal Finance Dashboard

## Quick Start Instructions

### 1. Backend Setup (Flask API)

#### Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Setup MySQL Database
```sql
CREATE DATABASE finance_dashboard;
CREATE USER 'finance_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON finance_dashboard.* TO 'finance_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Configure Environment Variables
Create `backend/.env`:
```bash
DATABASE_URL=mysql+pymysql://finance_user:your_password@localhost/finance_dashboard
JWT_SECRET_KEY=your-super-secret-jwt-key-here-make-it-long-and-random
FLASK_ENV=development
FLASK_DEBUG=True
REDIS_URL=redis://localhost:6379/0
```

#### Initialize Database Tables
```bash
cd backend
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"
```

#### Start the Backend Server
```bash
python app.py
```
Backend will run at: `http://localhost:5000`

### 2. Frontend Setup

#### Serve the Frontend Files
Choose one of these options:

**Option A - Python HTTP Server:**
```bash
# In the root directory where index.html is located
python -m http.server 8000
```

**Option B - Node.js HTTP Server:**
```bash
npm install -g http-server
http-server -p 8000 -c-1
```

**Option C - VS Code Live Server:**
- Install "Live Server" extension in VS Code
- Right-click `index.html` → "Open with Live Server"

#### Access the Application
Open your browser and go to: `http://localhost:8000`

### 3. Test the Application

1. **Register a new user** - You'll be redirected to login page initially
2. **Login with your credentials** - Dashboard will load with real-time notifications
3. **Add some expenses** - Test the expense tracking functionality
4. **Create budgets** - Set up budgets to receive alerts
5. **View analytics** - Check the AI-powered insights and reports

### 4. API Testing (Optional)

Test the API endpoints using curl or Postman:

```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Create expense (replace YOUR_JWT_TOKEN with actual token from login)
curl -X POST http://localhost:5000/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"amount":25.50,"description":"Coffee","category":"food","date":"2024-01-15"}'
```

## Troubleshooting

### Backend Issues
- **Database connection error**: Check MySQL server and credentials
- **Module not found**: Run `pip install -r requirements.txt`
- **Port in use**: Change port in `app.py` or stop the conflicting process

### Frontend Issues
- **API connection error**: Ensure backend is running on port 5000
- **Login redirect loops**: Clear browser localStorage and cookies
- **WebSocket not connecting**: Check if Flask-SocketIO is properly installed

### Common Solutions
1. **Check all services are running**: MySQL, Redis (optional), Flask backend
2. **Verify environment variables** are set correctly
3. **Clear browser cache** if experiencing frontend issues
4. **Check firewall settings** for local development ports

## Features Available

✅ **Completed Features:**
- User authentication (register/login)
- Expense CRUD operations
- Budget management with alerts
- Real-time notifications via WebSocket
- Advanced analytics and reporting
- AI-powered spending insights and forecasting
- Responsive frontend with modern UI

🔄 **Ready to Use:**
- All API endpoints functional
- Database models with relationships
- Frontend integration with backend
- Notification system with toast messages
- WebSocket real-time updates

Your Personal Finance Dashboard is now ready for use! The application combines a modern frontend with a comprehensive backend API featuring ML-powered insights and real-time notifications.
