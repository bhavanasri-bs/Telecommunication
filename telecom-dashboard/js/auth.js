/**
 * Authentication Handler
 * Manages login flow and redirection
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    // Handle Login
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (email === 'admin@gmail.com' && password === 'admin123') {
                // Admin Login
                localStorage.setItem('adminLoggedIn', 'true');
                localStorage.setItem('userRole', 'admin');
                localStorage.setItem('userName', 'admin');
                localStorage.setItem('userEmail', email);
                window.location.href = 'dashboards/admin-dashboard.html';
            } else {
                // Validate Password Format for User Login as requested
                if (!validatePassword(password)) {
                    alert('Password must contain at least one uppercase letter, one special character, and one number.');
                    return;
                }

                // Check against registered user
                const registeredEmail = localStorage.getItem('registeredEmail');
                const registeredPassword = localStorage.getItem('registeredPassword');
                const registeredName = localStorage.getItem('registeredName');

                if (email === registeredEmail && password === registeredPassword) {
                    // Registered User Login
                    localStorage.setItem('userLoggedIn', 'true');
                    localStorage.setItem('userRole', 'user');
                    localStorage.setItem('userName', registeredName);
                    localStorage.setItem('userEmail', registeredEmail);
                    window.location.href = 'dashboards/user-dashboard.html';
                } else {
                    alert('invalid email and password');
                }
            }
        });
    }

    // Handle Sign Up
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (name && email && password) {
                // Strict Password Validation
                if (!validatePassword(password)) {
                    alert('Password must contain at least one uppercase letter, one special character, and one number.');
                    return;
                }

                // Store registration info
                localStorage.setItem('registeredName', name);
                localStorage.setItem('registeredEmail', email);
                localStorage.setItem('registeredPassword', password);

                alert('Registration successful! Please login.');
                window.location.href = 'login.html';
            } else {
                alert('Please fill in all fields');
            }
        });
    }

    // Auth Guards
    const isDashboard = window.location.pathname.includes('dashboard.html');
    const isAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html');
    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true' || localStorage.getItem('adminLoggedIn') === 'true';

    // Update navbar on load
    updateNavbar();

    // 1. Protect Dashboard: Redirect to login if not logged in
    if (isDashboard && !isLoggedIn) {
        const prefix = window.location.pathname.includes('/dashboards/') ? '../' : '';
        window.location.href = prefix + 'login.html';
    }

    // 2. Prevent redundant login: Redirect to dashboard if already logged in
    if (isAuthPage && isLoggedIn) {
        const isAdmin = localStorage.getItem('adminLoggedIn') === 'true';
        const dashboard = isAdmin ? 'dashboards/admin-dashboard.html' : 'dashboards/user-dashboard.html';
        window.location.href = dashboard;
    }
});

/**
 * Validate Password Policy
 * Requires: 1 Uppercase, 1 Special Character, 1 Number
 */
function validatePassword(password) {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return hasUpperCase && hasNumber && hasSpecialChar;
}

/**
 * Global authentication utilities
 */
const auth = {
    logout: () => {

        // Clear session specific storage
        localStorage.removeItem('userLoggedIn');
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');

        // Redirect to homepage
        const prefix = window.location.pathname.includes('/dashboards/') ? '../' : '';
        window.location.href = prefix + 'index.html';
    }
};

/**
 * Update navbar based on auth state
 */
function updateNavbar() {
    const authButtons = document.querySelector('.auth-buttons');
    if (!authButtons) return;

    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true' || localStorage.getItem('adminLoggedIn') === 'true';
    const isAdmin = localStorage.getItem('adminLoggedIn') === 'true';

    if (isLoggedIn) {
        const dashboardUrl = isAdmin ? 'dashboards/admin-dashboard.html' : 'dashboards/user-dashboard.html';
        // Adjust paths if we are already in dashboards folder
        const isSubDir = window.location.pathname.includes('/dashboards/');
        const prefix = isSubDir ? '' : 'dashboards/';
        const homePrefix = isSubDir ? '../' : '';

        let dashboardPath = isSubDir ? (isAdmin ? 'admin-dashboard.html' : 'user-dashboard.html') : dashboardUrl;

        authButtons.innerHTML = `
            <a href="${dashboardPath}" class="btn btn-primary">Dashboard</a>
        `;
    }
}

window.auth = auth;
window.updateNavbar = updateNavbar;
