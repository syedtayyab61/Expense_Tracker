// Personal Finance Dashboard JavaScript

class FinanceDashboard {
    constructor() {
        this.loadExpenses();
        this.categories = {
            food: { name: '🍕 Food & Dining', color: '#ef4444' },
            transport: { name: '🚗 Transportation', color: '#06b6d4' },
            entertainment: { name: '🎬 Entertainment', color: '#8b5cf6' },
            shopping: { name: '🛒 Shopping', color: '#10b981' },
            bills: { name: '📄 Bills & Utilities', color: '#f59e0b' },
            healthcare: { name: '🏥 Healthcare', color: '#ec4899' },
            education: { name: '📚 Education', color: '#6366f1' },
            other: { name: '🔧 Other', color: '#64748b' }
        };
        
        this.charts = {
            trend: null,
            category: null
        };
        
        this.init();
    }
    
    loadExpenses() {
        this.expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        console.log(`📊 Dashboard loaded ${this.expenses.length} expenses`);
    }

    init() {
        // Check authentication (but don't redirect to login if missing - allow demo mode)
        this.checkAuthentication();
        this.setupEventListeners();
        this.setCurrentDate();
        this.updateDashboard();
        this.initializeCharts();
    }
    
    checkAuthentication() {
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        const authToken = localStorage.getItem('authToken');
        const demoUser = localStorage.getItem('demoUser');
        
        console.log('Checking authentication:', { isAuthenticated, authToken: authToken ? 'present' : 'none', demoUser: demoUser ? 'present' : 'none' });
        
        // Allow access if any authentication method is present
        if (isAuthenticated || authToken || demoUser) {
            console.log('✅ Authentication verified - user can access dashboard');
            return true;
        } else {
            console.log('⚠️ No authentication found - but allowing demo access');
            // Don't redirect - allow demo access
            return false;
        }
    }
    
