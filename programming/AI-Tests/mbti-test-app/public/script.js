// ============================================
// PsychoTest - Main Application Script
// ============================================

const API_URL = window.location.origin + '/api';

// Application State
const app = {
    user: null,
    tests: [],
    token: localStorage.getItem('token')
};

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // Check for error messages from redirects
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
        const errorMessages = {
            'admin_login_required': '⛔ Admin paneline erişmek için giriş yapmalısınız!',
            'invalid_session': '⛔ Oturumunuz geçersiz. Lütfen tekrar giriş yapın.',
            'admin_access_denied': '⛔ Bu sayfaya erişim yetkiniz yok! Sadece admin kullanıcılar erişebilir.',
            'auth_check_failed': '⛔ Yetki kontrolü başarısız.'
        };
        
        if (errorMessages[error]) {
            showToast('error', errorMessages[error]);
        }
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check if user is logged in
    if (app.token) {
        await checkAuth();
    }
    
    // Load tests
    await loadTests();
    
    // Update UI
    updateNavAuth();
}

// ============================================
// Authentication
// ============================================
async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${app.token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            app.user = data.user;
        } else {
            // Token invalid, clear it
            localStorage.removeItem('token');
            app.token = null;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

function updateNavAuth() {
    const navAuth = document.getElementById('nav-auth');
    
    if (app.user) {
        // User is logged in
        const initial = app.user.name ? app.user.name.charAt(0).toUpperCase() : app.user.email.charAt(0).toUpperCase();
        
        navAuth.innerHTML = `
            <div class="user-menu">
                <div class="user-dropdown">
                    <div class="user-avatar">${initial}</div>
                    <div class="dropdown-menu">
                        <div class="dropdown-item" style="pointer-events: none; opacity: 0.7;">
                            ${app.user.name || app.user.email}
                        </div>
                        <div class="dropdown-divider"></div>
                        <button class="dropdown-item" onclick="handleLogout()">
                            Çıkış Yap
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else {
        // User is not logged in
        navAuth.innerHTML = `
            <button class="btn btn-ghost btn-sm" onclick="showAuthModal('login')">
                Giriş Yap
            </button>
            <button class="btn btn-primary btn-sm" onclick="showAuthModal('register')">
                Kayıt Ol
            </button>
        `;
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            app.user = data.user;
            app.token = data.token;
            localStorage.setItem('token', data.token);
            
            closeAuthModal();
            updateNavAuth();
            await loadTests(); // Reload tests with user status
            
            showToast('success', 'Başarıyla giriş yaptınız!');
        } else {
            showToast('error', data.error || 'Giriş başarısız');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('error', 'Bağlantı hatası');
    } finally {
        showLoading(false);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            app.user = data.user;
            app.token = data.token;
            localStorage.setItem('token', data.token);
            
            closeAuthModal();
            updateNavAuth();
            await loadTests();
            
            showToast('success', 'Hesabınız oluşturuldu!');
        } else {
            showToast('error', data.error || 'Kayıt başarısız');
        }
    } catch (error) {
        console.error('Register error:', error);
        showToast('error', 'Bağlantı hatası');
    } finally {
        showLoading(false);
    }
}

async function handleLogout() {
    try {
        await fetch(`${API_URL}/auth/logout`, { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    app.user = null;
    app.token = null;
    localStorage.removeItem('token');
    
    updateNavAuth();
    loadTests();
    
    showToast('info', 'Çıkış yapıldı');
}

// ============================================
// Tests
// ============================================
async function loadTests() {
    try {
        const headers = {};
        if (app.token) {
            headers['Authorization'] = `Bearer ${app.token}`;
        }
        
        const response = await fetch(`${API_URL}/tests`, { headers });
        const data = await response.json();
        
        app.tests = data.tests || [];
        renderTests();
    } catch (error) {
        console.error('Load tests error:', error);
        showToast('error', 'Testler yüklenemedi');
    }
}

function renderTests() {
    const grid = document.getElementById('tests-grid');
    
    if (app.tests.length === 0) {
        grid.innerHTML = '<p class="text-center">Henüz test bulunmuyor.</p>';
        return;
    }
    
    grid.innerHTML = app.tests.map(test => {
        const statusHtml = getTestStatusHtml(test);
        
        return `
            <div class="test-card" style="--card-color: ${test.color}" onclick="handleTestClick('${test.slug}')">
                ${statusHtml}
                <div class="test-card-icon">${test.icon}</div>
                <h3 class="test-card-title">${test.name}</h3>
                <p class="test-card-description">${test.description}</p>
                <div class="test-card-meta">
                    <span class="test-meta-item">
                        <span>📋</span>
                        ${test.question_count} Soru
                    </span>
                    <span class="test-meta-item">
                        <span>⏱️</span>
                        ~${test.duration_minutes} dk
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

function getTestStatusHtml(test) {
    if (!test.userStatus) return '';
    
    if (test.userStatus.completed) {
        return `<span class="test-card-status status-completed">✓ Tamamlandı</span>`;
    } else {
        return `<span class="test-card-status status-in-progress">Devam Ediyor</span>`;
    }
}

async function handleTestClick(slug) {
    if (!app.user) {
        showToast('warning', 'Teste başlamak için giriş yapmalısınız');
        showAuthModal('login');
        return;
    }
    
    const test = app.tests.find(t => t.slug === slug);
    
    // If test is completed, go to results
    if (test.userStatus?.completed) {
        window.location.href = `/result.html?test=${slug}`;
        return;
    }
    
    // Otherwise, go to test page
    window.location.href = `/test.html?test=${slug}`;
}

// ============================================
// Modal Management
// ============================================
function showAuthModal(type = 'login') {
    const modal = document.getElementById('auth-modal');
    modal.classList.add('active');
    
    switchAuthForm(type);
    
    // Focus first input
    setTimeout(() => {
        const firstInput = document.querySelector(`#${type}-form input`);
        if (firstInput) firstInput.focus();
    }, 300);
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.classList.remove('active');
    
    // Clear form inputs
    document.querySelectorAll('.auth-form input').forEach(input => {
        input.value = '';
    });
}

function switchAuthForm(type) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (type === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }
}

// Close modal on overlay click
document.getElementById('auth-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'auth-modal') {
        closeAuthModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAuthModal();
    }
});

// ============================================
// UI Utilities
// ============================================
// Removed scrollToTests - no longer needed

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function showToast(type, message) {
    const container = document.getElementById('toast-container');
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================
// API Helper
// ============================================
async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (app.token) {
        headers['Authorization'] = `Bearer ${app.token}`;
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }
    
    return data;
}
