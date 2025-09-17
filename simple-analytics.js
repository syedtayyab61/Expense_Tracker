// SIMPLE ANALYTICS - WORKING VERSION
class SimpleAnalytics {
    constructor() {
        this.expenses = [];
        this.charts = {};
        this.budgets = {};           if (typeof Chart === 'undefined' && typeof window.Chart === 'undefined') {
            console.log('❌ Chart.js not available for trends chart');
            return;
        }
        const ChartLib = typeof Chart !== 'undefined' ? Chart : window.Chart; if (typeof Chart === 'undefined' && typeof window.Chart === 'undefined') {
            console.log('❌ Chart.js not available for overview chart');
            return;
        }
        const ChartLib = typeof Chart !== 'undefined' ? Chart : window.Chart;      this.init();
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
        console.log('� === OVERVIEW RENDERING STARTED ===');
        console.log(`📊 Current expenses count: ${this.expenses.length}`);
        console.log(`📊 Sample expenses:`, this.expenses.slice(0, 2));
        
        // Force reload data to ensure we have latest
        this.loadExpenseData();
        console.log(`📊 After reload - expenses count: ${this.expenses.length}`);
        
        // Check if DOM elements exist
        const requiredElements = ['overviewTotalSpent', 'overviewDailyAvg', 'overviewTopCategory', 'overviewChart'];
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            console.error('❌ Missing overview DOM elements:', missingElements);
            return;
        }
        console.log('✅ All overview DOM elements found');
        
        const totalSpent = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const avgDaily = this.expenses.length > 0 ? totalSpent / this.expenses.length : 0;
        const topCategory = this.getTopCategory();
        
        console.log(`� CALCULATED VALUES:`);
        console.log(`📊 Total Spent: ${totalSpent}`);
        console.log(`📊 Average Daily: ${avgDaily}`);
        console.log(`📊 Top Category: ${topCategory}`);
        
        // Update overview elements with extra logging
        console.log('🔥 UPDATING DOM ELEMENTS...');
        this.updateElement('overviewTotalSpent', `₹${totalSpent.toLocaleString()}`);
        this.updateElement('overviewDailyAvg', `₹${Math.round(avgDaily).toLocaleString()}`);
        this.updateElement('overviewTopCategory', topCategory);
        
        // Verify the updates worked
        console.log('🔥 VERIFYING UPDATES...');
        console.log('Total spent element:', document.getElementById('overviewTotalSpent')?.textContent);
        console.log('Daily avg element:', document.getElementById('overviewDailyAvg')?.textContent);
        console.log('Top category element:', document.getElementById('overviewTopCategory')?.textContent);
        
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
        
        if (typeof Chart === 'undefined' && typeof window.Chart === 'undefined') {
            console.log('❌ Chart.js not available');
            return;
        }
        
        const ChartConstructor = typeof Chart !== 'undefined' ? Chart : window.Chart;
        this.charts.overview = new ChartConstructor(ctx, {
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
        console.log(`📈 Expenses available for trends: ${this.expenses.length}`);
        
        // Refresh data to make sure we have latest
        this.loadExpenseData();
        console.log(`📈 After loading, expenses: ${this.expenses.length}`);
        
        // Check if required DOM elements exist
        const requiredElements = ['trendsTimeframe', 'trendsTabChart', 'categoryChart'];
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            console.error('❌ Missing trends DOM elements:', missingElements);
            return;
        }
        console.log(`📈 After refresh - Expenses count: ${this.expenses.length}`);
        
        // Set up timeframe dropdown listener
        const timeframeSelect = document.getElementById('trendsTimeframe');
        if (timeframeSelect && !timeframeSelect.hasAttribute('data-listener')) {
            timeframeSelect.setAttribute('data-listener', 'true');
            timeframeSelect.addEventListener('change', () => {
                console.log('📈 Timeframe changed, re-rendering charts');
                this.renderTrendsChart();
                this.updateTrendInsights();
            });
        }
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined' && typeof window.Chart === 'undefined') {
            console.log('❌ Chart.js not available');
            return;
        }
        
