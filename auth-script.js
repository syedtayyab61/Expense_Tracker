// Authentication JavaScript

const API_BASE_URL = 'http://localhost:5000/api';

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.init();
    }

    init() {
        // Check if user is already logged in
        if (this.token && this.user && window.location.pathname.includes('login.html')) {
            window.location.href = 'index.html';
        }

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
            
            // Password strength checker
            const passwordInput = document.getElementById('password');
            if (passwordInput) {
                passwordInput.addEventListener('input', (e) => this.checkPasswordStrength(e.target.value));
            }

            // Confirm password validation
            const confirmPasswordInput = document.getElementById('confirmPassword');
            if (confirmPasswordInput) {
                confirmPasswordInput.addEventListener('input', (e) => this.validatePasswordMatch());
            }
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const loginData = {
            email: formData.get('email'),
            password: formData.get('password'),
            remember_me: formData.get('rememberMe') === 'on'
        };

        this.setLoading(form, true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });

            const result = await response.json();

            if (response.ok) {
                this.saveAuthData(result.token, result.user);
                this.showNotification('Login successful! Redirecting...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                this.showNotification(result.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Connection error. Please try again.', 'error');
        }

        this.setLoading(form, false);
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        
        // Validate form
        if (!this.validateRegisterForm(formData)) {
            return;
        }

        const registerData = {
            first_name: formData.get('firstName'),
            last_name: formData.get('lastName'),
            email: formData.get('email'),
            password: formData.get('password'),
            currency: formData.get('currency'),
            email_notifications: formData.get('emailNotifications') === 'on'
        };

        this.setLoading(form, true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registerData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showNotification('Account created successfully! Please log in.', 'success');
                
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                this.showNotification(result.message || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification('Connection error. Please try again.', 'error');
        }

        this.setLoading(form, false);
    }

    validateRegisterForm(formData) {
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const agreeTerms = formData.get('agreeTerms');

        // Check password match
        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return false;
        }

        // Check password strength
        if (!this.isPasswordStrong(password)) {
            this.showNotification('Password must be at least 8 characters with uppercase, lowercase, number and special character', 'error');
            return false;
        }

        // Check terms agreement
        if (!agreeTerms) {
            this.showNotification('Please agree to the Terms of Service', 'error');
            return false;
        }

        return true;
    }

    checkPasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');
        
        if (!strengthBar || !strengthText) return;

        const strength = this.calculatePasswordStrength(password);
        
        strengthBar.className = 'strength-fill';
        
        if (password.length === 0) {
            strengthBar.style.width = '0%';
            strengthText.textContent = 'Password strength';
            return;
        }

        switch (strength.level) {
            case 'weak':
                strengthBar.classList.add('weak');
                strengthText.textContent = 'Weak';
                break;
            case 'fair':
                strengthBar.classList.add('fair');
                strengthText.textContent = 'Fair';
                break;
            case 'good':
                strengthBar.classList.add('good');
                strengthText.textContent = 'Good';
                break;
            case 'strong':
                strengthBar.classList.add('strong');
                strengthText.textContent = 'Strong';
                break;
        }
    }

    calculatePasswordStrength(password) {
        let score = 0;
        
        // Length check
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        
        // Character variety
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;

        if (score < 3) return { level: 'weak', score };
        if (score < 4) return { level: 'fair', score };
        if (score < 6) return { level: 'good', score };
        return { level: 'strong', score };
    }

    isPasswordStrong(password) {
        const strength = this.calculatePasswordStrength(password);
        return strength.level === 'good' || strength.level === 'strong';
    }

    validatePasswordMatch() {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword');
        
        if (confirmPassword.value && password !== confirmPassword.value) {
            confirmPassword.classList.add('invalid');
            confirmPassword.classList.remove('valid');
        } else if (confirmPassword.value) {
            confirmPassword.classList.add('valid');
            confirmPassword.classList.remove('invalid');
        }
    }

    saveAuthData(token, user) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        this.token = token;
        this.user = user;
    }

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        this.token = null;
        this.user = null;
        window.location.href = 'login.html';
    }

    setLoading(form, isLoading) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const spinner = submitBtn.querySelector('.loading-spinner');

        if (isLoading) {
            btnText.style.display = 'none';
            spinner.style.display = 'block';
            submitBtn.disabled = true;
        } else {
            btnText.style.display = 'block';
            spinner.style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const icon = notification.querySelector('.notification-icon');
        const messageSpan = notification.querySelector('.notification-message');

        // Set content
        messageSpan.textContent = message;
        
        // Set icon based on type
        switch (type) {
            case 'success':
                icon.textContent = '✅';
                break;
            case 'error':
                icon.textContent = '❌';
                break;
            case 'info':
            default:
                icon.textContent = 'ℹ️';
                break;
        }

        // Set class for styling
        notification.className = `notification ${type}`;
        notification.style.display = 'block';

        // Auto hide after 5 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }

    // API helper methods
    async makeAuthenticatedRequest(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(`${API_BASE_URL}${url}`, mergedOptions);
            
            // Check if token is expired
            if (response.status === 401) {
                this.logout();
                return null;
            }

            return response;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        };
    }
}

// Utility functions
function togglePassword(inputId = 'password') {
    const passwordInput = document.getElementById(inputId);
    const toggleBtn = passwordInput.parentNode.querySelector('.password-toggle');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = '👁️';
    }
}

function signInWithGoogle() {
    // Placeholder for Google OAuth integration
    showNotification('Google Sign-In will be implemented with OAuth 2.0', 'info');
}

function signUpWithGoogle() {
    // Placeholder for Google OAuth integration  
    showNotification('Google Sign-Up will be implemented with OAuth 2.0', 'info');
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const icon = notification.querySelector('.notification-icon');
    const messageSpan = notification.querySelector('.notification-message');

    messageSpan.textContent = message;
    
    switch (type) {
        case 'success':
            icon.textContent = '✅';
            break;
        case 'error':
            icon.textContent = '❌';
            break;
        case 'info':
        default:
            icon.textContent = 'ℹ️';
            break;
    }

    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

// Global functions for HTML onclick handlers
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.password-toggle');
    
    if (passwordInput && toggleBtn) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleBtn.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleBtn.textContent = '👁️';
        }
    }
}

function signInWithGoogle() {
    showNotification('Google Sign-In is not implemented yet. Please use the regular login form.', 'info');
}

// Test function to ensure JavaScript is working
function testInteraction() {
    console.log('JavaScript is working!');
    showNotification('JavaScript is working! You can now use the form.', 'success');
}

// Add click test for debugging
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, JavaScript ready');
    
    // Test if we can interact with form elements
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (emailInput) {
        emailInput.addEventListener('focus', () => {
            console.log('Email input focused');
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('focus', () => {
            console.log('Password input focused');
        });
    }
    
    // Add a temporary test button
    const testBtn = document.createElement('button');
    testBtn.textContent = 'Test JS';
    testBtn.style.position = 'fixed';
    testBtn.style.top = '10px';
    testBtn.style.right = '10px';
    testBtn.style.zIndex = '9999';
    testBtn.onclick = testInteraction;
    document.body.appendChild(testBtn);
});

// Initialize authentication manager
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});
