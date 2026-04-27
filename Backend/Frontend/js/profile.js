if (!isAuthenticated()) {
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    setupNavbar();
    loadProfile();
});

async function loadProfile() {
    const loading = document.getElementById('loading');
    const content = document.getElementById('profile-content');
    const errorMsg = document.getElementById('error-message');

    try {
        const data = await fetchAPI('/profile');
        const user = data.user;

        // Update local storage to have fresh data
        localStorage.setItem('user', JSON.stringify(user));
        
        document.getElementById('profile-name').innerText = user.name;
        document.getElementById('profile-email').innerText = user.email;
        document.getElementById('profile-role').innerText = user.role.toUpperCase();
        document.getElementById('profile-initial').innerText = user.name.charAt(0).toUpperCase();

        const wishlistCount = user.wishlist ? user.wishlist.length : 0;
        document.getElementById('wishlist-count').innerText = `${wishlistCount} Saved Items`;

        if (user.role === 'admin') {
            const adminCard = document.createElement('a');
            adminCard.href = 'admin.html';
            adminCard.className = 'stat-card';
            adminCard.innerHTML = `
                <i class="fas fa-user-shield"></i>
                <h3>Admin Panel</h3>
                <p class="text-muted">Manage store</p>
            `;
            document.querySelector('.stats-grid').appendChild(adminCard);
            // Change layout if admin is added
            document.querySelector('.stats-grid').classList.replace('grid-cols-2', 'grid-cols-3');
            document.querySelector('.stats-grid').style.gridTemplateColumns = '1fr 1fr 1fr';
        }

        loading.style.display = 'none';
        content.style.display = 'block';

    } catch (error) {
        loading.style.display = 'none';
        errorMsg.innerText = error.message;
    }
}
