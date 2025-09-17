// Financial Analytics Engine for Personal Finance Dashboard
class FinancialAnalytics {
    constructor(dashboard) {
        console.log('🚀 FinancialAnalytics constructor called with dashboard:', dashboard);
        this.dashboard = dashboard;
        this.charts = {};
        this.analyticsData = {
            expenses: [],
            metrics: null
        };
        this.timeframe = 30; // Default to last 30 days
        
        console.log('🚀 Starting analytics initialization...');
        
        // Wait for DOM to be fully ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            setTimeout(() => this.init(), 100);
        }
    }
    
    init() {
        console.log('🔄 Analytics init() started');
        this.bindEvents();
        console.log('✅ Events bound');
        this.loadAnalyticsData();
        console.log('✅ Data loaded');
        this.initializeCharts();
        console.log('✅ Charts initialized');
        this.calculateMetrics();
        console.log('✅ Metrics calculated');
        this.renderAnalytics();
        console.log('✅ Analytics rendered');
        
        // Set overview tab as active by default
        setTimeout(() => {
            this.switchTab('overview');
            console.log('✅ Overview tab activated');
        }, 100);
    }
    
    bindEvents() {
        console.log('🔗 Binding analytics events...');
        
        // Analytics main tabs
        const tabs = document.querySelectorAll('.analytics-tab');
        console.log(`🔗 Found ${tabs.length} analytics tabs`);
        
        tabs.forEach((tab, index) => {
            console.log(`🔗 Binding tab ${index + 1}: ${tab.textContent}`);
            tab.addEventListener('click', (e) => {
                console.log('🔗 Tab clicked:', e.target.dataset.tab);
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Timeframe selector
        const timeframeSelect = document.getElementById('analyticsTimeframe');
        if (timeframeSelect) {
            timeframeSelect.addEventListener('change', (e) => {
                this.timeframe = parseInt(e.target.value);
                this.refreshAnalytics();
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshAnalytics');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshAnalytics();
            });
        }
        
        // Trend view buttons
        document.querySelectorAll('.trend-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                if (view) {
                    document.querySelectorAll('.trend-view-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.switchTrendView(view);
                }
            });
        });
        
        // Category chart view switcher
        document.querySelectorAll('.switch-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                if (view) {
                    document.querySelectorAll('.switch-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.switchCategoryView(view);
                }
            });
        });
    }
    
    switchTab(tabName) {
        console.log(`🔄 Switching to tab: ${tabName}`);
        
        // Remove active class from all tabs and content
        document.querySelectorAll('.analytics-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.analytics-tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to selected tab and content
        const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
        const selectedContent = document.getElementById(`${tabName}-tab`);
        
        console.log(`🔄 Selected tab element:`, selectedTab);
        console.log(`🔄 Selected content element:`, selectedContent);
        
        if (selectedTab && selectedContent) {
            selectedTab.classList.add('active');
            selectedContent.classList.add('active');
            
            // Load specific content for each tab
            this.loadTabContent(tabName);
            console.log(`✅ Tab ${tabName} loaded successfully`);
        } else {
            console.error(`❌ Tab elements not found for: ${tabName}`);
            console.error(`- Tab button: ${selectedTab ? 'Found' : 'NOT FOUND'}`);
            console.error(`- Tab content: ${selectedContent ? 'Found' : 'NOT FOUND'}`);
        }
    }
    
    loadTabContent(tabName) {
        switch (tabName) {
            case 'overview':
                this.renderOverviewTab();
                break;
            case 'trends':
                this.renderTrendsTab();
                break;
            case 'categories':
                this.renderCategoriesTab();
                break;
            case 'budget':
                this.renderBudgetTab();
                break;
            case 'health':
                this.renderHealthTab();
                break;
            case 'predictions':
                this.renderPredictionsTab();
                break;
            case 'patterns':
                this.renderPatternsTab();
                break;
            case 'insights':
                this.renderInsightsTab();
                break;
        }
    }
    
    loadAnalyticsData() {
        // Get expenses from dashboard, fallback to localStorage if needed
        let expenses = [];
        
        if (this.dashboard && this.dashboard.expenses) {
            expenses = this.dashboard.expenses;
        } else {
            // Fallback to localStorage
            expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        }
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.timeframe);
        
        // Filter expenses by timeframe
        this.analyticsData.expenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= cutoffDate;
        });
        
        console.log(`📊 Loaded ${this.analyticsData.expenses.length} expenses for analytics from ${expenses.length} total`);
    }
    
    calculateMetrics() {
        const expenses = this.analyticsData.expenses;
        console.log(`🧮 Calculating metrics for ${expenses.length} expenses`);
        
        if (expenses.length === 0) {
            console.log('📊 No expenses found, using empty metrics');
            this.analyticsData.metrics = this.getEmptyMetrics();
            return;
        }
        
        try {
            // Basic metrics
            const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
            const avgDaily = totalSpent / this.timeframe;
            const avgPerTransaction = totalSpent / expenses.length;
            console.log('✅ Basic metrics calculated');
            
            // Category breakdown
            const categoryTotals = {};
            expenses.forEach(exp => {
                categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
            });
            console.log('✅ Category totals calculated');
            
            // Spending trends (daily) - with error handling
            let dailySpending = {};
            let weeklyTrend = {};
            let monthlyTrend = {};
            try {
                dailySpending = this.calculateDailySpending(expenses);
                weeklyTrend = this.calculateWeeklyTrend(expenses);
                monthlyTrend = this.calculateMonthlyTrend(expenses);
                console.log('✅ Trends calculated');
            } catch (error) {
                console.error('❌ Error calculating trends:', error);
                dailySpending = {};
                weeklyTrend = {};
                monthlyTrend = {};
            }
            
            // Peak analysis - with error handling
            let peakDay = null;
            let spendingPatterns = {};
            try {
                peakDay = this.findPeakSpendingDay(dailySpending);
                spendingPatterns = this.analyzeSpendingPatterns(expenses);
                console.log('✅ Patterns analyzed');
            } catch (error) {
                console.error('❌ Error analyzing patterns:', error);
                peakDay = null;
                spendingPatterns = {};
            }
            
            // Budget analysis - with error handling
            let budgetPerformance = null;
            try {
                budgetPerformance = this.calculateBudgetPerformance(categoryTotals);
                console.log('✅ Budget performance calculated');
            } catch (error) {
                console.error('❌ Error calculating budget:', error);
                budgetPerformance = null;
            }
            
            // Financial health score - with error handling
            let healthScore = null;
            try {
                healthScore = this.calculateFinancialHealthScore(expenses, totalSpent);
                console.log('✅ Health score calculated');
            } catch (error) {
                console.error('❌ Error calculating health score:', error);
                healthScore = null;
            }
            
            // Predictive analytics - with error handling
            let predictions = null;
            try {
                predictions = this.generatePredictions(expenses, dailySpending);
                console.log('✅ Predictions generated');
            } catch (error) {
                console.error('❌ Error generating predictions:', error);
                predictions = null;
            }
            
            this.analyticsData.metrics = {
                totalSpent,
                avgDaily,
                avgPerTransaction,
                categoryTotals,
                dailySpending,
                weeklyTrend,
                monthlyTrend,
                peakDay,
                spendingPatterns,
                budgetPerformance,
                healthScore,
                predictions,
                transactionCount: expenses.length
            };
            
            console.log('📊 Analytics metrics calculated successfully:', this.analyticsData.metrics);
            
        } catch (error) {
            console.error('❌ Critical error in calculateMetrics:', error);
            // Fallback to empty metrics if everything fails
            this.analyticsData.metrics = this.getEmptyMetrics();
        }
    }
    
    calculateDailySpending(expenses) {
        const dailySpending = {};
        
        // Initialize all days in timeframe
        for (let i = 0; i < this.timeframe; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dailySpending[dateStr] = 0;
        }
        
        // Aggregate expenses by day
        expenses.forEach(expense => {
            const dateStr = expense.date;
            if (dailySpending.hasOwnProperty(dateStr)) {
                dailySpending[dateStr] += expense.amount;
            }
        });
        
        return dailySpending;
    }
    
    calculateWeeklyTrend(expenses) {
        const weeklyData = {};
        
        expenses.forEach(expense => {
            const date = new Date(expense.date);
            const weekStart = this.getWeekStart(date);
            const weekKey = weekStart.toISOString().split('T')[0];
            
            weeklyData[weekKey] = (weeklyData[weekKey] || 0) + expense.amount;
        });
        
        return weeklyData;
    }
    
    calculateMonthlyTrend(expenses) {
        const monthlyData = {};
        
        expenses.forEach(expense => {
            const date = new Date(expense.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + expense.amount;
        });
        
        return monthlyData;
    }
    
    findPeakSpendingDay(dailySpending) {
        let maxAmount = 0;
        let peakDate = null;
        
        Object.entries(dailySpending).forEach(([date, amount]) => {
            if (amount > maxAmount) {
                maxAmount = amount;
                peakDate = date;
            }
        });
        
        return {
            date: peakDate,
            amount: maxAmount,
            dayOfWeek: peakDate ? new Date(peakDate).toLocaleDateString('en-US', { weekday: 'long' }) : null
        };
    }
    
    analyzeSpendingPatterns(expenses) {
        const dayOfWeekSpending = {};
        const timeOfDaySpending = {};
        
        expenses.forEach(expense => {
            const date = new Date(expense.date);
            const dayOfWeek = date.getDay();
            const hour = date.getHours();
            
            dayOfWeekSpending[dayOfWeek] = (dayOfWeekSpending[dayOfWeek] || 0) + expense.amount;
            
            const timeSlot = Math.floor(hour / 4); // 6 time slots per day
            timeOfDaySpending[timeSlot] = (timeOfDaySpending[timeSlot] || 0) + expense.amount;
        });
        
        return {
            dayOfWeekSpending,
            timeOfDaySpending,
            mostActiveDay: this.getMostActiveDay(dayOfWeekSpending),
            mostActiveTime: this.getMostActiveTime(timeOfDaySpending)
        };
    }
    
    calculateBudgetPerformance(categoryTotals) {
        // Mock budget data - in real app this would come from user settings
        const mockBudgets = {
            food: 5000,
            transportation: 2000,
            entertainment: 3000,
            healthcare: 1500,
            shopping: 4000,
            utilities: 2500,
            education: 1000,
            other: 2000
        };
        
        const performance = {};
        let totalBudget = 0;
        let totalSpent = 0;
        let categoriesOnTrack = 0;
        
        Object.entries(mockBudgets).forEach(([category, budget]) => {
            const spent = categoryTotals[category] || 0;
            const utilization = budget > 0 ? (spent / budget) * 100 : 0;
            
            performance[category] = {
                budget,
                spent,
                remaining: Math.max(0, budget - spent),
                utilization,
                status: utilization <= 80 ? 'good' : utilization <= 100 ? 'warning' : 'over'
            };
            
            totalBudget += budget;
            totalSpent += spent;
            
            if (utilization <= 100) categoriesOnTrack++;
        });
        
        return {
            categories: performance,
            overall: {
                totalBudget,
                totalSpent,
                utilization: (totalSpent / totalBudget) * 100,
                categoriesOnTrack,
                totalCategories: Object.keys(mockBudgets).length
            }
        };
    }
    
    calculateFinancialHealthScore(expenses, totalSpent) {
        // Mock income for calculation - in real app this would come from user input
        const mockMonthlyIncome = 25000;
        const daysInPeriod = this.timeframe;
        const projectedMonthlySpending = (totalSpent / daysInPeriod) * 30;
        
        // Calculate component scores
        const spendingRatio = Math.min(100, (1 - (projectedMonthlySpending / mockMonthlyIncome)) * 100);
        const budgetAdherence = 72; // From budget performance
        const savingsRate = Math.max(0, ((mockMonthlyIncome - projectedMonthlySpending) / mockMonthlyIncome) * 100);
        const spendingConsistency = this.calculateSpendingConsistency(expenses);
        
        // Weighted average
        const healthScore = Math.round(
            (spendingRatio * 0.3) +
            (budgetAdherence * 0.25) +
            (savingsRate * 0.25) +
            (spendingConsistency * 0.2)
        );
        
        return {
            overall: healthScore,
            components: {
                spendingControl: Math.round(spendingRatio),
                budgetAdherence: Math.round(budgetAdherence),
                savingsRate: Math.round(savingsRate),
                consistency: Math.round(spendingConsistency)
            },
            projectedMonthlySpending,
            savingsProjection: mockMonthlyIncome - projectedMonthlySpending
        };
    }
    
    calculateSpendingConsistency(expenses) {
        if (expenses.length < 7) return 50; // Not enough data
        
        const dailyAmounts = Object.values(this.calculateDailySpending(expenses));
        const mean = dailyAmounts.reduce((a, b) => a + b, 0) / dailyAmounts.length;
        const variance = dailyAmounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / dailyAmounts.length;
        const stdDev = Math.sqrt(variance);
        
        // Lower standard deviation = higher consistency
        const consistency = Math.max(0, Math.min(100, 100 - (stdDev / mean) * 50));
        return consistency;
    }
    
    generatePredictions(expenses, dailySpending) {
        const dailyAmounts = Object.values(dailySpending);
        const avgDaily = dailyAmounts.reduce((a, b) => a + b, 0) / dailyAmounts.length;
        
        // Simple linear trend calculation
        const trend = this.calculateTrend(dailyAmounts);
        const nextMonthForecast = Math.round(avgDaily * 30 * (1 + trend));
        
        // Risk assessment
        const variance = this.calculateVariance(dailyAmounts);
        const riskLevel = variance > avgDaily * 0.5 ? 'high' : variance > avgDaily * 0.2 ? 'medium' : 'low';
        
        // Savings opportunity (largest category)
        const categoryTotals = this.analyticsData.metrics.categoryTotals;
        const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
        const savingsOpportunity = topCategory ? Math.round(topCategory[1] * 0.15) : 0;
        
        return {
            nextMonthForecast,
            confidence: Math.round((1 - Math.min(1, variance / avgDaily)) * 100),
            trend: trend * 100,
            riskLevel,
            savingsOpportunity: {
                amount: savingsOpportunity,
                category: topCategory ? topCategory[0] : 'entertainment'
            }
        };
    }
    
    // Chart initialization and rendering methods
    // Helper method to safely destroy existing charts
    safelyDestroyChart(chartName, canvasId) {
        // Destroy chart from our internal reference
        if (this.charts[chartName]) {
            console.log(`🗑️ Destroying existing ${chartName} chart`);
            try {
                this.charts[chartName].destroy();
            } catch (error) {
                console.warn(`⚠️ Error destroying ${chartName} chart:`, error);
            }
            this.charts[chartName] = null;
        }
        
        // Get canvas element and destroy any existing Chart.js instance
        const ctx = document.getElementById(canvasId);
        if (ctx) {
            const existingChart = Chart.getChart(ctx);
            if (existingChart) {
                console.log(`🗑️ Found existing ${chartName} chart in registry, destroying...`);
                existingChart.destroy();
            }
        }
        
        return ctx;
    }

    initializeCharts() {
        console.log('🎨 Initializing all charts...');
        this.initOverviewChart();
        this.initTrendChart();
        this.initCategoryChart();
        this.initBudgetChart();
        this.initCorrelationChart();
    }
    
    initOverviewChart() {
        console.log('🎨 Initializing overview chart...');
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js not loaded!');
            return;
        }
        
        const ctx = document.getElementById('overviewChart');
        console.log('🎨 Overview chart element:', ctx);
        if (!ctx) {
            console.error('❌ overviewChart element not found!');
            return;
        }
        
        // Properly destroy existing chart and clear canvas
        if (this.charts.overview) {
            console.log('🗑️ Destroying existing overview chart');
            try {
                this.charts.overview.destroy();
            } catch (error) {
                console.warn('⚠️ Error destroying chart:', error);
            }
            this.charts.overview = null;
        }
        
        // Get chart instance from Chart.js registry and destroy if exists
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            console.log('🗑️ Found existing chart in registry, destroying...');
            existingChart.destroy();
        }
        
        this.charts.overview = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#6366f1', '#06b6d4', '#10b981', '#f59e0b',
                        '#ef4444', '#8b5cf6', '#f97316', '#14b8a6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 10
                        }
                    }
                }
            }
        });
        
        // Update with current data
        const { categoryTotals } = this.analyticsData.metrics;
        if (Object.keys(categoryTotals).length > 0) {
            const sortedCategories = Object.entries(categoryTotals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6);
            
            this.charts.overview.data.labels = sortedCategories.map(([cat]) => this.formatCategoryName(cat));
            this.charts.overview.data.datasets[0].data = sortedCategories.map(([, amount]) => amount);
        } else {
            // Show placeholder data when no expenses
            console.log('📊 No expense data, showing placeholder');
            this.charts.overview.data.labels = ['Add some expenses to see insights'];
            this.charts.overview.data.datasets[0].data = [100];
            this.charts.overview.data.datasets[0].backgroundColor = ['#e5e7eb'];
        }
        
        try {
            this.charts.overview.update();
            console.log('✅ Overview chart updated successfully');
        } catch (error) {
            console.error('❌ Failed to update overview chart:', error);
        }
    }
    
    initTrendChart() {
        const ctx = this.safelyDestroyChart('trend', 'trendsTabChart');
        if (!ctx) {
            console.warn('❌ trendsTabChart canvas element not found');
            return;
        }
        
        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Daily Spending',
                    data: [],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }
    
    initCategoryChart() {
        const ctx = this.safelyDestroyChart('category', 'categoriesTabChart');
        if (!ctx) {
            console.warn('❌ categoriesTabChart canvas element not found');
            return;
        }
        
        this.charts.category = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#6366f1', '#06b6d4', '#10b981', '#f59e0b',
                        '#ef4444', '#8b5cf6', '#f97316', '#14b8a6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    initBudgetChart() {
        const ctx = this.safelyDestroyChart('budget', 'budgetTabChart');
        if (!ctx) {
            console.warn('❌ budgetTabChart canvas element not found');
            return;
        }
        
        this.charts.budget = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Spent',
                    data: [],
                    backgroundColor: '#6366f1'
                }, {
                    label: 'Budget',
                    data: [],
                    backgroundColor: '#e2e8f0'
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
                }
            }
        });
    }
    
    renderAnalytics() {
        if (!this.analyticsData.metrics) return;
        
        // Render overview by default
        this.renderOverviewTab();
    }
    
    renderOverviewTab() {
        // Ensure metrics exist before trying to use them
        if (!this.analyticsData.metrics) {
            console.error('❌ Analytics metrics not available, calculating now...');
            this.calculateMetrics();
            if (!this.analyticsData.metrics) {
                console.error('❌ Failed to calculate metrics, using empty metrics');
                this.analyticsData.metrics = this.getEmptyMetrics();
            }
        }
        
        const { totalSpent, avgDaily, categoryTotals, transactionCount } = this.analyticsData.metrics;
        
        // Update overview metrics
        const elements = {
            overviewTotalSpent: totalSpent || 0,
            overviewDailyAvg: Math.round(avgDaily || 0),
            overviewTransactions: transactionCount || 0
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            console.log(`🎯 Trying to update ${id} with value ${value}, element found:`, !!element);
            if (element) {
                if (id.includes('Spent') || id.includes('Avg')) {
                    element.textContent = '₹' + value.toLocaleString();
                } else {
                    element.textContent = value;
                }
                element.style.color = 'blue'; // Visual indicator
                console.log(`✅ Updated ${id} successfully`);
            } else {
                console.error(`❌ Element ${id} not found in DOM`);
            }
        });
        
        // Update top category
        const topCategoryElement = document.getElementById('overviewTopCategory');
        if (topCategoryElement && Object.keys(categoryTotals).length > 0) {
            const topCategory = Object.entries(categoryTotals)
                .sort((a, b) => b[1] - a[1])[0];
            topCategoryElement.textContent = this.formatCategoryName(topCategory[0]);
        }
        
        // Initialize overview chart
        this.initOverviewChart();
        
        // Update highlights
        this.updateOverviewHighlights();
    }
    
    renderTrendsTab() {
        this.renderTrendAnalytics();
    }
    
    renderCategoriesTab() {
        this.renderCategoryAnalytics();
    }
    
    renderBudgetTab() {
        this.renderBudgetAnalytics();
        this.renderBudgetDetails();
    }
    
    renderHealthTab() {
        this.renderHealthScore();
        this.renderHealthRecommendations();
    }
    
    renderPredictionsTab() {
        this.renderPredictions();
    }
    
    renderPatternsTab() {
        this.renderPatterns();
        this.renderCorrelationChart();
        this.detectAnomalies();
    }
    
    renderInsightsTab() {
        try {
            console.log('🔄 Rendering insights...');
            this.generateActionableInsights();
            console.log('✅ Insights rendered successfully');
        } catch (error) {
            console.error('❌ Error rendering insights:', error);
        }
    }
    
    renderTrendAnalytics() {
        try {
            console.log('🔄 Rendering trend analytics...');
            
            // Safely get metrics with fallbacks
            const metrics = this.analyticsData.metrics || {};
            const { dailySpending = {}, avgDaily = 0, peakDay = null, predictions = null } = metrics;
            
            // Update trend chart
            if (this.charts.trend && dailySpending && Object.keys(dailySpending).length > 0) {
                const labels = Object.keys(dailySpending).sort().slice(-14); // Last 14 days
                const data = labels.map(date => dailySpending[date] || 0);
                
                this.charts.trend.data.labels = labels.map(date => {
                    try {
                        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    } catch (e) {
                        return date;
                    }
                });
                this.charts.trend.data.datasets[0].data = data;
                this.charts.trend.update();
                console.log('✅ Trend chart updated');
            } else {
                console.warn('⚠️ Trend chart not available or no data');
                // Initialize trend chart if not exists
                this.initTrendChart();
            }
            
            // Update insights with safe DOM manipulation
            const avgDailyEl = document.getElementById('avgDaily');
            const peakDayEl = document.getElementById('peakDay');
            const trendIndicatorEl = document.getElementById('trendIndicator');
            
            if (avgDailyEl) {
                avgDailyEl.textContent = '₹' + Math.round(avgDaily || 0).toLocaleString();
            }
            
            if (peakDayEl) {
                if (peakDay && peakDay.date) {
                    peakDayEl.textContent = `${peakDay.dayOfWeek || 'N/A'} (₹${Math.round(peakDay.amount || 0).toLocaleString()})`;
                } else {
                    peakDayEl.textContent = 'No data available';
                }
            }
            
            if (trendIndicatorEl && predictions) {
                const trendValue = trendIndicatorEl.querySelector('.trend-value');
                if (trendValue && predictions.trend !== undefined) {
                    const trendPercent = predictions.trend;
                    trendValue.textContent = (trendPercent >= 0 ? '+' : '') + trendPercent.toFixed(1) + '%';
                    trendValue.style.color = trendPercent >= 0 ? '#ef4444' : '#10b981';
                }
            }
            
            console.log('✅ Trend analytics rendered successfully');
        } catch (error) {
            console.error('❌ Error rendering trend analytics:', error);
        }
    }
    
    renderCategoryAnalytics() {
        try {
            console.log('🔄 Rendering category analytics...');
            
            // Safely get metrics with fallbacks
            const metrics = this.analyticsData.metrics || {};
            const { categoryTotals = {} } = metrics;
            
            if (this.charts.category && Object.keys(categoryTotals).length > 0) {
                const sortedCategories = Object.entries(categoryTotals)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8);
                
                this.charts.category.data.labels = sortedCategories.map(([cat]) => this.formatCategoryName(cat));
                this.charts.category.data.datasets[0].data = sortedCategories.map(([, amount]) => amount);
                this.charts.category.update();
                
                // Update top categories list
                this.renderTopCategories(sortedCategories);
                console.log('✅ Category analytics rendered successfully');
            } else {
                console.warn('⚠️ Category chart not available or no category data');
                // Initialize category chart if not exists
                this.initCategoryChart();
            }
        } catch (error) {
            console.error('❌ Error rendering category analytics:', error);
        }
    }
    
    renderTopCategories(sortedCategories) {
        const container = document.getElementById('topCategories');
        if (!container) return;
        
        const total = sortedCategories.reduce((sum, [, amount]) => sum + amount, 0);
        
        container.innerHTML = sortedCategories.slice(0, 5).map(([category, amount]) => {
            const percentage = ((amount / total) * 100).toFixed(1);
            return `
                <div class="category-insight-item">
                    <span>${this.formatCategoryName(category)}</span>
                    <div>
                        <span>₹${amount.toLocaleString()}</span>
                        <small style="color: #6b7280; margin-left: 0.5rem">${percentage}%</small>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    renderBudgetAnalytics() {
        try {
            console.log('🔄 Rendering budget analytics...');
            
            // Safely get metrics with fallbacks
            const metrics = this.analyticsData.metrics || {};
            const { budgetPerformance = null } = metrics;
            
            if (this.charts.budget && budgetPerformance && budgetPerformance.categories) {
                const categories = Object.keys(budgetPerformance.categories);
                const spentData = categories.map(cat => budgetPerformance.categories[cat]?.spent || 0);
                const budgetData = categories.map(cat => budgetPerformance.categories[cat]?.budget || 0);
                
                this.charts.budget.data.labels = categories.map(cat => this.formatCategoryName(cat));
                this.charts.budget.data.datasets[0].data = spentData;
                this.charts.budget.data.datasets[1].data = budgetData;
                this.charts.budget.update();
                
                // Update budget health
                const healthEl = document.getElementById('budgetHealth');
                if (healthEl && budgetPerformance.overall) {
                    const scoreEl = healthEl.querySelector('.health-score');
                    const labelEl = healthEl.querySelector('.health-label');
                    
                    if (scoreEl && labelEl) {
                        const utilization = budgetPerformance.overall.utilization || 0;
                        scoreEl.textContent = Math.round(utilization) + '%';
                        
                        if (utilization <= 80) {
                            labelEl.textContent = 'On Track';
                            labelEl.style.color = '#10b981';
                        } else if (utilization <= 100) {
                            labelEl.textContent = 'Watch Spending';
                            labelEl.style.color = '#f59e0b';
                        } else {
                            labelEl.textContent = 'Over Budget';
                            labelEl.style.color = '#ef4444';
                        }
                    }
                }
                console.log('✅ Budget analytics rendered successfully');
            } else {
                console.warn('⚠️ Budget chart not available or no budget data');
                // Initialize budget chart if not exists
                this.initBudgetChart();
            }
        } catch (error) {
            console.error('❌ Error rendering budget analytics:', error);
        }
    }
    
    renderHealthScore() {
        try {
            console.log('🔄 Rendering health score...');
            
            // Safely get metrics with fallbacks
            const metrics = this.analyticsData.metrics || {};
            const { healthScore = null } = metrics;
            
            if (healthScore) {
                const scoreEl = document.getElementById('healthScore');
                const circleEl = document.getElementById('healthScoreCircle');
                
                if (scoreEl && healthScore.overall !== undefined) {
                    scoreEl.textContent = Math.round(healthScore.overall);
                }
                
                if (circleEl && healthScore.overall !== undefined) {
                    const percentage = Math.round(healthScore.overall);
                    circleEl.style.background = `conic-gradient(#10b981 ${percentage}%, #e5e7eb ${percentage}%)`;
                }
                
                // Update health bars
                const healthItems = document.querySelectorAll('.health-item');
                const components = healthScore.components || {};
                
                healthItems.forEach((item, index) => {
                    const progressBar = item.querySelector('.health-progress');
                    const valueSpan = item.querySelector('.health-value');
                    
                    if (progressBar && valueSpan) {
                        const values = Object.values(components);
                        if (values[index] !== undefined) {
                            const value = Math.round(values[index]);
                            progressBar.style.width = value + '%';
                            valueSpan.textContent = value + '%';
                        }
                    }
                });
                
                console.log('✅ Health score rendered successfully');
            } else {
                console.warn('⚠️ No health score data available');
            }
        } catch (error) {
            console.error('❌ Error rendering health score:', error);
        }
    }
    
    renderPredictions() {
        try {
            console.log('🔄 Rendering predictions...');
            
            // Safely get metrics with fallbacks
            const metrics = this.analyticsData.metrics || {};
            const { predictions = null } = metrics;
            
            if (predictions && predictions.nextMonthForecast !== undefined) {
                const forecastEl = document.getElementById('nextMonthForecast');
                if (forecastEl) {
                    forecastEl.textContent = '₹' + Math.round(predictions.nextMonthForecast).toLocaleString();
                    console.log('✅ Updated next month forecast');
                }
                
                // Update risk level
                const predictionItems = document.querySelectorAll('.prediction-item');
                console.log(`🔍 Found ${predictionItems.length} prediction items`);
                
                if (predictionItems.length >= 2 && predictions.riskLevel) {
                    const riskValueEl = predictionItems[1].querySelector('.prediction-value');
                    if (riskValueEl) {
                        riskValueEl.textContent = predictions.riskLevel.charAt(0).toUpperCase() + predictions.riskLevel.slice(1) + ' Risk';
                        riskValueEl.className = `prediction-value risk-${predictions.riskLevel}`;
                        console.log('✅ Updated risk level');
                    }
                }
                
                // Update savings opportunity
                if (predictionItems.length >= 3 && predictions.savingsOpportunity) {
                    const savingsValueEl = predictionItems[2].querySelector('.prediction-value');
                    const savingsConfEl = predictionItems[2].querySelector('.prediction-confidence');
                    
                    if (savingsValueEl && predictions.savingsOpportunity.amount) {
                        savingsValueEl.textContent = '₹' + Math.round(predictions.savingsOpportunity.amount).toLocaleString() + '/month';
                        console.log('✅ Updated savings opportunity');
                    }
                    if (savingsConfEl && predictions.savingsOpportunity.category) {
                        savingsConfEl.textContent = 'in ' + this.formatCategoryName(predictions.savingsOpportunity.category);
                    }
                }
                
                console.log('✅ Predictions rendered successfully');
            } else {
                console.warn('⚠️ No prediction data available');
                // Generate default predictions
                this.generateDefaultPredictions();
            }
        } catch (error) {
            console.error('❌ Error rendering predictions:', error);
        }
    }
    
    renderPatterns() {
        try {
            console.log('🔄 Rendering patterns...');
            
            // Safely get metrics with fallbacks
            const metrics = this.analyticsData.metrics || {};
            const { spendingPatterns = null } = metrics;
            
            if (spendingPatterns) {
                const patternItems = document.querySelectorAll('.pattern-item');
                console.log(`🔍 Found ${patternItems.length} pattern items`);
                
                if (patternItems.length >= 1 && spendingPatterns.mostActiveDay) {
                    const peakDayEl = patternItems[0].querySelector('.pattern-value');
                    if (peakDayEl) {
                        const { day, avgAmount } = spendingPatterns.mostActiveDay;
                        peakDayEl.textContent = `${day} (₹${Math.round(avgAmount || 0).toLocaleString()} avg)`;
                        console.log('✅ Updated most active day');
                    }
                }
                
                // Update peak time if available
                if (patternItems.length >= 2 && spendingPatterns.mostActiveTime) {
                    const peakTimeEl = patternItems[1].querySelector('.pattern-value');
                    if (peakTimeEl) {
                        const { time, avgAmount } = spendingPatterns.mostActiveTime;
                        peakTimeEl.textContent = `${time} (₹${Math.round(avgAmount || 0).toLocaleString()} avg)`;
                        console.log('✅ Updated most active time');
                    }
                }
                
                console.log('✅ Patterns rendered successfully');
            } else {
                console.warn('⚠️ No pattern data available');
                // Generate default patterns
                this.generateDefaultPatterns();
            }
        } catch (error) {
            console.error('❌ Error rendering patterns:', error);
        }
    }
    
    // Utility methods
    switchCategoryView(view) {
        if (!this.charts.category) return;
        
        this.charts.category.config.type = view === 'pie' ? 'pie' : 'bar';
        this.charts.category.update();
    }
    
    renderCorrelationChart() {
        // Implementation for correlation analysis
        console.log('Rendering correlation chart...');
    }
    
    detectAnomalies() {
        const { dailySpending } = this.analyticsData.metrics;
        const amounts = Object.values(dailySpending);
        const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const stdDev = Math.sqrt(amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length);
        
        const anomalies = [];
        Object.entries(dailySpending).forEach(([date, amount]) => {
            if (Math.abs(amount - mean) > stdDev * 2) {
                anomalies.push({
                    date,
                    amount,
                    type: amount > mean ? 'spike' : 'drop',
                    severity: Math.abs(amount - mean) / stdDev
                });
            }
        });
        
        const anomalyContainer = document.getElementById('anomalyList');
        if (anomalyContainer) {
            if (anomalies.length === 0) {
                anomalyContainer.innerHTML = '<div class="anomaly-item">No significant anomalies detected in your spending patterns.</div>';
            } else {
                anomalyContainer.innerHTML = anomalies.map(anomaly => `
                    <div class="anomaly-item">
                        <strong>${anomaly.type === 'spike' ? '📈' : '📉'} ${anomaly.type === 'spike' ? 'Spending Spike' : 'Spending Drop'}</strong>
                        <div>₹${Math.round(anomaly.amount).toLocaleString()} on ${new Date(anomaly.date).toLocaleDateString()}</div>
                        <small>${Math.round((anomaly.severity - 2) * 50)}% ${anomaly.type === 'spike' ? 'above' : 'below'} normal</small>
                    </div>
                `).join('');
            }
        }
    }
    
    refreshAnalytics() {
        console.log('🔄 Refreshing analytics...');
        this.loadAnalyticsData();
        this.calculateMetrics();
        this.renderAnalytics();
        
        // Show refresh animation
        const refreshBtn = document.getElementById('refreshAnalytics');
        if (refreshBtn) {
            refreshBtn.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                refreshBtn.style.transform = 'rotate(0deg)';
            }, 500);
        }
    }
    
    // Helper methods
    getEmptyMetrics() {
        return {
            totalSpent: 0,
            avgDaily: 0,
            categoryTotals: {},
            dailySpending: {},
            peakDay: { date: null, amount: 0 },
            spendingPatterns: { mostActiveDay: null, mostActiveTime: 'N/A' },
            budgetPerformance: null,
            healthScore: { overall: 0, components: {} },
            predictions: { nextMonthForecast: 0, riskLevel: 'low' }
        };
    }
    
    formatCategoryName(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
    
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }
    
    getMostActiveDay(dayOfWeekSpending) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        let maxDay = 0;
        let maxAmount = 0;
        
        Object.entries(dayOfWeekSpending).forEach(([day, amount]) => {
            if (amount > maxAmount) {
                maxAmount = amount;
                maxDay = parseInt(day);
            }
        });
        
        return {
            day: days[maxDay],
            avgAmount: maxAmount
        };
    }
    
    getMostActiveTime(timeOfDaySpending) {
        const timeSlots = ['12-4 AM', '4-8 AM', '8-12 PM', '12-4 PM', '4-8 PM', '8-12 AM'];
        let maxSlot = 0;
        let maxAmount = 0;
        
        Object.entries(timeOfDaySpending).forEach(([slot, amount]) => {
            if (amount > maxAmount) {
                maxAmount = amount;
                maxSlot = parseInt(slot);
            }
        });
        
        return timeSlots[maxSlot] || 'N/A';
    }
    
    calculateTrend(values) {
        if (values.length < 2) return 0;
        
        const n = values.length;
        const sumX = (n * (n + 1)) / 2;
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((sum, y, x) => sum + (x + 1) * y, 0);
        const sumXX = (n * (n + 1) * (2 * n + 1)) / 6;
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const avgY = sumY / n;
        
        return avgY > 0 ? slope / avgY : 0;
    }
    
    calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    }
    
    // New methods for tabbed interface
    updateOverviewHighlights() {
        const { totalSpent, predictions, budgetPerformance } = this.analyticsData.metrics;
        
        const highlights = [
            `Spent ₹${Math.round(totalSpent).toLocaleString()} in ${this.timeframe} days`,
            predictions ? `${predictions.trend > 0 ? 'Increasing' : 'Decreasing'} trend detected` : 'No trend data',
            budgetPerformance ? `${Math.round(budgetPerformance.overall.utilization)}% of budget used` : 'Budget tracking available'
        ];
        
        highlights.forEach((highlight, index) => {
            const element = document.getElementById(`overviewHighlight${index + 1}`);
            if (element) element.textContent = highlight;
        });
    }
    
    switchTrendView(view) {
        // Implementation for different trend views (daily, weekly, monthly)
        console.log(`Switching to ${view} trend view`);
        this.renderTrendAnalytics();
    }
    
    renderBudgetDetails() {
        const { budgetPerformance } = this.analyticsData.metrics;
        const container = document.getElementById('budgetDetailsList');
        
        if (!container || !budgetPerformance) return;
        
        container.innerHTML = Object.entries(budgetPerformance.categories)
            .map(([category, data]) => `
                <div class="budget-item">
                    <div>
                        <strong>${this.formatCategoryName(category)}</strong>
                        <div style="font-size: 0.8rem; color: #6b7280;">
                            ₹${data.spent.toLocaleString()} / ₹${data.budget.toLocaleString()}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600; color: ${data.status === 'good' ? '#10b981' : data.status === 'warning' ? '#f59e0b' : '#ef4444'}">
                            ${Math.round(data.utilization)}%
                        </div>
                        <div style="font-size: 0.8rem; color: #6b7280;">
                            ${data.status === 'good' ? 'On track' : data.status === 'warning' ? 'Watch spending' : 'Over budget'}
                        </div>
                    </div>
                </div>
            `).join('');
    }
    
    renderHealthRecommendations() {
        const { healthScore } = this.analyticsData.metrics;
        const container = document.getElementById('healthRecommendations');
        
        if (!container || !healthScore) return;
        
        const recommendations = this.generateHealthRecommendations(healthScore);
        container.innerHTML = recommendations.map(rec => `
            <div class="insight-list-item">
                <h5>${rec.title}</h5>
                <p>${rec.description}</p>
            </div>
        `).join('');
    }
    
    generateHealthRecommendations(healthScore) {
        const recommendations = [];
        const { components } = healthScore;
        
        if (components.spendingControl < 70) {
            recommendations.push({
                title: '🎯 Improve Spending Control',
                description: 'Consider setting daily spending limits and using budgeting apps to track expenses in real-time.'
            });
        }
        
        if (components.budgetAdherence < 75) {
            recommendations.push({
                title: '📊 Better Budget Planning',
                description: 'Review your budget categories and adjust them based on actual spending patterns.'
            });
        }
        
        if (components.savingsRate < 60) {
            recommendations.push({
                title: '💰 Increase Savings Rate',
                description: 'Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings and debt repayment.'
            });
        }
        
        return recommendations;
    }
    
    initCorrelationChart() {
        const ctx = this.safelyDestroyChart('correlation', 'patternsCorrelationChart');
        if (!ctx) {
            console.warn('❌ patternsCorrelationChart canvas element not found');
            return;
        }
        
        this.charts.correlation = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: 'Day of Month' } },
                    y: { title: { display: true, text: 'Amount (₹)' } }
                }
            }
        });
    }
    
    generateActionableInsights() {
        const { categoryTotals, predictions, budgetPerformance, spendingPatterns } = this.analyticsData.metrics;
        
        // Generate insights for each category
        const optimizationInsights = this.generateOptimizationInsights(categoryTotals, predictions);
        const riskAlerts = this.generateRiskAlerts(budgetPerformance, predictions);
        const savingsTips = this.generateSavingsTips(categoryTotals, spendingPatterns);
        const growthRecommendations = this.generateGrowthRecommendations();
        
        // Render insights
        this.renderInsightsList('optimizationInsights', optimizationInsights);
        this.renderInsightsList('riskAlerts', riskAlerts);
        this.renderInsightsList('savingsTips', savingsTips);
        this.renderInsightsList('growthRecommendations', growthRecommendations);
    }
    
    generateOptimizationInsights(categoryTotals, predictions) {
        const insights = [];
        
        if (predictions && predictions.savingsOpportunity) {
            insights.push({
                title: `Optimize ${this.formatCategoryName(predictions.savingsOpportunity.category)} Spending`,
                description: `You could save ₹${predictions.savingsOpportunity.amount.toLocaleString()} per month by reducing spending in this category.`
            });
        }
        
        const topCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
        if (topCategories.length > 0) {
            insights.push({
                title: 'Review Top Spending Category',
                description: `${this.formatCategoryName(topCategories[0][0])} represents your highest expense. Consider if all purchases are necessary.`
            });
        }
        
        return insights;
    }
    
    generateRiskAlerts(budgetPerformance, predictions) {
        const alerts = [];
        
        if (predictions && predictions.riskLevel === 'high') {
            alerts.push({
                title: 'High Spending Risk Detected',
                description: 'Your spending patterns show high variability. Consider creating more structured budgets.'
            });
        }
        
        if (budgetPerformance) {
            const overBudgetCategories = Object.entries(budgetPerformance.categories)
                .filter(([, data]) => data.utilization > 100);
            
            if (overBudgetCategories.length > 0) {
                alerts.push({
                    title: 'Budget Exceeded',
                    description: `You've exceeded budget in ${overBudgetCategories.length} categories. Review and adjust spending.`
                });
            }
        }
        
        return alerts;
    }
    
    generateSavingsTips(categoryTotals, spendingPatterns) {
        const tips = [];
        
        if (spendingPatterns && spendingPatterns.mostActiveDay) {
            tips.push({
                title: 'Weekend Spending Awareness',
                description: `You tend to spend more on ${spendingPatterns.mostActiveDay.day}. Plan weekend budgets in advance.`
            });
        }
        
        tips.push({
            title: 'Track Small Expenses',
            description: 'Small daily expenses add up. Track coffee, snacks, and transport costs for potential savings.'
        });
        
        tips.push({
            title: 'Use the 24-Hour Rule',
            description: 'Wait 24 hours before making non-essential purchases over ₹1000.'
        });
        
        return tips;
    }
    
    generateGrowthRecommendations() {
        return [
            {
                title: 'Emergency Fund Goal',
                description: 'Build an emergency fund covering 3-6 months of expenses for financial security.'
            },
            {
                title: 'Investment Planning',
                description: 'Consider starting systematic investments after establishing your emergency fund.'
            },
            {
                title: 'Expense Tracking Habit',
                description: 'Maintain daily expense logging for better financial awareness and control.'
            }
        ];
    }
    
    renderInsightsList(containerId, insights) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (insights.length === 0) {
            container.innerHTML = '<div class="insight-list-item"><p>No specific insights available for this category.</p></div>';
            return;
        }
        
        container.innerHTML = insights.map(insight => `
            <div class="insight-list-item">
                <h5>${insight.title}</h5>
                <p>${insight.description}</p>
            </div>
        `).join('');
    }
    
    generateDefaultPredictions() {
        console.log('🔄 Generating default predictions...');
        
        // Calculate simple predictions based on current data
        const expenses = this.analyticsData.expenses || [];
        
        if (expenses.length > 0) {
            const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
            const avgDaily = totalSpent / Math.max(this.timeframe, 1);
            const nextMonthForecast = avgDaily * 30;
            
            // Update forecast element
            const forecastEl = document.getElementById('nextMonthForecast');
            if (forecastEl) {
                forecastEl.textContent = '₹' + Math.round(nextMonthForecast).toLocaleString();
            }
            
            // Set default risk level
            const predictionItems = document.querySelectorAll('.prediction-item');
            if (predictionItems.length >= 2) {
                const riskValueEl = predictionItems[1].querySelector('.prediction-value');
                if (riskValueEl) {
                    const riskLevel = nextMonthForecast > avgDaily * 35 ? 'high' : nextMonthForecast > avgDaily * 25 ? 'medium' : 'low';
                    riskValueEl.textContent = riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1) + ' Risk';
                    riskValueEl.className = `prediction-value risk-${riskLevel}`;
                }
            }
        }
    }
    
    generateDefaultPatterns() {
        console.log('🔄 Generating default patterns...');
        
        const expenses = this.analyticsData.expenses || [];
        
        if (expenses.length > 0) {
            // Calculate most active day
            const daySpending = {};
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            
            expenses.forEach(exp => {
                const date = new Date(exp.date);
                const dayName = dayNames[date.getDay()];
                daySpending[dayName] = (daySpending[dayName] || []);
                daySpending[dayName].push(exp.amount);
            });
            
            // Find day with most activity
            let mostActiveDay = null;
            let maxAvg = 0;
            
            Object.entries(daySpending).forEach(([day, amounts]) => {
                const avg = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
                if (avg > maxAvg) {
                    maxAvg = avg;
                    mostActiveDay = { day, avgAmount: avg };
                }
            });
            
            // Update pattern elements
            const patternItems = document.querySelectorAll('.pattern-item');
            if (patternItems.length >= 1 && mostActiveDay) {
                const peakDayEl = patternItems[0].querySelector('.pattern-value');
                if (peakDayEl) {
                    peakDayEl.textContent = `${mostActiveDay.day} (₹${Math.round(mostActiveDay.avgAmount).toLocaleString()} avg)`;
                }
            }
            
            // Set default peak time
            if (patternItems.length >= 2) {
                const peakTimeEl = patternItems[1].querySelector('.pattern-value');
                if (peakTimeEl) {
                    peakTimeEl.textContent = `Evening (₹${Math.round(maxAvg * 0.7).toLocaleString()} avg)`;
                }
            }
        }
    }
}

// Initialize analytics when dashboard is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.dashboard && window.dashboard.expenses) {
            window.analytics = new FinancialAnalytics(window.dashboard);
            console.log('📊 Financial Analytics initialized');
        }
    }, 2000);
});
