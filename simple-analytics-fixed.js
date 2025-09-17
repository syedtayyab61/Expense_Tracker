// SIMPLE ANALYTICS - WORKING VERSION
class SimpleAnalytics {
    constructor() {
        this.expenses = [];
        this.charts = {};
        this.budgets = {};
        this.init();
    }

    init() {
        console.log('🔄 Initializing Simple Analytics...');
        this.loadExpenseData();
        console.log('✅ Simple Analytics initialized successfully');
    }

    loadExpenseData() {
        // Get expenses from localStorage
        this.expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        console.log(`📊 Loaded ${this.expenses.length} expenses for analytics`);
    }

    renderOverview() {
        console.log('📊 Rendering overview...');
        console.log(`📊 Current expenses count: ${this.expenses.length}`);
        
        const totalSpent = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const avgDaily = this.expenses.length > 0 ? totalSpent / this.expenses.length : 0;
        const topCategory = this.getTopCategory();
        
        console.log(`📊 Overview data: totalSpent=${totalSpent}, avgDaily=${avgDaily}, topCategory=${topCategory}`);
        
        // Update overview elements
        this.updateElement('overviewTotalSpent', `₹${totalSpent.toLocaleString()}`);
        this.updateElement('overviewDailyAvg', `₹${Math.round(avgDaily).toLocaleString()}`);
        this.updateElement('overviewTopCategory', topCategory);
        
        // Render overview chart
        this.renderOverviewChart();
    }

    getTopCategory() {
        if (this.expenses.length === 0) return 'None';
        
        const categoryTotals = {};
        this.expenses.forEach(exp => {
            const category = exp.category || 'other';
            categoryTotals[category] = (categoryTotals[category] || 0) + exp.amount;
        });
        
        const topCategory = Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a)[0];
        
