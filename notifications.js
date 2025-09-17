// Notification System for Personal Finance Dashboard
class NotificationSystem {
    constructor(authToken) {
        this.authToken = authToken;
        this.socket = null;
        this.notifications = [];
        this.unreadCount = 0;
        this.isConnected = false;
        this.isDemoMode = !authToken || authToken === 'demo-token';
        
        this.init();
    }
    
    init() {
        this.initWebSocket();
        this.createNotificationUI();
        this.bindEvents();
        this.loadNotifications();
    }
    
    initWebSocket() {
        // Initialize Socket.IO connection
        if (typeof io !== 'undefined') {
            this.socket = io('http://localhost:5001', {
                auth: {
                    token: this.authToken,
                    user_id: this.getUserId()
                }
            });
            
            this.socket.on('connect', () => {
                console.log('Connected to notification server');
                this.isConnected = true;
                this.updateConnectionStatus(true);
                
                // Join user-specific notification room
                this.socket.emit('join_notifications', {
                    user_id: this.getUserId()
                });
            });
            
            this.socket.on('disconnect', () => {
                console.log('Disconnected from notification server');
                this.isConnected = false;
                this.updateConnectionStatus(false);
            });
            
            this.socket.on('new_notification', (data) => {
                this.handleNewNotification(data.notification);
            });
            
            this.socket.on('notification_update', (data) => {
                this.handleNotificationUpdate(data);
            });
            
            this.socket.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.showToast('Connection error: ' + error.message, 'error');
            });
        } else {
            console.warn('Socket.IO not loaded, notifications will work in polling mode');
        }
    }
    
    createNotificationUI() {
        // Check if notification system already exists to avoid duplicates
        const existingBell = document.getElementById('notificationBell');
        if (existingBell) {
            console.log('Notification UI already exists, removing old one first');
            const existingSystem = document.getElementById('notificationSystem');
            if (existingSystem) {
                existingSystem.remove();
            }
        }
        
        // Create single notification bell icon
        const notificationHtml = `
            <div class="notification-system" id="notificationSystem">
                <div class="notification-bell" id="notificationBell" title="Notifications">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                    <span class="notification-badge" id="notificationBadge" style="display: none;">0</span>
                </div>
                
                <div class="notification-dropdown" id="notificationDropdown">
                    <div class="notification-header">
                        <h3>Notifications</h3>
                        <div class="notification-actions">
                            <button class="btn-text" id="markAllRead">Mark all read</button>
                            <div class="connection-status" id="connectionStatus">
                                <span class="status-dot"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="notification-filters">
                        <button class="filter-btn active" data-filter="all">All</button>
                        <button class="filter-btn" data-filter="budget_alert">Budget</button>
                        <button class="filter-btn" data-filter="spending_warning">Spending</button>
                        <button class="filter-btn" data-filter="monthly_report">Reports</button>
                    </div>
                    
                    <div class="notification-list" id="notificationList">
                        <div class="loading-spinner">Loading notifications...</div>
                    </div>
                    
                    <div class="notification-footer">
                        <button class="btn-text" id="loadMoreNotifications">Load more</button>
                        <button class="btn-text" id="clearAllNotifications">Clear All</button>
                        <button class="btn-text" id="notificationSettings">Settings</button>
                    </div>
                </div>
            </div>
            
            <div class="toast-container" id="toastContainer"></div>
        `;
        
        // Add to header controls (next to user info)
        const headerControls = document.querySelector('.header-controls');
        if (headerControls) {
            // Insert before logout button
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.insertAdjacentHTML('beforebegin', notificationHtml);
            } else {
                headerControls.insertAdjacentHTML('beforeend', notificationHtml);
            }
        } else {
            console.warn('Header controls not found, adding to body');
            document.body.insertAdjacentHTML('afterbegin', notificationHtml);
        }
        
        // Add CSS styles
        this.addNotificationStyles();
        console.log('✅ Notification UI created successfully');
    }
    
    addNotificationStyles() {
        const styles = `
            <style>
                .notification-system {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    margin-right: 1rem;
                }
                
                .notification-bell {
                    cursor: pointer !important;
                    position: relative;
                    padding: 0.75rem;
                    border-radius: 50%;
                    transition: all 0.3s ease;
                    background: linear-gradient(135deg, #f8fafc, #e2e8f0);
                    border: 1px solid var(--gray-200);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 48px;
                    height: 48px;
                    pointer-events: auto !important;
                    z-index: 100;
                }
                
                .notification-bell:hover {
                    background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }
                
                .notification-bell svg {
                    stroke: currentColor;
                    stroke-width: 2;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                    pointer-events: none;
                }
                
                .notification-badge {
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                    border-radius: 50%;
                    min-width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    font-weight: 700;
                    border: 2px solid white;
                    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                
                .notification-dropdown {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    width: 380px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                    display: none;
                    z-index: 1001;
                    max-height: 600px;
                    overflow: hidden;
                    pointer-events: auto !important;
                    border: 1px solid #e2e8f0;
                }
                
                .notification-dropdown.show {
                    display: block;
                }
                
                .notification-header {
                    padding: 20px;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .notification-header h3 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                }
                
                .notification-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .connection-status .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #95a5a6;
                    display: inline-block;
                }
                
                .connection-status.connected .status-dot {
                    background: #27ae60;
                }
                
                .notification-filters {
                    padding: 12px 20px;
                    display: flex;
                    gap: 8px;
                    border-bottom: 1px solid #eee;
                }
                
                .filter-btn {
                    padding: 6px 12px;
                    border: none;
                    background: transparent;
                    border-radius: 20px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .filter-btn.active {
                    background: var(--primary-color, #3498db);
                    color: white;
                }
                
                .notification-list {
                    max-height: 400px;
                    overflow-y: auto;
                }
                
                .notification-item {
                    padding: 16px 20px;
                    border-bottom: 1px solid #f5f5f5;
                    cursor: pointer !important;
                    transition: background-color 0.2s;
                    position: relative;
                    pointer-events: auto !important;
                    user-select: none;
                }
                
                .notification-item:hover {
                    background-color: #f8f9fa;
                }
                
                .notification-item.unread {
                    background-color: #f0f8ff;
                    border-left: 3px solid var(--primary-color, #3498db);
                }
                
                .notification-item.unread::before {
                    content: '';
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    width: 8px;
                    height: 8px;
                    background: var(--primary-color, #3498db);
                    border-radius: 50%;
                }
                
                .notification-content {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                }
                
                .notification-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                
                .notification-icon.budget-alert {
                    background: #ffe6e6;
                    color: #e74c3c;
                }
                
                .notification-icon.spending-warning {
                    background: #fff4e6;
                    color: #f39c12;
                }
                
                .notification-icon.monthly-report {
                    background: #e6f3ff;
                    color: #3498db;
                }
                
                .notification-text {
                    flex: 1;
                }
                
                .notification-title {
                    font-weight: 600;
                    font-size: 14px;
                    margin-bottom: 4px;
                }
                
                .notification-message {
                    font-size: 13px;
                    color: #666;
                    line-height: 1.4;
                }
                
                .notification-time {
                    font-size: 12px;
                    color: #999;
                    margin-top: 4px;
                }
                
                .notification-footer {
                    padding: 16px 20px;
                    border-top: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                }
                
                .btn-text {
                    background: none;
                    border: none;
                    color: var(--primary-color, #3498db);
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .btn-text:hover {
                    text-decoration: underline;
                }
                
                .loading-spinner {
                    text-align: center;
                    padding: 40px 20px;
                    color: #666;
                }
                
                .empty-notifications {
                    text-align: center;
                    padding: 40px 20px;
                    color: #666;
                }
                
                .toast-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                }
                
                .toast {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    padding: 16px;
                    margin-bottom: 12px;
                    max-width: 350px;
                    border-left: 4px solid var(--primary-color, #3498db);
                    animation: slideIn 0.3s ease;
                }
                
                .toast.error {
                    border-left-color: #e74c3c;
                }
                
                .toast.success {
                    border-left-color: #27ae60;
                }
                
                .toast.warning {
                    border-left-color: #f39c12;
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                /* Notification Button Styles */
                .notification-dropdown button,
                .notification-dropdown .btn-text {
                    background: none;
                    border: none;
                    color: var(--primary-color, #3498db);
                    cursor: pointer !important;
                    font-size: 14px;
                    padding: 8px 12px;
                    border-radius: 6px;
                    transition: all 0.2s;
                    pointer-events: auto !important;
                    user-select: none;
                }
                
                .notification-dropdown button:hover,
                .notification-dropdown .btn-text:hover {
                    background-color: rgba(52, 152, 219, 0.1);
                    color: var(--primary-color, #2980b9);
                }
                
                .notification-footer {
                    padding: 12px 20px;
                    border-top: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f8f9fa;
                    pointer-events: auto !important;
                    gap: 8px;
                }
                
                .notification-footer button {
                    flex: 1;
                    min-width: 0;
                    white-space: nowrap;
                }
                
                #clearAllNotifications {
                    color: #e74c3c !important;
                }
                
                #clearAllNotifications:hover {
                    background-color: rgba(231, 76, 60, 0.1) !important;
                    color: #c0392b !important;
                }
                
                .notification-header {
                    pointer-events: auto !important;
                }
                
                .notification-filters {
                    pointer-events: auto !important;
                }
                
                .notification-list {
                    pointer-events: auto !important;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
    
    bindEvents() {
        // Wait for elements to be created
        setTimeout(() => {
            const bell = document.getElementById('notificationBell');
            const dropdown = document.getElementById('notificationDropdown');
            const markAllRead = document.getElementById('markAllRead');
            const loadMore = document.getElementById('loadMoreNotifications');
            const settingsBtn = document.getElementById('notificationSettings');
            
            if (bell && dropdown) {
                console.log('✅ Binding notification events successfully');
                
                // Toggle dropdown with better handling
                bell.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔔 Notification bell clicked');
                    dropdown.classList.toggle('show');
                    
                    // Force focus to ensure the click was registered
                    bell.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        bell.style.transform = 'scale(1)';
                    }, 100);
                });
                
                // Also add mousedown event as backup
                bell.addEventListener('mousedown', (e) => {
                    console.log('🔔 Mouse down on notification bell');
                });
                
                // Close dropdown when clicking outside
                document.addEventListener('click', (e) => {
                    if (!dropdown.contains(e.target) && !bell.contains(e.target)) {
                        dropdown.classList.remove('show');
                    }
                });
                
                // Mark all notifications as read
                if (markAllRead) {
                    markAllRead.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('📖 Mark all as read clicked');
                        this.markAllNotificationsAsRead();
                        
                        // Visual feedback
                        markAllRead.style.color = '#27ae60';
                        setTimeout(() => {
                            markAllRead.style.color = '';
                        }, 1000);
                    });
                }
                
                // Load more notifications
                if (loadMore) {
                    loadMore.addEventListener('click', (e) => {
                        e.preventDefault();
                        console.log('📄 Load more notifications');
                        this.loadMoreNotifications();
                    });
                }
                
                // Clear all notifications
                const clearAllBtn = document.getElementById('clearAllNotifications');
                if (clearAllBtn) {
                    clearAllBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🗑️ Clear all notifications clicked');
                        this.clearAllNotifications();
                        
                        // Visual feedback
                        clearAllBtn.style.color = '#e74c3c';
                        setTimeout(() => {
                            clearAllBtn.style.color = '';
                        }, 1000);
                    });
                }
                
                // Notification settings
                if (settingsBtn) {
                    settingsBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        console.log('⚙️ Notification settings');
                        this.openNotificationSettings();
                    });
                }
                
                // Filter buttons with delegation
                document.addEventListener('click', (e) => {
                    if (e.target.classList.contains('filter-btn')) {
                        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                        e.target.classList.add('active');
                        const filterType = e.target.dataset.filter;
                        console.log('🔍 Filter:', filterType);
                        this.filterNotifications(filterType);
                    }
                });
                
                console.log('🎉 Notification system ready!');
            } else {
                console.error('❌ Notification elements not found, retrying...');
                setTimeout(() => this.bindEvents(), 1000);
            }
        }, 100);
        
        // Legacy filter button handling
        setTimeout(() => {
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.filterNotifications(e.target.dataset.filter);
                });
            });
        }, 500);
    }
    
    async loadNotifications(offset = 0, type = null) {
        console.log('🔔 Loading notifications...', { offset, type, isDemoMode: this.isDemoMode });
        
        // Always use demo mode first for better reliability
        if (this.isDemoMode) {
            console.log('📋 Using demo mode for notifications');
            this.loadDemoNotifications();
            return;
        }
        
        try {
            const params = new URLSearchParams({
                limit: 20,
                offset: offset
            });
            
            if (type && type !== 'all') {
                params.append('type', type);
            }
            
            // Create headers with auth token if available (and not demo token)
            const headers = {
                'Content-Type': 'application/json'
            };
            if (this.authToken && this.authToken !== 'demo-token') {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }
            
            console.log('🌐 Fetching notifications from API...');
            const response = await fetch(`http://localhost:5001/api/notifications?${params}`, {
                method: 'GET',
                headers: headers,
                timeout: 5000 // 5 second timeout
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Notifications data received:', data);
                
                if (offset === 0) {
                    this.notifications = data.notifications || [];
                } else {
                    this.notifications.push(...(data.notifications || []));
                }
                
                this.unreadCount = data.unread_count || data.pagination?.unread_count || 0;
                this.renderNotifications();
                this.updateBadge();
            } else {
                console.error('❌ Failed to load notifications:', response.status, response.statusText);
                throw new Error(`API Error: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Error loading notifications:', error);
            console.log('🔄 Falling back to demo notifications...');
            
            // Always fallback to demo notifications
            this.loadDemoNotifications();
        }
    }
    
    loadDemoNotifications() {
        console.log('📋 Loading demo notifications...');
        
        // Try to load from localStorage first
        const savedNotifications = localStorage.getItem('notifications');
        const savedUnreadCount = localStorage.getItem('unreadCount');
        
        if (savedNotifications) {
            try {
                this.notifications = JSON.parse(savedNotifications);
                this.unreadCount = parseInt(savedUnreadCount || '0');
                console.log('✅ Loaded notifications from localStorage');
                this.renderNotifications();
                this.updateBadge();
                return;
            } catch (error) {
                console.warn('⚠️ Failed to parse saved notifications, creating new ones');
            }
        }
        
        // Create comprehensive demo notifications if nothing saved
        this.notifications = [
            {
                id: 1,
                title: 'Welcome to Finance Tracker! 🎉',
                message: 'Start tracking your expenses to gain insights into your spending habits. Your financial journey begins now!',
                type: 'welcome',
                is_read: false,
                created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
                priority: 'high'
            },
            {
                id: 2,
                title: 'Budget Alert 💰',
                message: 'You have spent ₹2,950 out of your ₹5,000 monthly budget.',
                type: 'budget_alert',
                is_read: true,
                created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
            },
            {
                id: 3,
                title: 'Spending Tip 💡',
                message: 'Consider setting up automatic savings to reach your financial goals faster.',
                type: 'tip',
                is_read: false,
                created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
            }
        ];
        
        this.unreadCount = this.notifications.filter(n => !n.is_read).length;
        this.renderNotifications();
        this.updateBadge();
    }
    
    renderNotifications() {
        const container = document.getElementById('notificationList');
        
        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="empty-notifications">
                    <div style="text-align: center; padding: 40px 20px; color: #666;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🔔</div>
                        <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">No notifications</div>
                        <div style="font-size: 14px; color: #999;">You're all caught up!</div>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.notifications.map(notification => {
            const timeAgo = this.getTimeAgo(new Date(notification.created_at));
            const iconClass = this.getNotificationIconClass(notification.type);
            
            return `
                <div class="notification-item ${notification.is_read ? '' : 'unread'}" 
                     data-id="${notification.id}">
                    <div class="notification-content">
                        <div class="notification-icon ${iconClass}">
                            ${this.getNotificationIcon(notification.type)}
                        </div>
                        <div class="notification-text">
                            <div class="notification-title">${notification.title}</div>
                            <div class="notification-message">${notification.message}</div>
                            <div class="notification-time">${timeAgo}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers for individual notifications with improved event handling
        container.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const notificationId = item.dataset.id;
                console.log('📖 Clicked notification:', notificationId);
                this.markNotificationAsRead(notificationId);
                
                // Add visual feedback
                item.style.backgroundColor = '#f0f8ff';
                setTimeout(() => {
                    item.style.backgroundColor = '';
                }, 200);
            });
            
            // Also add mousedown for better responsiveness
            item.addEventListener('mousedown', (e) => {
                console.log('👆 Mouse down on notification item');
            });
        });
    }
    
    getNotificationIconClass(type) {
        const iconClasses = {
            'budget_alert': 'budget-alert',
            'spending_warning': 'spending-warning',
            'monthly_report': 'monthly-report',
            'system': 'system'
        };
        return iconClasses[type] || 'system';
    }
    
    getNotificationIcon(type) {
        const icons = {
            'budget_alert': '💰',
            'spending_warning': '⚠️',
            'monthly_report': '📊',
            'system': '🔔'
        };
        return icons[type] || '🔔';
    }
    
    getTimeAgo(date) {
        const now = new Date();
        const diffInMs = now - date;
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays < 7) return `${diffInDays}d ago`;
        
        return date.toLocaleDateString();
    }
    
    async markNotificationAsRead(notificationId) {
        console.log('📖 Marking notification as read:', notificationId);
        
        try {
            // Update local notification immediately for better UX
            const notification = this.notifications.find(n => n.id == notificationId);
            if (notification && !notification.is_read) {
                notification.is_read = true;
                this.unreadCount = Math.max(0, this.unreadCount - 1);
                this.updateBadge();
                this.renderNotifications();
                console.log('✅ Local notification updated');
                
                // Store in localStorage for persistence in demo mode
                localStorage.setItem('notifications', JSON.stringify(this.notifications));
                localStorage.setItem('unreadCount', this.unreadCount.toString());
            }
            
            // Only try server sync if we have a real server connection
            if (!this.isDemoMode && this.isConnected) {
                try {
                    const response = await fetch(`http://localhost:5001/api/notifications/${notificationId}/read`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.authToken}`
                        }
                    });
                    
                    if (response.ok) {
                        console.log('✅ Server notification updated');
                    } else {
                        console.warn('⚠️ Server update failed but local update succeeded');
                    }
                } catch (serverError) {
                    console.warn('⚠️ Server not available, using local storage only');
                }
            }
            
            this.showToast('Notification marked as read ✓', 'success');
        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
            // Don't show error toast for demo mode - just log it
            if (!this.isDemoMode) {
                this.showToast('Failed to update notification', 'error');
            }
        }
    }
    
    async markAllNotificationsAsRead() {
        console.log('📚 Marking all notifications as read');
        
        try {
            // Update all notifications locally first
            const hadUnread = this.unreadCount > 0;
            this.notifications.forEach(n => n.is_read = true);
            this.unreadCount = 0;
            this.updateBadge();
            this.renderNotifications();
            
            // Store in localStorage for demo mode
            localStorage.setItem('notifications', JSON.stringify(this.notifications));
            localStorage.setItem('unreadCount', '0');
            
            // Only try server sync if we have a real server connection
            if (!this.isDemoMode && this.isConnected) {
                try {
                    const response = await fetch('http://localhost:5001/api/notifications/mark-all-read', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.authToken}`
                        }
                    });
                    
                    if (response.ok) {
                        console.log('✅ Server: All notifications marked as read');
                    }
                } catch (serverError) {
                    console.warn('⚠️ Server not available for mark all read');
                }
            }
            
            if (hadUnread) {
                this.showToast('All notifications marked as read ✓', 'success');
            } else {
                this.showToast('No unread notifications', 'info');
            }
        } catch (error) {
            console.error('❌ Error marking all notifications as read:', error);
            // Only show error in non-demo mode
            if (!this.isDemoMode) {
                this.showToast('Failed to mark notifications as read', 'error');
            }
        }
    }
    
    async clearAllNotifications() {
        console.log('🗑️ Clearing all notifications');
        
        // Show confirmation dialog
        const confirmClear = confirm('Are you sure you want to clear all notifications? This action cannot be undone.');
        
        if (!confirmClear) {
            console.log('❌ User cancelled clearing notifications');
            return;
        }
        
        try {
            const notificationCount = this.notifications.length;
            
            // Clear notifications locally first
            this.notifications = [];
            this.unreadCount = 0;
            this.updateBadge();
            this.renderNotifications();
            
            // Store in localStorage for demo mode
            localStorage.setItem('notifications', JSON.stringify(this.notifications));
            localStorage.setItem('unreadCount', '0');
            
            // Only try server sync if we have a real server connection
            if (!this.isDemoMode && this.isConnected) {
                try {
                    const response = await fetch('http://localhost:5001/api/notifications/clear-all', {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${this.authToken}`
                        }
                    });
                    
                    if (response.ok) {
                        console.log('✅ Server: All notifications cleared');
                    }
                } catch (serverError) {
                    console.warn('⚠️ Server not available for clear all notifications');
                }
            }
            
            this.showToast(`Cleared ${notificationCount} notification${notificationCount !== 1 ? 's' : ''} ✓`, 'success');
            
            // Close the dropdown after clearing
            const dropdown = document.getElementById('notificationDropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        } catch (error) {
            console.error('❌ Error clearing all notifications:', error);
            // Only show error in non-demo mode
            if (!this.isDemoMode) {
                this.showToast('Failed to clear notifications', 'error');
            }
        }
    }
    
    loadMoreNotifications() {
        const currentOffset = this.notifications.length;
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        const filterType = activeFilter === 'all' ? null : activeFilter;
        
        this.loadNotifications(currentOffset, filterType);
    }
    
    filterNotifications(type) {
        this.loadNotifications(0, type === 'all' ? null : type);
    }
    
    handleNewNotification(notification) {
        // Add notification to the beginning of the list
        this.notifications.unshift(notification);
        
        // Update unread count
        if (!notification.is_read) {
            this.unreadCount++;
        }
        
        this.updateBadge();
        this.renderNotifications();
        
        // Show toast notification
        this.showToast(notification.message, this.getToastType(notification.type));
        
        // Play notification sound (if enabled)
        this.playNotificationSound();
    }
    
    handleNotificationUpdate(data) {
        if (data.type === 'notification_read') {
            const notification = this.notifications.find(n => n.id == data.notification_id);
            if (notification && !notification.is_read) {
                notification.is_read = true;
                this.unreadCount = Math.max(0, this.unreadCount - 1);
                this.updateBadge();
                this.renderNotifications();
            }
        } else if (data.type === 'all_notifications_read') {
            this.notifications.forEach(n => n.is_read = true);
            this.unreadCount = 0;
            this.updateBadge();
            this.renderNotifications();
        }
    }
    
    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (this.unreadCount > 0) {
            badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
    
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        if (connected) {
            statusElement.classList.add('connected');
            statusElement.title = 'Connected to notification server';
        } else {
            statusElement.classList.remove('connected');
            statusElement.title = 'Disconnected from notification server';
        }
    }
    
    getToastType(notificationType) {
        const typeMap = {
            'budget_alert': 'warning',
            'spending_warning': 'warning',
            'monthly_report': 'info',
            'system': 'info'
        };
        return typeMap[notificationType] || 'info';
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
        
        // Remove on click
        toast.addEventListener('click', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }
    
    playNotificationSound() {
        // Simple notification sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            // Notification sound failed, but that's okay
            console.log('Notification sound not available');
        }
    }
    
    openNotificationSettings() {
        // This could open a modal or navigate to settings page
        this.showToast('Notification settings coming soon!', 'info');
    }
    
    getUserId() {
        // Extract user ID from JWT token or localStorage
        try {
            if (this.authToken) {
                const payload = JSON.parse(atob(this.authToken.split('.')[1]));
                return payload.sub || payload.user_id;
            }
        } catch (error) {
            console.error('Error getting user ID from token:', error);
        }
        
        // Fallback to localStorage if available
        return localStorage.getItem('userId') || 'anonymous';
    }
    
    // Public methods for external use
    checkBudgetAlert(budgetId) {
        return fetch(`http://localhost:5001/api/notifications/budget-alerts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ budget_id: budgetId })
        });
    }
    
    async getSpendingWarnings() {
        try {
            const response = await fetch('http://localhost:5001/api/notifications/spending-warnings', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.warnings;
            }
            return [];
        } catch (error) {
            console.error('Error getting spending warnings:', error);
            return [];
        }
    }
    
    destroy() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        // Remove UI elements
        const notificationSystem = document.querySelector('.notification-system');
        if (notificationSystem) {
            notificationSystem.remove();
        }
        
        const toastContainer = document.getElementById('toastContainer');
        if (toastContainer) {
            toastContainer.remove();
        }
    }
}

// Debug function to test notification system
window.testNotificationClick = function() {
    const bell = document.getElementById('notificationBell');
    if (bell) {
        console.log('🧪 Testing notification bell click manually');
        bell.click();
        return 'Bell found and clicked';
    } else {
        console.log('❌ Notification bell not found');
        return 'Bell not found';
    }
};

// Debug function to check notification system state
window.debugNotificationSystem = function() {
    const bell = document.getElementById('notificationBell');
    const dropdown = document.getElementById('notificationDropdown');
    const system = document.getElementById('notificationSystem');
    
    console.log('🔍 Notification System Debug:');
    console.log('- Bell element:', bell ? '✅ Found' : '❌ Missing');
    console.log('- Dropdown element:', dropdown ? '✅ Found' : '❌ Missing');
    console.log('- System container:', system ? '✅ Found' : '❌ Missing');
    console.log('- NotificationSystem instance:', window.notificationSystem ? '✅ Found' : '❌ Missing');
    
    if (bell) {
        console.log('- Bell position:', bell.getBoundingClientRect());
        console.log('- Bell computed style pointer-events:', getComputedStyle(bell).pointerEvents);
        console.log('- Bell computed style cursor:', getComputedStyle(bell).cursor);
        console.log('- Bell computed style z-index:', getComputedStyle(bell).zIndex);
    }
    
    return {
        bell: !!bell,
        dropdown: !!dropdown,
        system: !!system,
        instance: !!window.notificationSystem
    };
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationSystem;
}