    setupEventListeners() {
        // Show user info
        this.showUserInfo();
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
        
        // Delete account button
        const deleteAccountBtn = document.getElementById('deleteAccountBtn');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => {
                this.showDeleteAccountConfirmation();
            });
        }

        // Debug analytics button
        const debugAnalyticsBtn = document.getElementById('debugAnalyticsBtn');
        if (debugAnalyticsBtn) {
            debugAnalyticsBtn.addEventListener('click', () => {
                this.runAnalyticsDebug();
            });
        }
        
        // Form submission
        document.getElementById('expenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExpense();
        });
        
        // Sample data button
        const loadSampleDataBtn = document.getElementById('loadSampleData');
        if (loadSampleDataBtn) {
            loadSampleDataBtn.addEventListener('click', () => {
                this.loadSampleData();
            });
        }
        
        // Filter by category
        document.getElementById('filterCategory').addEventListener('change', (e) => {
            this.filterTransactions(e.target.value);
        });
        
        // Clear all data
        document.getElementById('clearData').addEventListener('click', () => {
            this.clearAllData();
        });
        
        // Set default date to today
        document.getElementById('date').valueAsDate = new Date();
    }

    runAnalyticsDebug() {
        console.log('🔧 Running analytics debug from dashboard...');
        
        // Create a results display area
        let resultsDiv = document.getElementById('debugResults');
        if (!resultsDiv) {
            resultsDiv = document.createElement('div');
            resultsDiv.id = 'debugResults';
            resultsDiv.style.cssText = `
                position: fixed; top: 80px; right: 20px; 
                background: white; border: 2px solid #4285f4; 
                border-radius: 8px; padding: 15px; 
                max-width: 400px; max-height: 300px; 
                overflow-y: auto; z-index: 1000; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                font-family: monospace; font-size: 12px;
            `;
            document.body.appendChild(resultsDiv);
            
            // Add close button
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '✖ Close';
            closeBtn.style.cssText = 'float: right; background: #ea4335; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer;';
            closeBtn.onclick = () => resultsDiv.remove();
            resultsDiv.appendChild(closeBtn);
            
            const title = document.createElement('h3');
            title.textContent = '🔧 Analytics Debug Results';
            title.style.margin = '0 0 10px 0';
            resultsDiv.appendChild(title);
        }
        
        const addResult = (text, color = '#333') => {
            const p = document.createElement('p');
            p.innerHTML = text;
            p.style.color = color;
            p.style.margin = '5px 0';
            resultsDiv.appendChild(p);
        };
        
        // Run the actual test
        if (typeof testAnalyticsComponents === 'function') {
            addResult('✅ testAnalyticsComponents function found', 'green');
            try {
                const result = testAnalyticsComponents();
                addResult(`Result: ${result}`, 'blue');
                addResult('📊 Check browser console for detailed output', 'orange');
            } catch (error) {
                addResult(`❌ Error: ${error.message}`, 'red');
            }
        } else {
            addResult('❌ testAnalyticsComponents function not found', 'red');
        }
        
        // Additional quick checks
        addResult(`Dashboard object: ${this ? '✅' : '❌'}`, this ? 'green' : 'red');
        addResult(`SimpleAnalytics object: ${window.simpleAnalytics ? '✅' : '❌'}`, window.simpleAnalytics ? 'green' : 'red');
        addResult(`Chart.js: ${typeof Chart !== 'undefined' ? '✅' : '❌'}`, typeof Chart !== 'undefined' ? 'green' : 'red');
        
        const tabs = document.querySelectorAll('.analytics-tab');
        addResult(`Analytics tabs: ${tabs.length} found`, tabs.length > 0 ? 'green' : 'red');
        
        const expenses = this.expenses || [];
        addResult(`Expenses: ${expenses.length} loaded`, expenses.length > 0 ? 'green' : 'orange');
    }
    
    showUserInfo() {
        const userEmailEl = document.getElementById('userEmail');
        
        if (userEmailEl) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const demoUser = JSON.parse(localStorage.getItem('demoUser') || '{}');
            const email = user.email || demoUser.email || 'Demo User';
            
            // Update email without avatar
            userEmailEl.textContent = email;
            
            // Add a subtle animation for user info load
            const userInfoContainer = document.getElementById('userInfoContainer');
            if (userInfoContainer) {
                userInfoContainer.style.opacity = '0';
                userInfoContainer.style.transform = 'translateY(10px)';
                
                setTimeout(() => {
                    userInfoContainer.style.transition = 'all 0.4s ease';
                    userInfoContainer.style.opacity = '1';
                    userInfoContainer.style.transform = 'translateY(0)';
                }, 100);
            }
            
            console.log('✅ User info displayed:', { email });
        }
    }
    
    logout() {
        console.log('Enhanced logout initiated...');
        this.showLogoutConfirmation();
    }
    
    showLogoutConfirmation() {
        // Create modal if it doesn't exist
        if (!document.getElementById('logoutModal')) {
            this.createLogoutModal();
        }
        
        const modal = document.getElementById('logoutModal');
        modal.classList.add('show');
        
        // Add escape key listener
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.hideLogoutModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
    
    createLogoutModal() {
        const modal = document.createElement('div');
        modal.id = 'logoutModal';
        modal.className = 'logout-modal';
        modal.innerHTML = `
            <div class="logout-modal-content">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🚪</div>
                <h3>Confirm Logout</h3>
                <p>Are you sure you want to sign out? Any unsaved changes will be lost.</p>
                <div class="logout-modal-actions">
                    <button class="modal-btn cancel" onclick="dashboard.hideLogoutModal()">
                        Cancel
                    </button>
                    <button class="modal-btn confirm" onclick="dashboard.performLogout()">
                        Sign Out
                    </button>
                </div>
            </div>
        `;
        
        // Close modal on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideLogoutModal();
            }
        });
        
        document.body.appendChild(modal);
    }
    
    hideLogoutModal() {
        const modal = document.getElementById('logoutModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    performLogout() {
        console.log('Performing enhanced logout...');
        
        // Hide modal first
        this.hideLogoutModal();
        
        // Add loading state to logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.classList.add('logging-out');
            logoutBtn.textContent = 'Signing Out...';
        }
        
        // Show logout animation/notification
        this.showLogoutNotification();
        
        // Perform logout after animation
        setTimeout(() => {
            // Clear all authentication data
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            localStorage.removeItem('demoUser');
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('expenses');
            localStorage.removeItem('loginSuccess');
            
            console.log('✅ All user data cleared');
            
            // Redirect to login page
            window.location.href = 'login-fixed.html';
        }, 2000);
    }
    
    showLogoutNotification() {
        // Create floating notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
            z-index: 1001;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            animation: slideInRight 0.4s ease-out;
            min-width: 280px;
        `;
        
        notification.innerHTML = `
            <span style="font-size: 1.2rem;">👋</span>
            <div>
                <div style="font-size: 0.95rem;">Signing you out...</div>
                <div style="font-size: 0.8rem; opacity: 0.9; margin-top: 0.25rem;">Thanks for using Finance Tracker!</div>
            </div>
        `;
        
        // Add slide in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Remove notification after animation
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.style.animation = 'slideInRight 0.4s ease-out reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 400);
            }
        }, 1500);
    }
    
    showDeleteAccountConfirmation() {
        console.log('Showing delete account confirmation...');
        
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'deleteAccountModal';
        modalOverlay.className = 'modal-overlay show';
        
        modalOverlay.innerHTML = `
            <div class="modal-content delete-account-modal">
                <div class="modal-header">
                    <h2 style="color: #dc2626; display: flex; align-items: center; gap: 0.5rem;">
                        ⚠️ Delete Account
                    </h2>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 1rem; color: #374151;">
                        <strong>Warning:</strong> This action cannot be undone. Deleting your account will:
                    </p>
                    <ul style="color: #6b7280; margin: 1rem 0; padding-left: 1.5rem;">
                        <li>Permanently delete all your expense data</li>
                        <li>Remove your account and login credentials</li>
                        <li>Clear all saved preferences and settings</li>
                        <li>Cancel any active subscriptions</li>
                    </ul>
                    <p style="margin-top: 1.5rem; color: #dc2626; font-weight: 600;">
                        Are you absolutely sure you want to delete your account?
                    </p>
                </div>
                <div class="modal-actions">
                    <button class="modal-btn cancel" onclick="dashboard.hideDeleteAccountModal()">
                        Cancel
                    </button>
                    <button class="modal-btn delete-confirm" onclick="dashboard.performDeleteAccount()">
                        Yes, Delete Account
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalOverlay);
        
        // Add delete modal specific styles
        const style = document.createElement('style');
        style.textContent = `
            .delete-account-modal {
                border-top: 4px solid #dc2626 !important;
            }
            .modal-btn.delete-confirm {
                background: linear-gradient(135deg, #dc2626, #b91c1c);
                color: white;
            }
            .modal-btn.delete-confirm:hover {
                background: linear-gradient(135deg, #b91c1c, #991b1b);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
            }
        `;
        document.head.appendChild(style);
    }
    
    hideDeleteAccountModal() {
        const modal = document.getElementById('deleteAccountModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    }
    
    performDeleteAccount() {
        console.log('Performing account deletion...');
        
        // Hide modal first
        this.hideDeleteAccountModal();
        
        // Add loading state to delete button
        const deleteBtn = document.getElementById('deleteAccountBtn');
        if (deleteBtn) {
            deleteBtn.classList.add('deleting');
            deleteBtn.innerHTML = '<span class="delete-text">Deleting...</span>';
        }
        
        // Show deletion notification
        this.showDeleteAccountNotification();
        
        // Perform deletion after animation
        setTimeout(() => {
            // Clear ALL data more thoroughly
            localStorage.clear();
            sessionStorage.clear();
            
            // Clear IndexedDB if used
            if ('indexedDB' in window) {
                indexedDB.deleteDatabase('FinanceTracker');
            }
            
            // Clear any cookies
            document.cookie.split(";").forEach(function(c) { 
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            });
            
            console.log('✅ Account and all data permanently deleted');
            
            // Redirect to a goodbye page or login
            alert('Your account has been permanently deleted. You will be redirected to the login page.');
            window.location.href = 'login-fixed.html';
        }, 3000);
    }
    
    showDeleteAccountNotification() {
        // Create floating notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(220, 38, 38, 0.4);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            animation: slideInRight 0.4s ease-out;
            min-width: 280px;
        `;
        
        notification.innerHTML = `
            <span style="font-size: 1.2rem;">🗑️</span>
            <div>
                <div style="font-size: 0.95rem;">Deleting your account...</div>
                <div style="font-size: 0.8rem; opacity: 0.9; margin-top: 0.25rem;">This process cannot be undone</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after animation
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.style.animation = 'slideInRight 0.4s ease-out reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 400);
            }
        }, 2500);
    }
    
    setCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
    }
    
    addExpense() {
        const form = document.getElementById('expenseForm');
        const formData = new FormData(form);
        
        const expense = {
            id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            amount: parseFloat(formData.get('amount')),
            category: formData.get('category'),
            description: formData.get('description'),
            date: formData.get('date'),
            timestamp: new Date().toISOString()
        };
        
        // Debug logging
        console.log('💰 Adding expense:', expense);
        console.log('💰 Current expenses count before adding:', this.expenses.length);
        
        // Validate expense
        if (!this.validateExpense(expense)) {
            console.error('❌ Expense validation failed');
            return;
        }
        
        this.expenses.unshift(expense);
        console.log('💰 Expenses count after adding:', this.expenses.length);
        
        this.saveExpenses();
        console.log('💰 Expense saved to localStorage');
        
        // Verify it was saved
        const savedExpenses = JSON.parse(localStorage.getItem('expenses')) || [];
        console.log('💰 Verified saved expenses count:', savedExpenses.length);
        
        this.updateDashboard();
        this.updateCharts();
        form.reset();
        document.getElementById('date').valueAsDate = new Date();
        
        // Refresh analytics if available
        if (window.simpleAnalytics) {
            // Refresh analytics data and re-render current tab
            setTimeout(() => {
                window.simpleAnalytics.loadExpenseData();
                if (window.bulletproofTabs) {
                    const currentTab = window.bulletproofTabs.currentTab;
                    window.bulletproofTabs.renderTabContent(currentTab);
                }
            }, 100);
        }
        
        // Show success feedback
        this.showNotification('Expense added successfully!', 'success');
    }
    
    validateExpense(expense) {
        if (expense.amount <= 0) {
            this.showNotification('Amount must be greater than 0', 'error');
            return false;
        }
        
        if (!expense.category) {
            this.showNotification('Please select a category', 'error');
            return false;
        }
        
        if (!expense.description.trim()) {
            this.showNotification('Please enter a description', 'error');
            return false;
        }
        
        return true;
    }
    
    deleteExpense(id) {
        if (confirm('Are you sure you want to delete this expense?')) {
            this.expenses = this.expenses.filter(expense => expense.id !== id);
            this.saveExpenses();
            this.updateDashboard();
            this.updateCharts();
            
            // Refresh analytics if available
            if (window.simpleAnalytics) {
                // Reload fresh data and refresh analytics
                setTimeout(() => {
                    window.simpleAnalytics.loadExpenseData();
                    window.bulletproofTabs.refreshCurrentTab();
                }, 100);
            }
            
            this.showNotification('Expense deleted successfully!', 'success');
        }
    }
    
    saveExpenses() {
        localStorage.setItem('expenses', JSON.stringify(this.expenses));
    }
    
    loadSampleData() {
        // Confirm with user before loading sample data
        if (this.expenses.length > 0) {
            if (!confirm('This will add sample data to your existing expenses. Continue?')) {
                return;
            }
        }
        
        console.log('📊 Loading sample data...');
        
        // Generate realistic sample expenses for the last 3 months
        const sampleExpenses = this.generateSampleExpenses();
        
        // Add sample expenses to existing ones
        this.expenses = [...sampleExpenses, ...this.expenses];
        
        // Save to localStorage
        this.saveExpenses();
        
        // Update dashboard and charts
        this.updateDashboard();
        this.updateCharts();
        
        // Refresh analytics if available
        if (window.simpleAnalytics) {
            setTimeout(() => {
                window.simpleAnalytics.loadExpenseData();
                if (window.bulletproofTabs) {
                    const currentTab = window.bulletproofTabs.currentTab;
                    window.bulletproofTabs.renderTabContent(currentTab);
                }
            }, 100);
        }
        
        // Show success message
        this.showNotification(`Successfully loaded ${sampleExpenses.length} sample transactions!`, 'success');
        
        console.log(`📊 Sample data loaded: ${sampleExpenses.length} transactions added`);
    }
    
    generateSampleExpenses() {
        const sampleData = [];
        const categories = Object.keys(this.categories);
        const currentDate = new Date();
        
        // Sample transaction templates
        const transactionTemplates = {
            food: ['Restaurant meal', 'Grocery shopping', 'Coffee', 'Fast food', 'Food delivery', 'Lunch', 'Dinner'],
            transport: ['Gas station', 'Uber ride', 'Bus ticket', 'Taxi', 'Parking fee', 'Metro card', 'Car maintenance'],
            entertainment: ['Movie ticket', 'Concert', 'Gaming', 'Streaming service', 'Book', 'Music', 'Sports event'],
            shopping: ['Clothing', 'Electronics', 'Home goods', 'Online shopping', 'Gifts', 'Accessories', 'Shoes'],
            bills: ['Electricity bill', 'Internet bill', 'Phone bill', 'Water bill', 'Insurance', 'Rent', 'Credit card'],
            healthcare: ['Doctor visit', 'Pharmacy', 'Dental checkup', 'Medicine', 'Health insurance', 'Eye checkup'],
            education: ['Course fee', 'Books', 'Online course', 'Training', 'Certification', 'Workshop'],
            other: ['Miscellaneous', 'Emergency', 'Donation', 'Subscription', 'Service fee', 'Repair']
        };
        
        // Amount ranges for each category
        const amountRanges = {
            food: [50, 800],
            transport: [30, 500],
            entertainment: [100, 1200],
            shopping: [200, 2500],
            bills: [500, 3000],
            healthcare: [200, 1500],
            education: [300, 5000],
            other: [100, 1000]
        };
        
        // Generate 50 realistic transactions over the last 3 months
        for (let i = 0; i < 50; i++) {
            // Random date in the last 3 months
            const daysBack = Math.floor(Math.random() * 90);
            const transactionDate = new Date(currentDate);
            transactionDate.setDate(currentDate.getDate() - daysBack);
            
            // Random category
            const category = categories[Math.floor(Math.random() * categories.length)];
            
            // Random description from templates
            const descriptions = transactionTemplates[category];
            const description = descriptions[Math.floor(Math.random() * descriptions.length)];
            
            // Random amount within category range
            const [minAmount, maxAmount] = amountRanges[category];
            const amount = Math.round((Math.random() * (maxAmount - minAmount) + minAmount) / 10) * 10;
            
            const expense = {
                id: 'sample_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 9),
                amount: amount,
                category: category,
                description: description,
                date: transactionDate.toISOString().split('T')[0],
                timestamp: transactionDate.toISOString()
            };
            
            sampleData.push(expense);
        }
        
        // Sort by date (newest first)
        sampleData.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return sampleData;
    }
    
    updateDashboard() {
        this.updateSummaryCards();
        this.displayTransactions();
    }
    
    updateSummaryCards() {
        const totalExpenses = this.calculateTotalExpenses();
        const monthlyExpenses = this.calculateMonthlyExpenses();
        const predictedExpenses = this.calculatePredictedExpenses();
        const topCategory = this.getTopCategory();
        
        document.getElementById('totalExpenses').textContent = this.formatCurrency(totalExpenses);
        document.getElementById('monthlyExpenses').textContent = this.formatCurrency(monthlyExpenses);
        document.getElementById('predictedExpenses').textContent = this.formatCurrency(predictedExpenses);
        document.getElementById('topCategory').textContent = topCategory;
    }
    
    calculateTotalExpenses() {
        return this.expenses.reduce((total, expense) => total + expense.amount, 0);
    }
    
    calculateMonthlyExpenses() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        return this.expenses
            .filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate.getMonth() === currentMonth && 
                       expenseDate.getFullYear() === currentYear;
            })
            .reduce((total, expense) => total + expense.amount, 0);
    }
    
    calculatePredictedExpenses() {
        if (this.expenses.length === 0) return 0;
        
        const monthlyTotals = this.getMonthlyTotals();
        
        if (monthlyTotals.length === 0) return 0;
        if (monthlyTotals.length === 1) return monthlyTotals[0];
        
        // Simple linear regression for trend prediction
        const n = monthlyTotals.length;
        const sumX = monthlyTotals.reduce((sum, _, i) => sum + i, 0);
        const sumY = monthlyTotals.reduce((sum, val) => sum + val, 0);
        const sumXY = monthlyTotals.reduce((sum, val, i) => sum + (i * val), 0);
        const sumXX = monthlyTotals.reduce((sum, _, i) => sum + (i * i), 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        const prediction = slope * n + intercept;
        
        // Ensure prediction is not negative and apply some smoothing
        const average = sumY / n;
        const smoothedPrediction = (prediction + average) / 2;
        
        return Math.max(smoothedPrediction, 0);
    }
    
    getMonthlyTotals() {
        const monthlyData = {};
        
        this.expenses.forEach(expense => {
            const date = new Date(expense.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = 0;
            }
            monthlyData[monthKey] += expense.amount;
        });
        
        return Object.values(monthlyData);
    }
    
    getTopCategory() {
        if (this.expenses.length === 0) return 'None';
        
        const categoryTotals = {};
        
        this.expenses.forEach(expense => {
            if (!categoryTotals[expense.category]) {
                categoryTotals[expense.category] = 0;
            }
            categoryTotals[expense.category] += expense.amount;
        });
        
        const topCategory = Object.keys(categoryTotals).reduce((a, b) => 
            categoryTotals[a] > categoryTotals[b] ? a : b
        );
        
        return this.categories[topCategory]?.name || 'Unknown';
    }
    
    displayTransactions(filter = '') {
        const container = document.getElementById('transactionsList');
        
        if (this.expenses.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }
        
        const filteredExpenses = filter 
            ? this.expenses.filter(expense => expense.category === filter)
            : this.expenses;
        
        if (filteredExpenses.length === 0) {
            container.innerHTML = this.getEmptyStateHTML('No transactions found for the selected category.');
            return;
        }
        
        container.innerHTML = filteredExpenses.map(expense => 
            this.createTransactionHTML(expense)
        ).join('');
        
        // Add delete event listeners
        container.querySelectorAll('.transaction-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const expenseId = parseInt(e.target.dataset.id);
                this.deleteExpense(expenseId);
            });
        });
    }
    
    createTransactionHTML(expense) {
        const categoryInfo = this.categories[expense.category];
        const date = new Date(expense.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-description">${expense.description}</div>
                    <div class="transaction-meta">
                        <span class="transaction-date">📅 ${formattedDate}</span>
                        <span class="transaction-category">${categoryInfo?.name || expense.category}</span>
                    </div>
                </div>
                <div class="transaction-amount">-${this.formatCurrency(expense.amount)}</div>
                <button class="transaction-delete" data-id="${expense.id}" title="Delete expense">
                    ✕
                </button>
            </div>
        `;
    }
    
    getEmptyStateHTML(message = 'No expenses recorded yet. Add your first expense to get started!') {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">💸</div>
                <h3>No Transactions</h3>
                <p>${message}</p>
            </div>
        `;
    }
    
    filterTransactions(category) {
        this.displayTransactions(category);
    }
    
    clearAllData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            this.expenses = [];
            this.saveExpenses();
            this.updateDashboard();
            this.updateCharts();
            document.getElementById('filterCategory').value = '';
            this.showNotification('All data cleared successfully!', 'success');
        }
    }
    
    initializeCharts() {
        this.createTrendChart();
        this.createCategoryChart();
    }
    
    createTrendChart() {
        const ctx = document.getElementById('trendChart').getContext('2d');
        const monthlyData = this.getLastSixMonthsData();
        
        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.labels,
                datasets: [{
                    label: 'Monthly Expenses',
                    data: monthlyData.data,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6
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
                },
                elements: {
                    point: {
                        hoverRadius: 8
                    }
                }
            }
        });
    }
    
    createCategoryChart() {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        const categoryData = this.getCategoryData();
        
        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.data,
                    backgroundColor: categoryData.colors,
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
    
    getLastSixMonthsData() {
        const months = [];
        const data = [];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            
            months.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
            
            const monthTotal = this.expenses
                .filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate.getFullYear() === date.getFullYear() && 
                           expenseDate.getMonth() === date.getMonth();
                })
                .reduce((total, expense) => total + expense.amount, 0);
            
            data.push(monthTotal);
        }
        
        return { labels: months, data: data };
    }
    
    getCategoryData() {
        const categoryTotals = {};
        
        this.expenses.forEach(expense => {
            if (!categoryTotals[expense.category]) {
                categoryTotals[expense.category] = 0;
            }
            categoryTotals[expense.category] += expense.amount;
        });
        
        const sortedCategories = Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8); // Show top 8 categories
        
        return {
            labels: sortedCategories.map(([category]) => this.categories[category]?.name || category),
            data: sortedCategories.map(([,amount]) => amount),
            colors: sortedCategories.map(([category]) => this.categories[category]?.color || '#64748b')
        };
    }
    
    updateCharts() {
        // Update trend chart
        const monthlyData = this.getLastSixMonthsData();
        this.charts.trend.data.labels = monthlyData.labels;
        this.charts.trend.data.datasets[0].data = monthlyData.data;
        this.charts.trend.update();
        
        // Update category chart
        const categoryData = this.getCategoryData();
        this.charts.category.data.labels = categoryData.labels;
        this.charts.category.data.datasets[0].data = categoryData.data;
        this.charts.category.data.datasets[0].backgroundColor = categoryData.colors;
        this.charts.category.update();
    }
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    }
    
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
        `;
        
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => {
                notification.remove();
                style.remove();
            }, 300);
        }, 3000);
    }
}

// Global debug functions (available immediately)
window.testAnalyticsComponents = function() {
    console.log('=== TESTING ANALYTICS COMPONENTS ===');
    
    // Test Chart.js availability
    console.log('Chart.js available:', typeof Chart !== 'undefined');
    
    // Test analytics object
    console.log('Analytics object:', !!window.financialAnalytics);
    
    // Test analytics tabs
    const tabs = document.querySelectorAll('.analytics-tab');
    console.log(`Analytics tabs found: ${tabs.length}`);
    tabs.forEach(tab => {
        console.log(`- Tab: ${tab.textContent} (data-tab: ${tab.dataset.tab})`);
    });
    
    // Test tab content areas
    const tabContents = document.querySelectorAll('.analytics-tab-content');
    console.log(`Tab content areas found: ${tabContents.length}`);
    tabContents.forEach(content => {
        console.log(`- Content: ${content.id} (visible: ${!content.classList.contains('active') ? 'no' : 'yes'})`);
    });
    
    // Test chart elements
    const chartElements = ['overviewChart', 'trendChart', 'categoryChart', 'budgetChart'];
    chartElements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`Chart element ${id}: ${element ? 'Found' : 'NOT FOUND'}`);
    });
    
    // Try to manually trigger a tab switch
    if (window.financialAnalytics) {
        console.log('Attempting to switch to overview tab...');
        window.financialAnalytics.switchTab('overview');
    }
    
    return 'Analytics component test completed - check console for results';
};

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new FinanceDashboard();
    
    // Initialize analytics system - using SimpleAnalytics
    const initAnalytics = () => {
        if (typeof SimpleAnalytics !== 'undefined') {
            console.log('🚀 Initializing SimpleAnalytics...');
            window.simpleAnalytics = new SimpleAnalytics();
            console.log('✅ SimpleAnalytics initialized and ready');
            return true;
        }
        return false;
    };
    
    // Try multiple times with different delays
    setTimeout(initAnalytics, 1000);
    setTimeout(initAnalytics, 2000);
    setTimeout(initAnalytics, 3000);
    
    // Initialize notification system if available - with delay to ensure DOM is ready
    setTimeout(() => {
        if (typeof NotificationSystem !== 'undefined') {
            console.log('🚀 Initializing NotificationSystem...');
            // Get auth token from localStorage or use demo token
            const authToken = localStorage.getItem('authToken') || 'demo-token';
            window.notificationSystem = new NotificationSystem(authToken);
            console.log('✅ NotificationSystem initialized');
        } else {
            console.error('❌ NotificationSystem class not found');
        }
    }, 1000);
});

// Global debug functions
window.debugAnalytics = function() {
    console.log('=== ANALYTICS DEBUG ===');
    console.log('Dashboard object:', window.dashboard);
    console.log('Dashboard expenses:', window.dashboard ? window.dashboard.expenses : 'No dashboard');
    console.log('Analytics object:', window.financialAnalytics);
    console.log('LocalStorage expenses:', JSON.parse(localStorage.getItem('expenses') || '[]'));
    
    // Try to manually refresh
    if (window.dashboard) {
        window.dashboard.loadExpenses();
        console.log('Dashboard expenses reloaded:', window.dashboard.expenses.length);
    }
    
    if (window.simpleAnalytics) {
        console.log('Attempting analytics refresh...');
        window.simpleAnalytics.loadExpenseData();
        window.bulletproofTabs.refreshCurrentTab();
    }
    
    // Check key elements
    ['overviewTotalSpent', 'overviewDailyAvg', 'overviewTransactions'].forEach(id => {
        const el = document.getElementById(id);
        console.log(`Element ${id}:`, el ? el.textContent : 'NOT FOUND');
    });
};

window.addTestExpense = function() {
    const testExpense = {
        id: 'debug_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        amount: Math.floor(Math.random() * 1000) + 100,
        category: ['food', 'transport', 'entertainment'][Math.floor(Math.random() * 3)],
        description: 'Debug test expense',
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
    };
    
    if (window.dashboard) {
        console.log('Adding test expense:', testExpense);
        console.log('Dashboard expenses before:', window.dashboard.expenses.length);
        
        window.dashboard.expenses.unshift(testExpense);
        window.dashboard.saveExpenses();
        
        console.log('Dashboard expenses after:', window.dashboard.expenses.length);
        
        // Verify localStorage
        const saved = JSON.parse(localStorage.getItem('expenses')) || [];
        console.log('LocalStorage expenses after save:', saved.length);
        
        window.dashboard.updateDashboard();
        window.dashboard.updateCharts();
        
        if (window.simpleAnalytics) {
            setTimeout(() => {
                console.log('Refreshing analytics...');
                window.simpleAnalytics.loadExpenseData();
                window.bulletproofTabs.refreshCurrentTab();
            }, 200);
        }
        
        console.log('✅ Test expense added successfully:', testExpense);
        return testExpense;
    } else {
        console.error('❌ Dashboard not available');
        return null;
    }
};

window.forceInitAnalytics = function() {
    console.log('=== FORCE INITIALIZING ANALYTICS ===');
    
    if (window.dashboard && typeof SimpleAnalytics !== 'undefined') {
        // Destroy existing if it exists
        if (window.simpleAnalytics) {
            delete window.simpleAnalytics;
        }
        
        // Create new instance
        window.simpleAnalytics = new SimpleAnalytics();
        console.log('✅ SimpleAnalytics force initialized');
        
        return 'SimpleAnalytics force initialization completed';
    } else {
        console.error('❌ Cannot initialize analytics - missing dependencies');
        return 'Analytics initialization failed';
    }
};
