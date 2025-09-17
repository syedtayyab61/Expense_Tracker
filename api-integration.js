// API Integration for Personal Finance Dashboard
class FinanceAPI {
    constructor() {
        this.baseURL = 'http://localhost:5001/api';
        this.authToken = localStorage.getItem('authToken');
        this.notificationSystem = null;
        
        this.init();
    }
    
    init() {
        // Initialize notification system if authenticated
        if (this.authToken) {
            this.notificationSystem = new NotificationSystem(this.authToken);
        }
        
        // Check if user is logged in
        this.checkAuthStatus();
    }
    
    // Authentication Methods
    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.authToken = data.access_token;
                localStorage.setItem('authToken', this.authToken);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Initialize notification system
                this.notificationSystem = new NotificationSystem(this.authToken);
                
                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Connection error' };
        }
    }
    
    async register(userData) {
        try {
            const response = await fetch(`${this.baseURL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true, message: data.message };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Connection error' };
        }
    }
    
    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        this.authToken = null;
        
        if (this.notificationSystem) {
            this.notificationSystem.destroy();
            this.notificationSystem = null;
        }
        
        // Redirect to login
        window.location.href = 'login.html';
    }
    
    checkAuthStatus() {
        if (!this.authToken) {
            // Check if we're not on the login/register pages
            if (!window.location.pathname.includes('login') && 
                !window.location.pathname.includes('register')) {
                window.location.href = 'login.html';
            }
        }
    }
    
    // Expense Methods
    async createExpense(expenseData) {
        try {
            const response = await fetch(`${this.baseURL}/expenses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify(expenseData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Check for budget alerts after adding expense
                if (this.notificationSystem && expenseData.budget_id) {
                    await this.notificationSystem.checkBudgetAlert(expenseData.budget_id);
                }
                
                return { success: true, expense: data.expense };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Connection error' };
        }
    }
    
    async getExpenses(params = {}) {
        try {
            const queryString = new URLSearchParams(params).toString();
            const url = `${this.baseURL}/expenses${queryString ? '?' + queryString : ''}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true, expenses: data.expenses, pagination: data.pagination };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Connection error' };
        }
    }
    
    async updateExpense(expenseId, expenseData) {
        try {
            const response = await fetch(`${this.baseURL}/expenses/${expenseId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify(expenseData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true, expense: data.expense };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Connection error' };
        }
    }
    
    async deleteExpense(expenseId) {
        try {
            const response = await fetch(`${this.baseURL}/expenses/${expenseId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                return { success: true };
            } else {
                const data = await response.json();
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Connection error' };
        }
    }
    
    // Budget Methods
    async createBudget(budgetData) {
        try {
            const response = await fetch(`${this.baseURL}/expenses/budgets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify(budgetData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true, budget: data.budget };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Connection error' };
        }
    }
    
    async getBudgets() {
        try {
            const response = await fetch(`${this.baseURL}/expenses/budgets`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true, budgets: data.budgets };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Connection error' };
        }
    }
    
    // Analytics Methods
    async getDashboardData() {
        try {
            const response = await fetch(`${this.baseURL}/analytics/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true, data: data };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Connection error' };
        }
    }
    
    async getCategoryBreakdown(params = {}) {
        try {
            const queryString = new URLSearchParams(params).toString();
            const url = `${this.baseURL}/analytics/category-breakdown${queryString ? '?' + queryString : ''}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true, data: data };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Connection error' };
        }
    }
    
    async getSpendingTrends(params = {}) {
        try {
            const queryString = new URLSearchParams(params).toString();
            const url = `${this.baseURL}/analytics/spending-trends${queryString ? '?' + queryString : ''}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true, data: data };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Connection error' };
        }
    }
    
    // Insights Methods
    async getSpendingPatterns() {
        try {
            const response = await fetch(`${this.baseURL}/insights/spending-patterns`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true, data: data };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Connection error' };
        }
    }
    
    async getBudgetRecommendations() {
        try {
            const response = await fetch(`${this.baseURL}/insights/budget-recommendations`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true, data: data };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Connection error' };
        }
    }
    
    async getSpendingForecast(params = {}) {
        try {
            const queryString = new URLSearchParams(params).toString();
            const url = `${this.baseURL}/insights/spending-forecast${queryString ? '?' + queryString : ''}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true, data: data };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Connection error' };
        }
    }
    
    // Notification Methods
    async getSpendingWarnings() {
        if (this.notificationSystem) {
            return await this.notificationSystem.getSpendingWarnings();
        }
        return [];
    }
    
    // Utility Methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    }
    
    formatDate(date) {
        return new Date(date).toLocaleDateString();
    }
    
    showError(message) {
        if (this.notificationSystem) {
            this.notificationSystem.showToast(message, 'error');
        } else {
            alert(`Error: ${message}`);
        }
    }
    
    showSuccess(message) {
        if (this.notificationSystem) {
            this.notificationSystem.showToast(message, 'success');
        } else {
            alert(`Success: ${message}`);
        }
    }
    
    // Migration helper to sync localStorage data to backend
    async migrateLocalStorageData() {
        const localExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
        const localBudgets = JSON.parse(localStorage.getItem('budgets') || '[]');
        
        if (localExpenses.length > 0) {
            console.log('Migrating expenses to backend...');
            for (const expense of localExpenses) {
                // Remove id field and let backend generate it
                const { id, ...expenseData } = expense;
                await this.createExpense(expenseData);
            }
            
            // Clear local storage after migration
            localStorage.removeItem('expenses');
            this.showSuccess(`Migrated ${localExpenses.length} expenses to your account`);
        }
        
        if (localBudgets.length > 0) {
            console.log('Migrating budgets to backend...');
            for (const budget of localBudgets) {
                // Remove id field and let backend generate it
                const { id, ...budgetData } = budget;
                await this.createBudget(budgetData);
            }
            
            // Clear local storage after migration
            localStorage.removeItem('budgets');
            this.showSuccess(`Migrated ${localBudgets.length} budgets to your account`);
        }
    }
}

// Create global API instance
window.financeAPI = new FinanceAPI();

// Example usage and integration helpers
class DashboardIntegration {
    constructor(api) {
        this.api = api;
        this.init();
    }
    
    async init() {
        if (this.api.authToken) {
            await this.loadDashboardData();
            await this.checkForMigration();
        }
    }
    
    async loadDashboardData() {
        try {
            // Load dashboard analytics
            const dashboardResult = await this.api.getDashboardData();
            if (dashboardResult.success) {
                this.updateDashboardUI(dashboardResult.data);
            }
            
            // Load recent expenses
            const expensesResult = await this.api.getExpenses({ limit: 10 });
            if (expensesResult.success) {
                this.updateRecentExpenses(expensesResult.expenses);
            }
            
            // Load budgets
            const budgetsResult = await this.api.getBudgets();
            if (budgetsResult.success) {
                this.updateBudgetProgress(budgetsResult.budgets);
            }
            
            // Load spending warnings
            const warnings = await this.api.getSpendingWarnings();
            if (warnings.length > 0) {
                this.showSpendingWarnings(warnings);
            }
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }
    
    updateDashboardUI(data) {
        // Update total spending
        const totalSpendingElement = document.querySelector('#totalSpending');
        if (totalSpendingElement && data.total_spending !== undefined) {
            totalSpendingElement.textContent = this.api.formatCurrency(data.total_spending);
        }
        
        // Update monthly spending
        const monthlySpendingElement = document.querySelector('#monthlySpending');
        if (monthlySpendingElement && data.monthly_spending !== undefined) {
            monthlySpendingElement.textContent = this.api.formatCurrency(data.monthly_spending);
        }
        
        // Update charts if they exist
        if (typeof updateCharts === 'function' && data.category_breakdown) {
            updateCharts(data.category_breakdown, data.monthly_trends);
        }
    }
    
    updateRecentExpenses(expenses) {
        const expensesContainer = document.querySelector('#recentExpenses');
        if (expensesContainer) {
            expensesContainer.innerHTML = expenses.map(expense => `
                <div class="expense-item" data-id="${expense.id}">
                    <div class="expense-info">
                        <span class="expense-description">${expense.description}</span>
                        <span class="expense-category">${expense.category}</span>
                    </div>
                    <div class="expense-amount">${this.api.formatCurrency(expense.amount)}</div>
                    <div class="expense-date">${this.api.formatDate(expense.date)}</div>
                    <button class="delete-expense" onclick="deleteExpenseFromAPI(${expense.id})">Delete</button>
                </div>
            `).join('');
        }
    }
    
    updateBudgetProgress(budgets) {
        const budgetContainer = document.querySelector('#budgetProgress');
        if (budgetContainer) {
            budgetContainer.innerHTML = budgets.map(budget => {
                const percentage = Math.min((budget.spent_amount / budget.amount) * 100, 100);
                const status = percentage > 100 ? 'over-budget' : percentage > 80 ? 'warning' : 'on-track';
                
                return `
                    <div class="budget-item ${status}">
                        <div class="budget-header">
                            <span class="budget-category">${budget.category}</span>
                            <span class="budget-amount">${this.api.formatCurrency(budget.spent_amount)} / ${this.api.formatCurrency(budget.amount)}</span>
                        </div>
                        <div class="budget-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${percentage}%"></div>
                            </div>
                            <span class="progress-text">${percentage.toFixed(1)}%</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
    
    showSpendingWarnings(warnings) {
        const warningsContainer = document.querySelector('#spendingWarnings') || 
                                  document.createElement('div');
        
        if (!document.querySelector('#spendingWarnings')) {
            warningsContainer.id = 'spendingWarnings';
            warningsContainer.className = 'spending-warnings';
            document.querySelector('.dashboard') && 
            document.querySelector('.dashboard').insertBefore(warningsContainer, document.querySelector('.dashboard').firstChild);
        }
        
        warningsContainer.innerHTML = `
            <h3>⚠️ Spending Alerts</h3>
            ${warnings.map(warning => `
                <div class="warning-item ${warning.type}">
                    <span class="warning-message">${warning.message}</span>
                    ${warning.type === 'budget_exceeded' ? 
                        `<button onclick="adjustBudget('${warning.category}')">Adjust Budget</button>` : ''}
                </div>
            `).join('')}
        `;
    }
    
    async checkForMigration() {
        const hasLocalData = localStorage.getItem('expenses') || localStorage.getItem('budgets');
        if (hasLocalData) {
            const migrate = confirm('Would you like to sync your local data to your account?');
            if (migrate) {
                await this.api.migrateLocalStorageData();
                await this.loadDashboardData(); // Refresh after migration
            }
        }
    }
}

// Initialize dashboard integration
if (window.financeAPI) {
    window.dashboardIntegration = new DashboardIntegration(window.financeAPI);
}

// Global helper functions for UI integration
window.deleteExpenseFromAPI = async function(expenseId) {
    const result = await window.financeAPI.deleteExpense(expenseId);
    if (result.success) {
        window.financeAPI.showSuccess('Expense deleted successfully');
        window.dashboardIntegration.loadDashboardData(); // Refresh
    } else {
        window.financeAPI.showError(result.error);
    }
};

window.adjustBudget = function(category) {
    // This could open a budget adjustment modal
    alert(`Budget adjustment for ${category} - feature coming soon!`);
};
