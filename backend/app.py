from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_mail import Mail
from flask_socketio import SocketIO
from config import Config
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
mail = Mail()
socketio = SocketIO()
cors = CORS()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions with app
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")
    
    # JWT token blacklist callback
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        from routes.auth_simple import blacklisted_tokens
        return jwt_payload['jti'] in blacklisted_tokens
    cors.init_app(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000", "http://127.0.0.1:5500", "file:///*"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Import models inside app context to avoid circular imports
    with app.app_context():
        from models.user import User
        from models.expense import Expense
        from models.budget import Budget
        from models.notification import Notification
    
    # Register blueprints
    from routes.auth_simple import auth_bp
    from routes.expenses import expenses_bp
    from routes.analytics import analytics_bp
    from routes.insights import insights_bp
    from routes.notifications import notifications_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(expenses_bp, url_prefix='/api/expenses')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(insights_bp, url_prefix='/api/insights')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    
    # Add health check endpoint
    @app.route('/api/health')
    def health_check():
        return {'status': 'healthy', 'message': 'Personal Finance API is running'}, 200
    
    @app.route('/')
    def index():
        return {'message': 'Personal Finance API', 'version': '1.0.0'}, 200
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app

if __name__ == '__main__':
    app = create_app()
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
