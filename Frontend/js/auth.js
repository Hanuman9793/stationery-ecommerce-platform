// Redirect if already logged in
if (isAuthenticated() && window.location.pathname.includes('login.html')) {
    window.location.href = 'index.html';
}

// Removed switchTab block, logic is now handled in login.html explicitly.
// Handle Login
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('login-btn');
        const errorDiv = document.getElementById('login-error');

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        errorDiv.innerText = '';

        try {
            const data = await fetchAPI('/auth/login', {
                method: 'POST',
                body: { email, password }
            });
            
            // Success
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Also fetch full user profile to get cart items/role right away and cache it
            try {
                const profile = await fetchAPI('/profile');
                localStorage.setItem('user', JSON.stringify(profile.user));
            } catch (pErr) {
                console.log("Could not load full profile immediately");
            }

            window.location.href = 'index.html';

        } catch (error) {
            errorDiv.innerText = error.message;
        } finally {
            btn.disabled = false;
            btn.innerText = 'Sign In';
        }
    });
}

// Handle Register
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const btn = document.getElementById('reg-btn');
        const errorDiv = document.getElementById('reg-error');

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        errorDiv.innerText = '';

        try {
            await fetchAPI('/auth/register', {
                method: 'POST',
                body: { name, email, password }
            });
            
            showToast('Registration successful! Please login.');
            
            // Auto switch to login and fill email
            slideTab('login');
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').value = '';

        } catch (error) {
            errorDiv.innerText = error.message;
        } finally {
            btn.disabled = false;
            btn.innerText = 'Create Account';
        }
    });
}