        console.log('📈 Rendering trends charts...');
        this.renderTrendsChart();
        this.renderCategoryChart();
        this.updateTrendInsights();
        console.log('📈 Trends rendering complete');
    }

    renderTrendsChart() {
        console.log('📊 Rendering trends chart...');
        const canvas = document.getElementById('trendsTabChart');
        if (!canvas) {
            console.error('❌ Trends chart canvas not found!');
            return;
        }
        if (typeof Chart === 'undefined' && typeof window.Chart === 'undefined') {
            console.log('❌ Chart.js not available');
            return;
        }
        
        const timeframe = document.getElementById('trendsTimeframe')?.value || '6months';
        console.log(`📊 Using timeframe: ${timeframe}`);
        const trendData = this.getTrendData(timeframe);
        console.log('📊 Trend data generated:', trendData);
        console.log('📊 Trend data labels:', trendData.labels);
        console.log('📊 Trend data values:', trendData.values);
        
        if (!trendData.labels || trendData.labels.length === 0) {
            console.warn('⚠️ No trend data available - labels empty');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        if (this.charts.trends) {
            console.log('📊 Destroying existing trends chart');
            this.charts.trends.destroy();
        }
        
        console.log('📊 Creating new trends chart...');
        console.log('📊 Canvas context:', ctx);
        console.log('📊 Chart.js available:', typeof Chart !== 'undefined' || typeof window.Chart !== 'undefined');
        
        const ChartConstructor = typeof Chart !== 'undefined' ? Chart : window.Chart;
        
        try {
            this.charts.trends = new ChartConstructor(ctx, {
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
            });
            
            console.log('✅ Trends chart created successfully');
            
        } catch (error) {
            console.error('❌ Error creating trends chart:', error);
        }
    }

    getTrendData(timeframe) {
        console.log(`📊 getTrendData called with timeframe: ${timeframe}`);
        console.log(`📊 Available expenses: ${this.expenses.length}`);
        
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
        
        console.log(`📊 Date range: ${startDate.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`);
        
        const filteredExpenses = this.expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= startDate && expDate <= now;
        });
        
        console.log(`📊 Filtered expenses: ${filteredExpenses.length}`);
        console.log(`📊 Sample filtered expenses:`, filteredExpenses.slice(0, 2));
        
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
        console.log('🏷️ Rendering category chart...');
        const canvas = document.getElementById('categoryChart');
        if (!canvas) {
            console.error('❌ Category chart canvas not found!');
            return;
        }
        if (typeof Chart === 'undefined' && typeof window.Chart === 'undefined') {
            console.log('❌ Chart.js not available');
            return;
        }
        
        const categoryData = this.getCategoryData();
        console.log('🏷️ Category data:', categoryData);
        const ctx = canvas.getContext('2d');
        
        if (this.charts.category) {
            this.charts.category.destroy();
        }
        
        const ChartConstructor = typeof Chart !== 'undefined' ? Chart : window.Chart;
        this.charts.category = new ChartConstructor(ctx, {
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
        if (!canvas || (typeof Chart === 'undefined' && typeof window.Chart === 'undefined')) {
            console.log('❌ Category chart canvas not found or Chart.js not available');
            return;
        }
        
        const categoryData = this.getCategoryData();
        const ctx = canvas.getContext('2d');
        
        if (this.charts.categoriesTab) {
            this.charts.categoriesTab.destroy();
        }
        
        const ChartConstructor = typeof Chart !== 'undefined' ? Chart : window.Chart;
        this.charts.categoriesTab = new ChartConstructor(ctx, {
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

    // Debug method to test analytics
    debugAnalytics() {
        console.log('🔍 === ANALYTICS DEBUG INFO ===');
        
        // Check expenses loading
        console.log(`📊 Loaded ${this.expenses.length} expenses for analytics`);
        
        // Check Chart.js availability with multiple methods
        const chartAvailable = (typeof Chart !== 'undefined') || (typeof window.Chart !== 'undefined');
        console.log(chartAvailable ? '✅ Chart.js available' : '❌ Chart.js not available');
        
        // Check specific canvas elements
        const trendsCanvas = document.getElementById('trendsTabChart');
        const categoryCanvas = document.getElementById('categoryChart');
        
        console.log(trendsCanvas ? '✅ Trends chart canvas found' : '❌ Trends chart canvas not found');
        console.log(categoryCanvas ? '✅ Category chart canvas found' : '❌ Category chart canvas not found');
        
        // Additional debug info
        console.log(`SimpleAnalytics instance: ${!!window.simpleAnalytics}`);
        console.log(`BulletproofTabs instance: ${!!window.bulletproofTabs}`);
        
        if (this.expenses.length > 0) {
            console.log('Sample expenses:', this.expenses.slice(0, 2));
        }
        
        console.log('🔍 === END DEBUG INFO ===');
        return 'Debug info logged to console';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Simple Analytics System...');
    
    // Wait a bit for other scripts to load
    setTimeout(() => {
        window.simpleAnalytics = new SimpleAnalytics();
        console.log('✅ Simple Analytics ready!');
        
        // Force render the overview tab immediately after initialization
        setTimeout(() => {
            console.log('🔥 Force rendering overview after initialization...');
            if (window.simpleAnalytics) {
                window.simpleAnalytics.renderOverview();
            }
        }, 500);
        
        // Add global debug function
        window.debugAnalytics = () => {
            if (window.simpleAnalytics) {
                return window.simpleAnalytics.debugAnalytics();
            } else {
                console.error('❌ SimpleAnalytics not available');
                return 'SimpleAnalytics not found';
            }
        };

        // Add global function to add test data
        window.addTestExpenses = () => {
            const testExpenses = [
                { id: Date.now() + 1, amount: 150, category: 'food', description: 'Lunch at restaurant', date: new Date().toISOString().split('T')[0] },
                { id: Date.now() + 2, amount: 50, category: 'transport', description: 'Bus fare', date: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
                { id: Date.now() + 3, amount: 200, category: 'shopping', description: 'Groceries', date: new Date(Date.now() - 172800000).toISOString().split('T')[0] },
                { id: Date.now() + 4, amount: 80, category: 'entertainment', description: 'Movie tickets', date: new Date(Date.now() - 259200000).toISOString().split('T')[0] },
                { id: Date.now() + 5, amount: 300, category: 'bills', description: 'Electricity bill', date: new Date(Date.now() - 345600000).toISOString().split('T')[0] }
            ];
            localStorage.setItem('expenses', JSON.stringify(testExpenses));
            console.log('✅ Test expenses added:', testExpenses.length);
            window.refreshAnalytics();
            return testExpenses;
        };
        
        // Add global function to force refresh analytics
        window.refreshAnalytics = () => {
            if (window.simpleAnalytics && window.bulletproofTabs) {
                console.log('🔄 Force refreshing analytics...');
                window.simpleAnalytics.loadExpenseData();
                const currentTab = window.bulletproofTabs.currentTab;
                window.bulletproofTabs.renderTabContent(currentTab);
                return 'Analytics refreshed';
            } else {
                return 'Analytics or tabs not available';
            }
        };

        // Add test data function
        window.addTestExpenses = () => {
            const testExpenses = [
                {
                    id: Date.now() + 1,
                    amount: 150,
                    category: 'food',
                    description: 'Lunch at restaurant',
                    date: new Date().toISOString().split('T')[0]
                },
                {
                    id: Date.now() + 2,
                    amount: 50,
                    category: 'transport',
                    description: 'Bus fare',
                    date: new Date(Date.now() - 86400000).toISOString().split('T')[0]
                },
                {
                    id: Date.now() + 3,
                    amount: 200,
                    category: 'shopping',
                    description: 'Groceries',
                    date: new Date(Date.now() - 172800000).toISOString().split('T')[0]
                },
                {
                    id: Date.now() + 4,
                    amount: 75,
                    category: 'entertainment',
                    description: 'Movie tickets',
                    date: new Date(Date.now() - 259200000).toISOString().split('T')[0]
                }
            ];
            localStorage.setItem('expenses', JSON.stringify(testExpenses));
            console.log('✅ Test data added:', testExpenses);
            
            // Refresh analytics with force overview render
            if (window.simpleAnalytics) {
                console.log('🔥 Forcing data reload and overview refresh...');
                window.simpleAnalytics.loadExpenseData();
                window.simpleAnalytics.renderOverview(); // Force overview render
                if (window.bulletproofTabs) {
                    window.bulletproofTabs.refreshCurrentTab();
                }
            }
            return 'Test data loaded and analytics refreshed';
        };
        
        
        // Wire up refresh button
        const refreshBtn = document.getElementById('refreshAnalytics');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('🔄 Refresh button clicked');
                window.refreshAnalytics();
            });
            console.log('✅ Refresh button wired up');
        } else {
            console.warn('⚠️ Refresh button not found');
        }
        
    }, 1000);
});
