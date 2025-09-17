// BULLETPROOF TAB SYSTEM - Ensures only one tab is ever visible at a time
class BulletproofTabSystem {
    constructor() {
        this.currentTab = 'overview';
        this.tabIds = ['overview', 'trends', 'categories', 'budget', 'health', 'predictions', 'patterns', 'insights'];
        this.init();
    }

    init() {
        console.log('🔒 Initializing Bulletproof Tab System...');
        
        // Force hide ALL tabs initially
        this.hideAllTabs();
        
        // Show only the default tab
        this.showTab('overview');
        
        // Bind events
        this.bindTabEvents();
        
        console.log('✅ Bulletproof Tab System ready');
    }

    hideAllTabs() {
        console.log('🚫 Force hiding ALL tabs...');
        
        // Force hide using multiple methods to be absolutely sure
        this.tabIds.forEach(tabId => {
            // Method 1: Remove active class from tab buttons
            const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
            if (tabButton) {
                tabButton.classList.remove('active');
            }
            
            // Method 2: Remove active class from tab content
            const tabContent = document.getElementById(`${tabId}-tab`);
            if (tabContent) {
                tabContent.classList.remove('active');
                // Method 3: Force hide with inline style (overrides any CSS)
                tabContent.style.display = 'none';
                // Method 4: Add hidden attribute
                tabContent.setAttribute('hidden', 'true');
                // Method 5: Clear any content that might be visible
                if (tabId !== 'overview') {
                    this.clearTabContent(tabContent);
                }
            }
        });
    }

    showTab(tabId) {
        console.log(`🎯 Force showing ONLY tab: ${tabId}`);
        
        // First hide everything
        this.hideAllTabs();
        
        // Now show only the requested tab
        const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
        const tabContent = document.getElementById(`${tabId}-tab`);
        
        if (tabButton) {
            tabButton.classList.add('active');
        }
        
        if (tabContent) {
            // Multiple methods to ensure visibility
            tabContent.classList.add('active');
            tabContent.style.display = 'block';
            tabContent.removeAttribute('hidden');
            
            // Render content for this tab only
            this.renderTabContent(tabId);
        }
        
        this.currentTab = tabId;
        console.log(`✅ Tab ${tabId} is now the ONLY visible tab`);
    }

    clearTabContent(tabElement) {
        // Clear any dynamic content to prevent bleeding
        const canvases = tabElement.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
        
        // Clear text content in dynamic elements
        const dynamicElements = tabElement.querySelectorAll('[id*="avg"], [id*="peak"], [id*="total"], [id*="forecast"]');
        dynamicElements.forEach(el => {
            if (el.tagName !== 'CANVAS') {
                el.textContent = '';
            }
        });
    }

    bindTabEvents() {
        console.log('🔗 Binding bulletproof tab events...');
        
        // Remove any existing event listeners first
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            // Clone the element to remove all event listeners
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
        });
        
        // Add new clean event listeners
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const tabName = e.target.getAttribute('data-tab');
                console.log(`🔄 Tab clicked: ${tabName}`);
                
                // Force show only this tab
                this.showTab(tabName);
            });
        });
    }

    renderTabContent(tabId) {
        console.log(`🎨 Rendering content for tab: ${tabId}`);
        
        // Only render if SimpleAnalytics is available and the tab is active
        if (window.simpleAnalytics && this.currentTab === tabId) {
            // Refresh data before rendering
            window.simpleAnalytics.loadExpenseData();
            
            // Call the appropriate render method
            switch(tabId) {
                case 'overview':
                    window.simpleAnalytics.renderOverview();
                    break;
                case 'trends':
                    window.simpleAnalytics.renderTrends();
                    break;
                case 'categories':
                    window.simpleAnalytics.renderCategories();
                    break;
                case 'budget':
                    window.simpleAnalytics.renderBudget();
                    break;
                case 'health':
                    window.simpleAnalytics.renderHealth();
                    break;
                case 'predictions':
                    window.simpleAnalytics.renderPredictions();
                    break;
                case 'patterns':
                    window.simpleAnalytics.renderPatterns();
                    break;
                case 'insights':
                    window.simpleAnalytics.renderInsights();
                    break;
            }
        }
    }

    // Public method to force a clean state
    resetAllTabs() {
        console.log('🔄 Resetting all tabs to clean state...');
        this.hideAllTabs();
        this.showTab('overview');
    }

    // Public method to refresh the current tab
    refreshCurrentTab() {
        console.log(`🔄 Refreshing current tab: ${this.currentTab}`);
        this.renderTabContent(this.currentTab);
    }
}

// Initialize the bulletproof system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a moment to ensure everything is loaded
    setTimeout(() => {
        window.bulletproofTabs = new BulletproofTabSystem();
        console.log('🛡️ Bulletproof Tab System activated');
        
        // Add a global reset function for debugging
        window.resetTabs = () => {
            window.bulletproofTabs.resetAllTabs();
        };
        
    }, 500);
});

// Ensure no content bleeding on page load
window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.bulletproofTabs) {
            window.bulletproofTabs.resetAllTabs();
        }
    }, 1000);
});
