from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models.expense import Expense
from models.budget import Budget
from models.user import User
from datetime import datetime, timedelta, date
from sqlalchemy import func, extract
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
import pandas as pd
import calendar

insights_bp = Blueprint('insights', __name__)

@insights_bp.route('/spending-patterns', methods=['GET'])
@jwt_required()
def get_spending_patterns():
    """Get AI-powered spending pattern analysis"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get expenses for analysis (last 12 months)
        start_date = datetime.utcnow().date() - timedelta(days=365)
        expenses = Expense.get_expenses_by_user(
            current_user_id,
            start_date=start_date
        )
        
        if len(expenses) < 10:
            return jsonify({
                'message': 'Insufficient data for pattern analysis',
                'patterns': [],
                'recommendations': ['Add more expenses to get meaningful insights']
            }), 200
        
        # Convert to DataFrame for analysis
        df = pd.DataFrame([{
            'amount': float(expense.amount),
            'category': expense.category,
            'date': expense.date,
            'day_of_week': expense.date.weekday(),
            'day_of_month': expense.date.day,
            'month': expense.date.month
        } for expense in expenses])
        
        patterns = []
        
        # 1. Day of week patterns
        dow_spending = df.groupby('day_of_week')['amount'].agg(['sum', 'mean', 'count']).reset_index()
        dow_spending['day_name'] = dow_spending['day_of_week'].apply(
            lambda x: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][x]
        )
        
        highest_spending_day = dow_spending.loc[dow_spending['sum'].idxmax()]
        lowest_spending_day = dow_spending.loc[dow_spending['sum'].idxmin()]
        
        patterns.append({
            'type': 'day_of_week',
            'title': 'Weekly Spending Pattern',
            'description': f"You spend most on {highest_spending_day['day_name']}s (${highest_spending_day['sum']:.2f} total) and least on {lowest_spending_day['day_name']}s (${lowest_spending_day['sum']:.2f} total)",
            'data': dow_spending.to_dict('records')
        })
        
        # 2. Monthly patterns
        monthly_spending = df.groupby('month')['amount'].agg(['sum', 'mean', 'count']).reset_index()
        monthly_spending['month_name'] = monthly_spending['month'].apply(lambda x: calendar.month_name[x])
        
        highest_spending_month = monthly_spending.loc[monthly_spending['sum'].idxmax()]
        
        patterns.append({
            'type': 'monthly',
            'title': 'Monthly Spending Pattern',
            'description': f"Your highest spending month is typically {highest_spending_month['month_name']} (${highest_spending_month['sum']:.2f})",
            'data': monthly_spending.to_dict('records')
        })
        
        # 3. Category patterns over time
        category_trends = []
        for category in df['category'].unique():
            category_data = df[df['category'] == category]
            monthly_category = category_data.groupby(category_data['date'].dt.to_period('M'))['amount'].sum()
            
            if len(monthly_category) >= 3:
                # Calculate trend
                X = np.array(range(len(monthly_category))).reshape(-1, 1)
                y = monthly_category.values
                
                reg = LinearRegression()
                reg.fit(X, y)
                trend_slope = reg.coef_[0]
                
                category_trends.append({
                    'category': category,
                    'display_name': Expense.get_category_display_name(category),
                    'trend_slope': float(trend_slope),
                    'trend_direction': 'increasing' if trend_slope > 0 else 'decreasing' if trend_slope < 0 else 'stable',
                    'monthly_average': float(monthly_category.mean())
                })
        
        patterns.append({
            'type': 'category_trends',
            'title': 'Category Spending Trends',
            'description': 'How your spending in different categories is changing over time',
            'data': category_trends
        })
        
        # 4. Unusual spending detection
        overall_mean = df['amount'].mean()
        overall_std = df['amount'].std()
        threshold = overall_mean + (2 * overall_std)  # 2 standard deviations
        
        unusual_expenses = df[df['amount'] > threshold]
        
        patterns.append({
            'type': 'unusual_spending',
            'title': 'Unusual Spending Detection',
            'description': f"Detected {len(unusual_expenses)} unusual expenses (above ${threshold:.2f})",
            'data': {
                'threshold': float(threshold),
                'count': len(unusual_expenses),
                'total_unusual': float(unusual_expenses['amount'].sum()),
                'categories': unusual_expenses['category'].value_counts().to_dict()
            }
        })
        
        # 5. Spending velocity (rate of spending)
        df_sorted = df.sort_values('date')
        df_sorted['cumulative'] = df_sorted['amount'].cumsum()
        df_sorted['days_since_start'] = (df_sorted['date'] - df_sorted['date'].min()).dt.days + 1
        df_sorted['velocity'] = df_sorted['cumulative'] / df_sorted['days_since_start']
        
        current_velocity = df_sorted['velocity'].iloc[-1] if len(df_sorted) > 0 else 0
        
        patterns.append({
            'type': 'spending_velocity',
            'title': 'Spending Velocity',
            'description': f"Your current spending rate is ${current_velocity:.2f} per day",
            'data': {
                'current_velocity': float(current_velocity),
                'velocity_trend': df_sorted[['date', 'velocity']].tail(30).to_dict('records')
            }
        })
        
        # Generate recommendations
        recommendations = generate_spending_recommendations(df, patterns)
        
        return jsonify({
            'patterns': patterns,
            'recommendations': recommendations,
            'analysis_period': {
                'start_date': start_date.isoformat(),
                'end_date': datetime.utcnow().date().isoformat(),
                'total_expenses': len(expenses),
                'total_amount': float(df['amount'].sum())
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to analyze spending patterns',
            'error': str(e)
        }), 500

@insights_bp.route('/budget-recommendations', methods=['GET'])
@jwt_required()
def get_budget_recommendations():
    """Get personalized budget recommendations"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get historical spending data (last 6 months)
        start_date = datetime.utcnow().date() - timedelta(days=180)
        expenses = Expense.get_expenses_by_user(
            current_user_id,
            start_date=start_date
        )
        
        if len(expenses) < 5:
            return jsonify({
                'message': 'Insufficient data for budget recommendations',
                'recommendations': [],
                'suggested_budgets': []
            }), 200
        
        # Analyze spending by category
        category_analysis = {}
        total_spending = 0
        
        for expense in expenses:
            category = expense.category
            amount = float(expense.amount)
            total_spending += amount
            
            if category not in category_analysis:
                category_analysis[category] = {
                    'amounts': [],
                    'total': 0,
                    'count': 0
                }
            
            category_analysis[category]['amounts'].append(amount)
            category_analysis[category]['total'] += amount
            category_analysis[category]['count'] += 1
        
        # Calculate statistics for each category
        category_stats = {}
        for category, data in category_analysis.items():
            amounts = np.array(data['amounts'])
            category_stats[category] = {
                'mean': float(np.mean(amounts)),
                'median': float(np.median(amounts)),
                'std': float(np.std(amounts)),
                'total': data['total'],
                'count': data['count'],
                'percentage_of_total': (data['total'] / total_spending) * 100,
                'monthly_average': data['total'] / 6  # 6 months of data
            }
        
        # Get current budgets
        current_budgets = Budget.get_active_budgets(current_user_id)
        current_budget_dict = {budget.category: budget for budget in current_budgets}
        
        # Generate recommendations
        recommendations = []
        suggested_budgets = []
        
        for category, stats in category_stats.items():
            monthly_avg = stats['monthly_average']
            
            # Add buffer based on variability
            variability_buffer = stats['std'] / stats['mean'] if stats['mean'] > 0 else 0
            buffer_factor = min(0.3, max(0.1, variability_buffer))  # 10-30% buffer
            
            suggested_amount = monthly_avg * (1 + buffer_factor)
            
            # Round to nearest 10
            suggested_amount = round(suggested_amount / 10) * 10
            
            suggested_budgets.append({
                'category': category,
                'display_name': Expense.get_category_display_name(category),
                'suggested_amount': suggested_amount,
                'historical_average': monthly_avg,
                'buffer_percentage': round(buffer_factor * 100, 1),
                'confidence': 'high' if stats['count'] > 10 else 'medium' if stats['count'] > 5 else 'low'
            })
            
            # Check if current budget exists and compare
            if category in current_budget_dict:
                current_budget = current_budget_dict[category]
                current_amount = float(current_budget.amount)
                
                if current_amount < monthly_avg * 0.8:
                    recommendations.append({
                        'type': 'increase_budget',
                        'category': category,
                        'message': f"Consider increasing your {Expense.get_category_display_name(category)} budget from ${current_amount:.2f} to ${suggested_amount:.2f}",
                        'current_amount': current_amount,
                        'suggested_amount': suggested_amount,
                        'reason': 'Your current budget is below historical spending'
                    })
                elif current_amount > monthly_avg * 1.5:
                    recommendations.append({
                        'type': 'decrease_budget',
                        'category': category,
                        'message': f"You could reduce your {Expense.get_category_display_name(category)} budget from ${current_amount:.2f} to ${suggested_amount:.2f}",
                        'current_amount': current_amount,
                        'suggested_amount': suggested_amount,
                        'reason': 'Your current budget is significantly above historical spending'
                    })
            else:
                recommendations.append({
                    'type': 'create_budget',
                    'category': category,
                    'message': f"Create a budget for {Expense.get_category_display_name(category)} with ${suggested_amount:.2f} monthly limit",
                    'suggested_amount': suggested_amount,
                    'reason': f'You spend an average of ${monthly_avg:.2f} monthly in this category'
                })
        
        # Overall budget recommendations
        total_suggested = sum(budget['suggested_amount'] for budget in suggested_budgets)
        
        # 50/30/20 rule analysis
        needs_categories = ['food', 'transport', 'bills', 'healthcare']
        wants_categories = ['entertainment', 'shopping']
        
        needs_spending = sum(stats['monthly_average'] for cat, stats in category_stats.items() if cat in needs_categories)
        wants_spending = sum(stats['monthly_average'] for cat, stats in category_stats.items() if cat in wants_categories)
        
        needs_percentage = (needs_spending / total_spending * 6) * 100  # Convert to monthly percentage
        wants_percentage = (wants_spending / total_spending * 6) * 100
        
        if needs_percentage > 60:
            recommendations.append({
                'type': 'reduce_needs',
                'message': f"Your essential spending ({needs_percentage:.1f}%) exceeds the recommended 50%. Consider ways to reduce necessary expenses.",
                'category': 'overall'
            })
        
        if wants_percentage > 40:
            recommendations.append({
                'type': 'reduce_wants',
                'message': f"Your discretionary spending ({wants_percentage:.1f}%) exceeds the recommended 30%. Consider reducing entertainment and shopping expenses.",
                'category': 'overall'
            })
        
        return jsonify({
            'recommendations': recommendations,
            'suggested_budgets': suggested_budgets,
            'analysis': {
                'total_monthly_spending': total_spending / 6,
                'total_suggested_budget': total_suggested,
                'needs_percentage': round(needs_percentage, 1),
                'wants_percentage': round(wants_percentage, 1),
                'categories_analyzed': len(category_stats)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to generate budget recommendations',
            'error': str(e)
        }), 500

@insights_bp.route('/forecasting/advanced-predictions', methods=['GET'])
@jwt_required()
def get_advanced_predictions():
    """Get advanced ML-based spending predictions"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        forecast_months = request.args.get('months', default=3, type=int)
        
        # Get historical data (at least 6 months for meaningful predictions)
        start_date = datetime.utcnow().date() - timedelta(days=365)
        expenses = Expense.get_expenses_by_user(
            current_user_id,
            start_date=start_date
        )
        
        if len(expenses) < 20:
            return jsonify({
                'message': 'Insufficient data for advanced predictions',
                'predictions': [],
                'confidence': 'low'
            }), 200
        
        # Convert to DataFrame
        df = pd.DataFrame([{
            'amount': float(expense.amount),
            'category': expense.category,
            'date': expense.date,
            'year_month': expense.date.strftime('%Y-%m')
        } for expense in expenses])
        
        # Monthly aggregation
        monthly_data = df.groupby('year_month')['amount'].sum().reset_index()
        monthly_data['date'] = pd.to_datetime(monthly_data['year_month'])
        monthly_data = monthly_data.sort_values('date')
        
        # Prepare data for ML model
        monthly_data['month_number'] = range(len(monthly_data))
        
        # Features for prediction
        X = monthly_data[['month_number']].values
        y = monthly_data['amount'].values
        
        # Try different models and select the best one
        models = []
        
        # 1. Linear Regression
        lr = LinearRegression()
        lr.fit(X, y)
        lr_score = lr.score(X, y)
        models.append(('linear', lr, lr_score))
        
        # 2. Polynomial Regression (degree 2)
        poly_features = PolynomialFeatures(degree=2)
        X_poly = poly_features.fit_transform(X)
        lr_poly = LinearRegression()
        lr_poly.fit(X_poly, y)
        poly_score = lr_poly.score(X_poly, y)
        models.append(('polynomial', (poly_features, lr_poly), poly_score))
        
        # Select best model
        best_model_name, best_model, best_score = max(models, key=lambda x: x[2])
        
        # Generate predictions
        predictions = []
        last_month_number = monthly_data['month_number'].max()
        
        for i in range(1, forecast_months + 1):
            future_month = last_month_number + i
            
            if best_model_name == 'linear':
                prediction = best_model.predict([[future_month]])[0]
            else:  # polynomial
                poly_features, lr_poly = best_model
                X_future_poly = poly_features.transform([[future_month]])
                prediction = lr_poly.predict(X_future_poly)[0]
            
            # Calculate prediction date
            last_date = monthly_data['date'].max()
            future_date = last_date + pd.DateOffset(months=i)
            
            predictions.append({
                'month': future_date.strftime('%Y-%m'),
                'predicted_amount': max(0, float(prediction)),  # Ensure non-negative
                'confidence_interval': {
                    'lower': max(0, float(prediction * 0.8)),
                    'upper': float(prediction * 1.2)
                }
            })
        
        # Category-level predictions
        category_predictions = []
        
        for category in df['category'].unique():
            category_df = df[df['category'] == category]
            category_monthly = category_df.groupby('year_month')['amount'].sum().reset_index()
            
            if len(category_monthly) >= 3:
                category_monthly['month_number'] = range(len(category_monthly))
                X_cat = category_monthly[['month_number']].values
                y_cat = category_monthly['amount'].values
                
                # Simple linear regression for categories
                lr_cat = LinearRegression()
                lr_cat.fit(X_cat, y_cat)
                
                # Predict next month for this category
                next_month = len(category_monthly)
                category_pred = lr_cat.predict([[next_month]])[0]
                
                category_predictions.append({
                    'category': category,
                    'display_name': Expense.get_category_display_name(category),
                    'predicted_next_month': max(0, float(category_pred)),
                    'historical_average': float(category_monthly['amount'].mean()),
                    'trend': 'increasing' if lr_cat.coef_[0] > 0 else 'decreasing' if lr_cat.coef_[0] < 0 else 'stable'
                })
        
        # Calculate confidence level
        confidence = 'high' if best_score > 0.7 else 'medium' if best_score > 0.4 else 'low'
        
        # Generate insights
        insights = []
        
        # Trend analysis
        overall_trend = best_model.coef_[0] if best_model_name == 'linear' else 'complex'
        if isinstance(overall_trend, (int, float)):
            if overall_trend > 0:
                insights.append("Your spending trend is increasing over time")
            elif overall_trend < 0:
                insights.append("Your spending trend is decreasing over time")
            else:
                insights.append("Your spending is relatively stable")
        
        # Seasonality detection (simple version)
        if len(monthly_data) >= 12:
            monthly_data['month'] = pd.to_datetime(monthly_data['year_month']).dt.month
            monthly_avg = monthly_data.groupby('month')['amount'].mean()
            peak_month = monthly_avg.idxmax()
            low_month = monthly_avg.idxmin()
            
            insights.append(f"You typically spend most in {calendar.month_name[peak_month]} and least in {calendar.month_name[low_month]}")
        
        return jsonify({
            'predictions': predictions,
            'category_predictions': category_predictions,
            'model_info': {
                'model_type': best_model_name,
                'accuracy_score': round(best_score, 3),
                'confidence': confidence
            },
            'insights': insights,
            'historical_data': monthly_data[['year_month', 'amount']].to_dict('records')
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to generate advanced predictions',
            'error': str(e)
        }), 500

def generate_spending_recommendations(df, patterns):
    """Generate personalized spending recommendations"""
    recommendations = []
    
    # High spending day recommendation
    dow_pattern = next((p for p in patterns if p['type'] == 'day_of_week'), None)
    if dow_pattern:
        dow_data = pd.DataFrame(dow_pattern['data'])
        highest_day = dow_data.loc[dow_data['sum'].idxmax()]
        recommendations.append(
            f"You spend most on {highest_day['day_name']}s. Consider meal planning or limiting discretionary spending on this day."
        )
    
    # Category trend recommendations
    category_pattern = next((p for p in patterns if p['type'] == 'category_trends'), None)
    if category_pattern:
        for category_data in category_pattern['data']:
            if category_data['trend_direction'] == 'increasing':
                recommendations.append(
                    f"Your {category_data['display_name']} spending is increasing. Consider setting a budget to control this category."
                )
    
    # Unusual spending recommendation
    unusual_pattern = next((p for p in patterns if p['type'] == 'unusual_spending'), None)
    if unusual_pattern and unusual_pattern['data']['count'] > 0:
        recommendations.append(
            f"You have {unusual_pattern['data']['count']} unusual high-value expenses. Review these to ensure they align with your financial goals."
        )
    
    # Velocity recommendation
    velocity_pattern = next((p for p in patterns if p['type'] == 'spending_velocity'), None)
    if velocity_pattern:
        monthly_velocity = velocity_pattern['data']['current_velocity'] * 30
        recommendations.append(
            f"At your current rate, you'll spend ${monthly_velocity:.2f} this month. Consider if this aligns with your budget."
        )
    
    return recommendations
