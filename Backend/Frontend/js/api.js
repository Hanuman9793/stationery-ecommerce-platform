// Base Configuration
const API_URL = '/api';

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}
initTheme();

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    return newTheme;
}

// Utility for fetching data with automatic token injection
async function fetchAPI(endpoint, options = {}) {
    // Set up default headers
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    // Inject Auth Token if available
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    // Auto-stringify JSON body if it's an object
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            let errReason = "Server Error";
            if (response.status === 404) errReason = "API Endpoint Not Found";
            else if (response.status === 502) errReason = "Bad Gateway (Server might be down)";
            throw new Error(`${errReason} (${response.status}). Is backend running?`);
        }

        const data = await response.json();

        if (!response.ok) {
            // Handle unauthorized requests globally
            if (response.status === 401 && endpoint !== '/auth/login') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            }
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error; // Re-throw to be handled by the caller
    }
}

// Toast Notification System
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon selection
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove after animation completes (3.3s total)
    setTimeout(() => {
        toast.remove();
    }, 3500);
}

// User Management Helper
function getUserData() {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
}

function isAuthenticated() {
    return !!localStorage.getItem('token');
}

function getRole() {
    const user = getUserData();
    return user ? user.role : null;
}

// Navbar UI Management Helper
function setupNavbar() {
    const authLinks = document.getElementById('auth-links');
    if (authLinks) {
        const isAuth = isAuthenticated();
        // Since we are adding an `isAdmin` check let's decode from token or user storage (stored during login)
        const user = getUserData();
        const isAdmin = user && user.role === 'admin';

        if (isAuth) {
            authLinks.innerHTML = `
                <button onclick="window.toggleTheme()" class="theme-toggle-btn" aria-label="Toggle Theme"><i class="fas fa-moon"></i></button>
                <a href="wishlist.html" class="nav-link" aria-label="Wishlist"><i class="fas fa-heart"></i></a>
                <a href="cart.html" class="nav-link" aria-label="Cart"><i class="fas fa-shopping-cart"></i><span id="nav-cart-count" class="badge">0</span></a>
                ${isAdmin ? '<a href="admin.html" class="nav-link text-gold"><i class="fas fa-user-shield"></i> Admin</a>' : ''}
                <div style="position: relative; display: inline-block;">
                    <a href="profile.html" class="nav-link"><i class="fas fa-user"></i> ${user?.name || 'Profile'}</a>
                </div>
                <button onclick="logout()" class="btn btn-outline" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;">Logout</button>
            `;
            updateCartCount();
        } else {
            authLinks.innerHTML = `
                <button onclick="window.toggleTheme()" class="theme-toggle-btn" aria-label="Toggle Theme"><i class="fas fa-moon"></i></button>
                <a href="login.html" class="btn btn-primary">Sign In <i class="fas fa-arrow-right"></i></a>
            `;
        }

        // Apply active class to current nav links
        const path = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('href') === path) {
                link.classList.add('active');
            }
        });
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

async function updateCartCount() {
    if (!isAuthenticated()) return;
    try {
        const cart = await fetchAPI('/cart');
        const count = cart.reduce((acc, item) => acc + item.quantity, 0);
        const badge = document.getElementById('nav-cart-count');
        if (badge) badge.innerText = count;
    } catch (error) {
        console.error('Failed to get cart count', error);
    }
}

// Make globally available
window.fetchAPI = fetchAPI;
window.showToast = showToast;
window.getUserData = getUserData;
window.isAuthenticated = isAuthenticated;
window.setupNavbar = setupNavbar;
window.logout = logout;
window.updateCartCount = updateCartCount;
window.getRole = getRole;
window.toggleTheme = toggleTheme;
