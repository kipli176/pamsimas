// Authentication Functions

// Simple toast notification for login page
function showToast(message, type = 'success') {
    // Create toast element if not exists
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = 'position: fixed; top: 1rem; right: 1rem; min-width: 300px; padding: 1rem; background: white; border-left: 4px solid; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); z-index: 1100; display: none;';
        document.body.appendChild(toast);
    }

    const toastMessage = document.getElementById('toastMessage');
    if (!toastMessage) {
        const msgSpan = document.createElement('span');
        msgSpan.id = 'toastMessage';
        toast.appendChild(msgSpan);
    }

    toast.style.borderLeftColor = type === 'success' ? '#10b981' : '#ef4444';
    document.getElementById('toastMessage').textContent = message;
    toast.style.display = 'flex';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Check if user is logged in
function checkAuth() {
    if (Config.isAuthenticated()) {
        const user = Config.getUser();
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
            window.location.href = 'dashboard.html';
        }
        return user;
    } else {
        if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        }
        return null;
    }
}

// Login handler
async function handleLogin(event) {
    event.preventDefault();

    const form = event.target;
    const username = form.username.value;
    const password = form.password.value;
    const errorDiv = document.getElementById('loginError');
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');

    // Hide previous error
    errorDiv.style.display = 'none';

    // Show loading
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-flex';
    submitBtn.disabled = true;

    try {
        const response = await API.auth.login(username, password);

        // Save token and user data
        Config.setToken(response.access_token);
        Config.setUser(response.user);

        // Show success message
        showToast('Login successful! Redirecting...', 'success');

        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 500);

    } catch (error) {
        // Show error
        errorDiv.textContent = error.message || 'Login failed. Please try again.';
        errorDiv.style.display = 'block';

        // Reset button
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        submitBtn.disabled = false;
    }
}

// Logout handler
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        Config.logout();
    }
}

// Setup role-based UI
function setupRoleUI() {
    const user = Config.getUser();
    if (!user) return;

    // Set body class for role-based styling
    document.body.className = `role-${user.role}`;

    // Update user info in sidebar
    const userName = document.getElementById('currentUserName');
    const userRole = document.getElementById('currentUserRole');

    if (userName) userName.textContent = user.nama_lengkap;
    if (userRole) userRole.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);

    // Hide/show elements based on role
    const petugasOnlyElements = document.querySelectorAll('.petugas-only');
    const adminOnlyElements = document.querySelectorAll('.admin-only');

    if (user.role === 'petugas') {
        adminOnlyElements.forEach(el => el.classList.add('d-none'));
        petugasOnlyElements.forEach(el => el.classList.remove('d-none'));
    } else if (user.role === 'admin') {
        petugasOnlyElements.forEach(el => el.classList.remove('d-none'));
        adminOnlyElements.forEach(el => el.classList.remove('d-none'));
    }
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const user = checkAuth();

    // Setup login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Setup role UI
    if (user && window.location.pathname.includes('dashboard.html')) {
        setupRoleUI();
    }

    // Update current date
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = new Date().toLocaleDateString('id-ID', options);
    }
});
