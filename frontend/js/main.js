// Utility Functions

// Current page state
let currentPage = 'dashboard';
const pagePrefillStore = {};

function setPagePrefill(pageName, filters = {}) {
    if (!pageName) return;
    pagePrefillStore[pageName] = { ...(filters || {}) };
}

function consumePagePrefill(pageName) {
    if (!pageName || !pagePrefillStore[pageName]) return null;
    const payload = { ...pagePrefillStore[pageName] };
    delete pagePrefillStore[pageName];
    return payload;
}

// Show page content
function showPage(pageName) {
    const pageTitle = document.getElementById('pageTitle');

    // Hide all pages
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Show active nav
    const activeNav = document.querySelector(`.nav-link[data-page="${pageName}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }

    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'pelanggan': 'Pelanggan',
        'pencatatan': 'Pencatatan Meteran',
        'pembayaran': 'Pembayaran',
        'laporan': 'Laporan',
        'kroscek': 'Slip Gaji Petugas',
        'tarif': 'Kelola Tarif',
        'pengaturan': 'Pengaturan',
        'users': 'Manajemen User'
    };

    if (pageTitle && titles[pageName]) {
        pageTitle.textContent = titles[pageName];
    }

    // Load page content
    currentPage = pageName;

    // Direct switch to render function
    switch (pageName) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'pelanggan':
            renderPelangganPage();
            break;
        case 'pencatatan':
            renderPencatatanPage();
            break;
        case 'pembayaran':
            renderPembayaranPage();
            break;
        case 'laporan':
            renderLaporanPage();
            break;
        case 'kroscek':
            renderKroscekPage();
            break;
        case 'tarif':
            renderTarifPage();
            break;
        case 'pengaturan':
            renderPengaturanPage();
            break;
        case 'users':
            renderUsersPage();
            break;
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    toastMessage.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.style.display = 'flex';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Close toast
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-close-toast')) {
        document.getElementById('toast').style.display = 'none';
    }
});

// Modal functions
function showModal(title, content, options = {}) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    modal.dataset.backdropClose = options.backdropClose ? 'true' : 'false';
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function hideModal() {
    document.getElementById('modal').style.display = 'none';
}

// Close modal on button click
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-close-modal')) {
        closeModal();
    }
});

// Close modal on outside click
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this && this.dataset.backdropClose === 'true') {
        closeModal();
    }
});

// Show loading overlay
function showLoading() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loadingOverlay';
    overlay.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(overlay);
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Format datetime
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Sidebar toggle
function setupSidebarToggle() {
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }
}

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            if (page) {
                showPage(page);

                // Close sidebar on mobile
                if (window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('open');
                }
            }
        });
    });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on dashboard page
    if (window.location.pathname.includes('dashboard.html')) {
        const user = Config.getUser();

        if (user) {
            // Setup sidebar toggle
            setupSidebarToggle();

            // Setup navigation
            setupNavigation();

            // Show default page
            showPage('dashboard');
        }
    }
});

// Export utility functions
window.Utils = {
    showToast,
    showModal,
    hideModal,
    showLoading,
    hideLoading,
    formatCurrency,
    formatDate,
    formatDateTime
};

window.PagePrefill = {
    set: setPagePrefill,
    consume: consumePagePrefill
};
