from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models.expense import Expense
from models.budget import Budget
from models.user import User
from datetime import datetime, timedelta, date
from sqlalchemy import func, extract
import calendar

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/spending-trends', methods=['GET'])
@jwt_required()
def get_spending_trends():
    """Get spending trends over time"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        period = request.args.get('period', 'monthly')  # daily, weekly, monthly, yearly
        months = request.args.get('months', default=6, type=int)
        
        if period == 'monthly':
            # Get monthly trends
            monthly_data = Expense.get_monthly_totals(current_user_id, months)
            
            trends = []
            for year, month, total in monthly_data:
                month_name = calendar.month_name[int(month)]
                trends.append({
                    'period': f"{month_name} {int(year)}",
                    'year': int(year),
                    'month': int(month),
                    'total': float(total or 0),
                    'date': f"{int(year)}-{int(month):02d}-01"
                })
            
            return jsonify({
                'trends': trends,
                'period': period,
                'months': months
            }), 200
        
        elif period == 'daily':
            # Get daily trends for the last 30 days
            days = request.args.get('days', default=30, type=int)
            daily_data = Expense.get_spending_trends(current_user_id, days)
            
            trends = []
            for expense_date, total, count in daily_data:
                trends.append({
                    'date': expense_date.isoformat(),
                    'total': float(total or 0),
                    'count': int(count or 0)
                })
            
            return jsonify({
                'trends': trends,
                'period': period,
                'days': days
            }), 200
        
        else:
            return jsonify({
                'message': 'Invalid period. Use daily or monthly',
                'error': 'invalid_period'
            }), 400
            
    except Exception as e:
        return jsonify({
            'message': 'Failed to get spending trends',
            'error': str(e)
        }), 500

@analytics_bp.route('/category-insights', methods=['GET'])
@jwt_required()
def get_category_insights():
    """Get category-based spending insights"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Parse dates
        start_date_obj = None
        end_date_obj = None
        
        if start_date:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
        if end_date:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Get category totals
        category_data = Expense.get_category_totals(
            current_user_id,
            start_date=start_date_obj,
            end_date=end_date_obj
        )
        
        total_spending = sum(float(total) for _, total, _ in category_data)
        
        insights = []
        for category, total, count in category_data:
            percentage = (float(total) / total_spending * 100) if total_spending > 0 else 0
            
            insights.append({
                'category': category,
                'display_name': Expense.get_category_display_name(category),
                'total': float(total),
                'count': int(count),
                'percentage': round(percentage, 2),
                'average_per_transaction': float(total) / int(count) if count > 0 else 0
            })
        
        # Calculate insights
        top_category = insights[0] if insights else None
        most_frequent = max(insights, key=lambda x: x['count']) if insights else None
        
        return jsonify({
            'category_breakdown': insights,
            'summary': {
                'total_spending': total_spending,
                'total_categories': len(insights),
                'top_category': top_category,
                'most_frequent_category': most_frequent,
                'date_range': {
                    'start_date': start_date_obj.isoformat() if start_date_obj else None,
                    'end_date': end_date_obj.isoformat() if end_date_obj else None
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to get category insights',
            'error': str(e)
        }), 500

@analytics_bp.route('/monthly-reports', methods=['GET'])
@jwt_required()
def get_monthly_reports():
    """Get detailed monthly reports"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        year = request.args.get('year', default=datetime.utcnow().year, type=int)
        month = request.args.get('month', default=datetime.utcnow().month, type=int)
        
        # Validate month and year
        if not (1 <= month <= 12):
            return jsonify({
                'message': 'Invalid month. Must be between 1 and 12',
                'error': 'invalid_month'
            }), 400
        
        # Get start and end dates for the month
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)
        
        # Get expenses for the month
        expenses = Expense.get_expenses_by_user(
            current_user_id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Calculate totals
        total_spent = sum(float(expense.amount) for expense in expenses)
        total_transactions = len(expenses)
        
        # Category breakdown
        category_totals = {}
        for expense in expenses:
            category = expense.category
            if category not in category_totals:
                category_totals[category] = 0
            category_totals[category] += float(expense.amount)
        
        # Daily breakdown
        daily_totals = {}
        for expense in expenses:
            day = expense.date.day
            if day not in daily_totals:
                daily_totals[day] = 0
            daily_totals[day] += float(expense.amount)
        
        # Get budgets for this month
        budgets = Budget.query.filter(
            Budget.user_id == current_user_id,
            Budget.start_date <= end_date,
            Budget.end_date >= start_date
        ).all()
        
        budget_performance = []
        total_budget = 0
        
        for budget in budgets:
            spent = budget.get_spent_amount()
            budget_amount = float(budget.amount)
            total_budget += budget_amount
            
            budget_performance.append({
                'category': budget.category,
                'display_name': budget.get_category_display_name(),
                'budget_amount': budget_amount,
                'spent_amount': spent,
                'remaining': budget_amount - spent,
                'percentage_used': (spent / budget_amount * 100) if budget_amount > 0 else 0,
                'is_over_budget': spent > budget_amount
            })
        
        # Compare with previous month
        prev_month = month - 1 if month > 1 else 12
        prev_year = year if month > 1 else year - 1
        
        prev_start_date = date(prev_year, prev_month, 1)
        if prev_month == 12:
            prev_end_date = date(prev_year + 1, 1, 1) - timedelta(days=1)
        else:
            prev_end_date = date(prev_year, prev_month + 1, 1) - timedelta(days=1)
        
        prev_expenses = Expense.get_expenses_by_user(
            current_user_id,
            start_date=prev_start_date,
            end_date=prev_end_date
        )
        prev_total_spent = sum(float(expense.amount) for expense in prev_expenses)
        
        month_over_month_change = 0
        if prev_total_spent > 0:
            month_over_month_change = ((total_spent - prev_total_spent) / prev_total_spent) * 100
        
        return jsonify({
            'report': {
                'year': year,
                'month': month,
                'month_name': calendar.month_name[month],
                'total_spent': total_spent,
                'total_transactions': total_transactions,
                'average_per_day': total_spent / end_date.day if end_date.day > 0 else 0,
                'average_per_transaction': total_spent / total_transactions if total_transactions > 0 else 0,
                'month_over_month_change': round(month_over_month_change, 2)
            },
            'category_breakdown': [
                {
                    'category': category,
                    'display_name': Expense.get_category_display_name(category),
                    'total': total,
                    'percentage': (total / total_spent * 100) if total_spent > 0 else 0
                }
                for category, total in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
            ],
            'daily_breakdown': [
                {
                    'day': day,
                    'total': total,
                    'date': date(year, month, day).isoformat()
                }
                for day, total in sorted(daily_totals.items())
            ],
            'budget_performance': budget_performance,
            'budget_summary': {
                'total_budget': total_budget,
                'total_spent': total_spent,
                'total_remaining': total_budget - total_spent,
                'overall_percentage_used': (total_spent / total_budget * 100) if total_budget > 0 else 0
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to get monthly report',
            'error': str(e)
        }), 500

@analytics_bp.route('/year-over-year', methods=['GET'])
@jwt_required()
def get_year_over_year():
    """Get year-over-year comparison"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        current_year = request.args.get('current_year', default=datetime.utcnow().year, type=int)
        previous_year = current_year - 1
        
        # Get data for both years
        current_year_data = {}
        previous_year_data = {}
        
        for month in range(1, 13):
            # Current year
            start_date = date(current_year, month, 1)
            if month == 12:
                end_date = date(current_year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = date(current_year, month + 1, 1) - timedelta(days=1)
            
            current_expenses = Expense.get_expenses_by_user(
                current_user_id,
                start_date=start_date,
                end_date=end_date
            )
            current_total = sum(float(expense.amount) for expense in current_expenses)
            current_year_data[month] = {
                'total': current_total,
                'count': len(current_expenses),
                'month_name': calendar.month_name[month]
            }
            
            # Previous year
            prev_start_date = date(previous_year, month, 1)
            if month == 12:
                prev_end_date = date(previous_year + 1, 1, 1) - timedelta(days=1)
            else:
                prev_end_date = date(previous_year, month + 1, 1) - timedelta(days=1)
            
            prev_expenses = Expense.get_expenses_by_user(
                current_user_id,
                start_date=prev_start_date,
                end_date=prev_end_date
            )
            prev_total = sum(float(expense.amount) for expense in prev_expenses)
            previous_year_data[month] = {
                'total': prev_total,
                'count': len(prev_expenses),
                'month_name': calendar.month_name[month]
            }
        
        # Calculate comparisons
        comparison_data = []
        total_current = 0
        total_previous = 0
        
        for month in range(1, 13):
            current = current_year_data[month]['total']
            previous = previous_year_data[month]['total']
            
            total_current += current
            total_previous += previous
            
            change = 0
            if previous > 0:
                change = ((current - previous) / previous) * 100
            
            comparison_data.append({
                'month': month,
                'month_name': calendar.month_name[month],
                'current_year': {
                    'year': current_year,
                    'total': current,
                    'count': current_year_data[month]['count']
                },
                'previous_year': {
                    'year': previous_year,
                    'total': previous,
                    'count': previous_year_data[month]['count']
                },
                'change_percentage': round(change, 2),
                'change_amount': current - previous
            })
        
        # Overall year comparison
        overall_change = 0
        if total_previous > 0:
            overall_change = ((total_current - total_previous) / total_previous) * 100
        
        return jsonify({
            'comparison': comparison_data,
            'summary': {
                'current_year': current_year,
                'previous_year': previous_year,
                'current_total': total_current,
                'previous_total': total_previous,
                'overall_change_percentage': round(overall_change, 2),
                'overall_change_amount': total_current - total_previous
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to get year-over-year comparison',
            'error': str(e)
        }), 500

@analytics_bp.route('/budget-vs-actual', methods=['GET'])
@jwt_required()
def get_budget_vs_actual():
    """Get budget vs actual spending analysis"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Default to current month if no dates provided
        if not start_date or not end_date:
            now = datetime.utcnow()
            start_date_obj = date(now.year, now.month, 1)
            if now.month == 12:
                end_date_obj = date(now.year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date_obj = date(now.year, now.month + 1, 1) - timedelta(days=1)
        else:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Get active budgets for the period
        budgets = Budget.query.filter(
            Budget.user_id == current_user_id,
            Budget.is_active == True,
            Budget.start_date <= end_date_obj,
            Budget.end_date >= start_date_obj
        ).all()
        
        budget_analysis = []
        total_budgeted = 0
        total_spent = 0
        
        for budget in budgets:
            spent = budget.get_spent_amount()
            budget_amount = float(budget.amount)
            
            total_budgeted += budget_amount
            total_spent += spent
            
            variance = spent - budget_amount
            variance_percentage = (variance / budget_amount * 100) if budget_amount > 0 else 0
            
            budget_analysis.append({
                'budget_id': budget.id,
                'category': budget.category,
                'display_name': budget.get_category_display_name(),
                'period': budget.period,
                'budgeted_amount': budget_amount,
                'actual_spent': spent,
                'remaining': budget_amount - spent,
                'variance': variance,
                'variance_percentage': round(variance_percentage, 2),
                'percentage_used': round(budget.get_percentage_used(), 2),
                'is_over_budget': budget.is_over_budget(),
                'days_remaining': budget.get_days_remaining(),
                'daily_budget_remaining': budget.get_daily_budget_remaining()
            })
        
        # Overall analysis
        overall_variance = total_spent - total_budgeted
        overall_variance_percentage = (overall_variance / total_budgeted * 100) if total_budgeted > 0 else 0
        
        return jsonify({
            'budget_analysis': budget_analysis,
            'summary': {
                'total_budgeted': total_budgeted,
                'total_spent': total_spent,
                'total_remaining': total_budgeted - total_spent,
                'overall_variance': overall_variance,
                'overall_variance_percentage': round(overall_variance_percentage, 2),
                'overall_percentage_used': (total_spent / total_budgeted * 100) if total_budgeted > 0 else 0,
                'period': {
                    'start_date': start_date_obj.isoformat(),
                    'end_date': end_date_obj.isoformat()
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'message': 'Failed to get budget vs actual analysis',
            'error': str(e)
        }), 500