        return topCategory ? this.getCategoryDisplayName(topCategory[0]) : 'None';
    }

    getCategoryDisplayName(category) {
        const categoryNames = {
            food: '🍕 Food & Dining',
            transport: '🚗 Transportation', 
            entertainment: '🎬 Entertainment',
            shopping: '🛒 Shopping',
            bills: '📄 Bills & Utilities',
            healthcare: '🏥 Healthcare',
            education: '📚 Education',
            other: '🔧 Other'
        };
        return categoryNames[category] || category;
    }

    renderOverviewChart() {
        const canvas = document.getElementById('overviewChart');
        if (!canvas) {
            console.warn('📊 Overview chart canvas not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (this.charts.overview) {
            this.charts.overview.destroy();
        }
        
        // Get monthly spending data
        const monthlyData = this.getMonthlySpendingData();
        console.log('📊 Monthly data for overview chart:', monthlyData);
        
        if (typeof Chart === 'undefined') {
            console.warn('📊 Chart.js not loaded');
            return;
        }

        this.charts.overview = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.labels,
                datasets: [{
                    label: 'Monthly Spending',
                    data: monthlyData.values,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    renderTrends() {
        console.log('📈 Rendering trends...');
        
        // Set up timeframe dropdown listener
        const timeframeSelect = document.getElementById('trendsTimeframe');
        if (timeframeSelect && !timeframeSelect.hasAttribute('data-listener')) {
            timeframeSelect.setAttribute('data-listener', 'true');
            timeframeSelect.addEventListener('change', () => {
                this.renderTrendsChart();
                this.updateTrendInsights();
            });
        }
        
        this.renderTrendsChart();
        this.renderCategoryChart();
        this.updateTrendInsights();
    }

    renderTrendsChart() {
        const canvas = document.getElementById('trendsTabChart');
        if (!canvas || typeof Chart === 'undefined') return;
        
        const timeframe = document.getElementById('trendsTimeframe')?.value || '6months';
        const trendData = this.getTrendData(timeframe);
        
        const ctx = canvas.getContext('2d');
        
        if (this.charts.trends) {
            this.charts.trends.destroy();
        }
        
        this.charts.trends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.labels,
                datasets: [{
                    label: 'Spending',
                    data: trendData.values,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    getTrendData(timeframe) {
        const now = new Date();
        let startDate = new Date();
        let groupBy = 'day';
        
        switch(timeframe) {
            case '1week':
                startDate.setDate(now.getDate() - 7);
                groupBy = 'day';
                break;
            case '1month':
                startDate.setMonth(now.getMonth() - 1);
                groupBy = 'day';
                break;
            case '6months':
                startDate.setMonth(now.getMonth() - 6);
                groupBy = 'month';
                break;
            case '1year':
                startDate.setFullYear(now.getFullYear() - 1);
                groupBy = 'month';
                break;
        }
        
        const filteredExpenses = this.expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= startDate && expDate <= now;
        });
        
        return this.groupExpensesByPeriod(filteredExpenses, groupBy);
    }

    groupExpensesByPeriod(expenses, groupBy) {
        const groups = {};
        
        expenses.forEach(exp => {
            const date = new Date(exp.date);
            let key;
            
            if (groupBy === 'day') {
                key = date.toISOString().split('T')[0];
            } else {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }
            
            groups[key] = (groups[key] || 0) + exp.amount;
        });
        
        const sortedKeys = Object.keys(groups).sort();
        return {
            labels: sortedKeys.map(key => {
                if (groupBy === 'day') {
                    return new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } else {
                    const [year, month] = key.split('-');
                    return new Date(year, month - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                }
            }),
            values: sortedKeys.map(key => groups[key])
        };
    }

    renderCategoryChart() {
        const canvas = document.getElementById('categoryChart');
        if (!canvas || typeof Chart === 'undefined') return;
        
        const categoryData = this.getCategoryData();
        const ctx = canvas.getContext('2d');
        
        if (this.charts.category) {
            this.charts.category.destroy();
        }
        
        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.values,
                    backgroundColor: [
                        '#ef4444', '#06b6d4', '#8b5cf6', '#10b981',
                        '#f59e0b', '#ec4899', '#6366f1', '#64748b'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    getCategoryData() {
        const categoryTotals = {};
        
        this.expenses.forEach(exp => {
            const category = exp.category || 'other';
            categoryTotals[category] = (categoryTotals[category] || 0) + exp.amount;
        });
        
        return {
            labels: Object.keys(categoryTotals).map(cat => this.getCategoryDisplayName(cat)),
            values: Object.values(categoryTotals)
        };
    }

    updateTrendInsights() {
        const totalSpent = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const avgDaily = this.expenses.length > 0 ? totalSpent / this.expenses.length : 0;
        
        // Calculate peak spending day
        const dailyTotals = {};
        this.expenses.forEach(exp => {
            const date = exp.date;
            dailyTotals[date] = (dailyTotals[date] || 0) + exp.amount;
        });
        
        const peakDay = Object.entries(dailyTotals)
            .sort(([,a], [,b]) => b - a)[0];
        
        // Calculate trend
        const recentExpenses = this.expenses.slice(0, Math.floor(this.expenses.length / 2));
        const olderExpenses = this.expenses.slice(Math.floor(this.expenses.length / 2));
        
        const recentAvg = recentExpenses.length > 0 ? 
            recentExpenses.reduce((sum, exp) => sum + exp.amount, 0) / recentExpenses.length : 0;
        const olderAvg = olderExpenses.length > 0 ? 
            olderExpenses.reduce((sum, exp) => sum + exp.amount, 0) / olderExpenses.length : 0;
        
        let trendDirection = 'Stable';
        if (recentAvg > olderAvg * 1.1) trendDirection = 'Increasing';
        else if (recentAvg < olderAvg * 0.9) trendDirection = 'Decreasing';
        
        this.updateElement('avgDaily', `₹${Math.round(avgDaily).toLocaleString()}`);
        this.updateElement('peakDay', peakDay ? 
            `${new Date(peakDay[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (₹${peakDay[1].toLocaleString()})` : 'None');
        this.updateElement('trendDirection', trendDirection);
    }

    renderCategories() {
        console.log('🏷️ Rendering categories...');
        
        this.renderCategoriesChart();
        this.updateTopCategories();
    }
    
    renderCategoriesChart() {
        const canvas = document.getElementById('categoriesTabChart');
        if (!canvas || typeof Chart === 'undefined') return;
        
        const categoryData = this.getCategoryData();
        const ctx = canvas.getContext('2d');
        
        if (this.charts.categoriesTab) {
            this.charts.categoriesTab.destroy();
        }
        
        this.charts.categoriesTab = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.values,
                    backgroundColor: [
                        '#ef4444', '#06b6d4', '#8b5cf6', '#10b981',
                        '#f59e0b', '#ec4899', '#6366f1', '#64748b'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
    
    updateTopCategories() {
        const topCategoryTotals = {};
        
        this.expenses.forEach(exp => {
            const category = exp.category || 'other';
            topCategoryTotals[category] = (topCategoryTotals[category] || 0) + exp.amount;
        });
        
        const sortedCategories = Object.entries(topCategoryTotals)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);
        
        const topCategoriesElement = document.getElementById('topCategories');
        if (topCategoriesElement) {
            topCategoriesElement.innerHTML = sortedCategories.map(([category, amount], index) => `
                <div class="category-item">
                    <span class="category-rank">${index + 1}</span>
                    <span class="category-name">${this.getCategoryDisplayName(category)}</span>
                    <span class="category-amount">₹${amount.toLocaleString()}</span>
                </div>
            `).join('');
        }
    }

    renderBudget() {
        console.log('🎯 Rendering budget...');
        // Budget functionality will be implemented here
        this.setupBudgetFormEvents();
        this.loadBudgetData();
        this.renderBudgetVsSpendsChart();
        this.updateBudgetSummary();
    }

    setupBudgetFormEvents() {
        // Budget form event setup
    }

    loadBudgetData() {
        this.budgets = JSON.parse(localStorage.getItem('categoryBudgets')) || {};
    }

    renderBudgetVsSpendsChart() {
        // Budget chart rendering
    }

    updateBudgetSummary() {
        // Budget summary update
    }

    renderHealth() {
        console.log('💚 Rendering health...');
        // Health tab functionality
    }

    renderPredictions() {
        console.log('🔮 Rendering predictions...');
        // Predictions tab functionality
    }

    renderPatterns() {
        console.log('🧠 Rendering patterns...');
        // Patterns tab functionality
    }

    renderInsights() {
        console.log('💡 Rendering insights...');
        // Insights tab functionality
    }

    getMonthlySpendingData() {
        const monthlyTotals = {};
        
        this.expenses.forEach(exp => {
            const date = new Date(exp.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + exp.amount;
        });
        
        const sortedMonths = Object.keys(monthlyTotals).sort().slice(-6); // Last 6 months
        
        return {
            labels: sortedMonths.map(month => {
                const [year, monthNum] = month.split('-');
                return new Date(year, monthNum - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            }),
            values: sortedMonths.map(month => monthlyTotals[month])
        };
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            console.log(`📊 Updated ${id} = ${value}`);
        } else {
            console.warn(`📊 Element with id '${id}' not found`);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Simple Analytics System...');
    
    // Wait a bit for other scripts to load
    setTimeout(() => {
        window.simpleAnalytics = new SimpleAnalytics();
        console.log('✅ Simple Analytics ready!');
    }, 1000);
});
