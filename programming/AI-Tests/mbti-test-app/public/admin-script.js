// ============================================
//  Symbiont AI Admin Panel - JavaScript
// ============================================

const API_URL = window.location.origin + '/api';
const token = localStorage.getItem('token');

// State
let allResults = [];
let allTests = [];
let allUsers = [];
let currentTab = 'dashboard';

// ============================================
//  INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    await checkAuth();
    
    // Setup navigation
    setupNavigation();
    
    // Load initial data
    await loadDashboardData();
});

async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            showToast('Oturumunuz sonlanmış. Giriş yapın.', 'error');
            setTimeout(() => window.location.href = '/', 1500);
            return;
        }
        
        const data = await response.json();
        
        if (data.user.email !== 'meliksaheminoglutr@gmail.com') {
            showToast('Bu sayfaya erişim yetkiniz yok!', 'error');
            setTimeout(() => window.location.href = '/', 1500);
            return;
        }
        
        // Show admin email
        document.getElementById('admin-email').textContent = data.user.email;
        
    } catch (error) {
        console.error('Auth error:', error);
        showToast('Yetki kontrolü başarısız', 'error');
        setTimeout(() => window.location.href = '/', 1500);
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            switchToTab(tab);
        });
    });
    
    // Enter key for search
    const searchInput = document.getElementById('search-email');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchResults();
        });
    }
}

// ============================================
//  TAB SWITCHING
// ============================================

function switchToTab(tabName) {
    currentTab = tabName;
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
    
    // Update title
    const titles = {
        dashboard: 'Dashboard',
        results: 'Test Sonuçları',
        tests: 'Testler',
        users: 'Kullanıcılar'
    };
    document.getElementById('page-title').textContent = titles[tabName] || 'Dashboard';
    
    // Load tab data
    switch(tabName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'results':
            loadAllResults();
            break;
        case 'tests':
            loadAllTests();
            break;
        case 'users':
            loadAllUsers();
            break;
    }
    
    // Close sidebar on mobile
    document.querySelector('.sidebar').classList.remove('open');
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}

// ============================================
//  DASHBOARD
// ============================================

async function loadDashboardData() {
    showLoading(true);
    
    try {
        // Load all data in parallel
        const [resultsRes, testsRes, usersRes] = await Promise.all([
            fetch(`${API_URL}/admin/results`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/admin/tests`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        if (resultsRes.ok) {
            allResults = await resultsRes.json();
        }
        if (testsRes.ok) {
            allTests = await testsRes.json();
        }
        if (usersRes.ok) {
            allUsers = await usersRes.json();
        }
        
        // Update stats
        document.getElementById('stat-total-results').textContent = allResults.length;
        document.getElementById('stat-completed').textContent = allResults.filter(r => r.is_completed).length;
        document.getElementById('stat-users').textContent = allUsers.length;
        document.getElementById('stat-tests').textContent = allTests.length;
        
        // Display recent results
        displayRecentResults();
        
        // Display test distribution
        displayTestDistribution();
        
        // Populate filter dropdown
        populateTestFilter();
        
    } catch (error) {
        console.error('Dashboard error:', error);
        showToast('Veriler yüklenemedi', 'error');
    } finally {
        showLoading(false);
    }
}

function displayRecentResults() {
    const container = document.getElementById('recent-results-list');
    const recent = allResults.slice(0, 5);
    
    if (recent.length === 0) {
        container.innerHTML = '<div class="empty-state">Henüz sonuç yok</div>';
        return;
    }
    
    container.innerHTML = recent.map(result => `
        <div class="recent-item">
            <div class="recent-info">
                <span class="recent-email">${result.email}</span>
                <span class="recent-test">${result.test_name || 'Test'}</span>
            </div>
            <span class="recent-date">${formatDate(result.completed_at)}</span>
        </div>
    `).join('');
}

function displayTestDistribution() {
    const container = document.getElementById('test-distribution');
    
    if (allTests.length === 0) {
        container.innerHTML = '<div class="empty-state">Test yok</div>';
        return;
    }
    
    const maxCount = Math.max(...allTests.map(t => parseInt(t.total_completions) || 0), 1);
    
    container.innerHTML = allTests.map(test => {
        const count = parseInt(test.total_completions) || 0;
        const percentage = (count / maxCount) * 100;
        return `
            <div class="distribution-item">
                <span class="distribution-icon">${test.icon || '📝'}</span>
                <div class="distribution-info">
                    <div class="distribution-name">${test.name}</div>
                    <div class="distribution-bar">
                        <div class="distribution-fill" style="width: ${percentage}%; background: ${test.color || '#d4a853'}"></div>
                    </div>
                </div>
                <span class="distribution-count">${count}</span>
            </div>
        `;
    }).join('');
}

// ============================================
//  RESULTS TAB
// ============================================

async function loadAllResults() {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/admin/results`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Sonuçlar alınamadı');
        
        allResults = await response.json();
        displayResults(allResults);
        
    } catch (error) {
        console.error('Results error:', error);
        showToast('Sonuçlar yüklenemedi', 'error');
    } finally {
        showLoading(false);
    }
}

function displayResults(results) {
    const tbody = document.getElementById('results-tbody');
    
    if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Sonuç bulunamadı</td></tr>';
        return;
    }
    
    tbody.innerHTML = results.map(result => `
        <tr>
            <td>${result.id}</td>
            <td class="email-cell">${result.email}</td>
            <td>${result.user_name || '-'}</td>
            <td><span class="badge badge-accent">${result.test_name || 'Test'}</span></td>
            <td>${getResultBadge(result)}</td>
            <td>${formatDate(result.completed_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-view" onclick="viewResultDetails(${result.id})">
                        👁️ Detay
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getResultBadge(result) {
    if (result.is_completed) {
        if (result.result_type) {
            return `<span class="badge badge-success">${result.result_type}</span>`;
        }
        return `<span class="badge badge-success">Tamamlandı</span>`;
    }
    return `<span class="badge badge-warning">Beklemede</span>`;
}

function searchResults() {
    const email = document.getElementById('search-email').value.trim().toLowerCase();
    
    if (!email) {
        displayResults(allResults);
        return;
    }
    
    const filtered = allResults.filter(r => 
        r.email.toLowerCase().includes(email)
    );
    
    displayResults(filtered);
    
    if (filtered.length === 0) {
        showToast('Sonuç bulunamadı', 'warning');
    }
}

function filterByTest() {
    const testId = document.getElementById('filter-test').value;
    
    if (!testId) {
        displayResults(allResults);
        return;
    }
    
    const filtered = allResults.filter(r => r.test_id == testId);
    displayResults(filtered);
}

function populateTestFilter() {
    const select = document.getElementById('filter-test');
    if (!select) return;
    
    select.innerHTML = '<option value="">Tüm Testler</option>' +
        allTests.map(test => `<option value="${test.id}">${test.name}</option>`).join('');
}

// ============================================
//  TESTS TAB
// ============================================

async function loadAllTests() {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/admin/tests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Testler alınamadı');
        
        allTests = await response.json();
        displayTests(allTests);
        
    } catch (error) {
        console.error('Tests error:', error);
        showToast('Testler yüklenemedi', 'error');
    } finally {
        showLoading(false);
    }
}

function displayTests(tests) {
    const container = document.getElementById('tests-grid');
    
    if (tests.length === 0) {
        container.innerHTML = '<div class="empty-state">Test bulunamadı</div>';
        return;
    }
    
    container.innerHTML = tests.map(test => `
        <div class="test-card" style="border-left-color: ${test.color || '#d4a853'}">
            <div class="test-card-header">
                <span class="test-icon">${test.icon || '📝'}</span>
                <div class="test-info">
                    <h3>${test.name}</h3>
                    <span class="test-slug">${test.slug}</span>
                </div>
            </div>
            <p class="test-description">${test.description || 'Açıklama yok'}</p>
            <div class="test-stats">
                <div class="test-stat">
                    <span class="test-stat-value">${test.actual_question_count || 0}</span>
                    <span class="test-stat-label">Soru</span>
                </div>
                <div class="test-stat">
                    <span class="test-stat-value">${test.duration_minutes || 15}</span>
                    <span class="test-stat-label">Dakika</span>
                </div>
                <div class="test-stat">
                    <span class="test-stat-value">${test.total_completions || 0}</span>
                    <span class="test-stat-label">Tamamlanan</span>
                </div>
            </div>
            <div class="test-card-actions">
                <button class="btn btn-secondary" onclick="viewTestQuestions(${test.id})">
                    📋 Sorular
                </button>
                <button class="btn btn-primary" onclick="viewTestResultsOnly(${test.id})">
                    📊 Sonuçlar
                </button>
            </div>
        </div>
    `).join('');
}

function viewTestResultsOnly(testId) {
    switchToTab('results');
    document.getElementById('filter-test').value = testId;
    filterByTest();
}

// ============================================
//  USERS TAB
// ============================================

async function loadAllUsers() {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Kullanıcılar alınamadı');
        
        allUsers = await response.json();
        displayUsers(allUsers);
        
    } catch (error) {
        console.error('Users error:', error);
        showToast('Kullanıcılar yüklenemedi', 'error');
    } finally {
        showLoading(false);
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('users-tbody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Kullanıcı bulunamadı</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td class="email-cell">${user.email}</td>
            <td>${user.name || '-'}</td>
            <td>${formatDate(user.created_at)}</td>
            <td><span class="badge badge-primary">${user.completed_tests || 0}</span></td>
            <td>
                <button class="btn btn-view" onclick="viewUserResults('${user.email}')">
                    📊 Sonuçlar
                </button>
            </td>
        </tr>
    `).join('');
}

function viewUserResults(email) {
    switchToTab('results');
    document.getElementById('search-email').value = email;
    searchResults();
}

// ============================================
//  MODALS
// ============================================

async function viewResultDetails(resultId) {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/admin/results/${resultId}/details`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Detaylar alınamadı');
        
        const data = await response.json();
        displayResultModal(data);
        openModal();
        
    } catch (error) {
        console.error('Details error:', error);
        showToast('Detaylar yüklenemedi', 'error');
    } finally {
        showLoading(false);
    }
}

function displayResultModal(data) {
    const { result, questions } = data;
    
    document.getElementById('modal-title').textContent = `${result.test_name} - ${result.email}`;
    
    let html = `
        <div class="detail-section">
            <h3>📋 Genel Bilgiler</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Kullanıcı</span>
                    <span class="detail-value">${result.email}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">İsim</span>
                    <span class="detail-value">${result.user_name || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Test</span>
                    <span class="detail-value">${result.test_name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Tamamlanma</span>
                    <span class="detail-value">${formatDate(result.completed_at)}</span>
                </div>
            </div>
        </div>
    `;
    
    // Result data
    if (result.result_type || result.scores) {
        html += `<div class="detail-section"><h3>📊 Sonuç</h3><div class="detail-grid">`;
        
        if (result.result_type) {
            html += `
                <div class="detail-item">
                    <span class="detail-label">Sonuç Tipi</span>
                    <span class="detail-value"><span class="badge badge-success">${result.result_type}</span></span>
                </div>
            `;
        }
        
        if (result.scores) {
            const scores = typeof result.scores === 'string' ? JSON.parse(result.scores) : result.scores;
            Object.entries(scores).forEach(([key, value]) => {
                html += `
                    <div class="detail-item">
                        <span class="detail-label">${key}</span>
                        <span class="detail-value">${value}</span>
                    </div>
                `;
            });
        }
        
        html += `</div></div>`;
    }
    
    // Questions and answers
    if (questions && questions.length > 0) {
        const answered = questions.filter(q => q.user_answer);
        
        html += `
            <div class="detail-section">
                <h3>✍️ Cevaplar (${answered.length}/${questions.length})</h3>
                <div class="questions-list">
        `;
        
        questions.forEach(q => {
            const hasAnswer = q.user_answer !== null && q.user_answer !== undefined;
            const isMultipleChoice = q.question_type === 'multiple_choice';
            
            html += `
                <div class="question-item">
                    <div class="question-header">
                        <span class="question-num">Soru ${q.question_number}</span>
                        ${q.section ? `<span class="question-section">${q.section}</span>` : ''}
                        ${hasAnswer ? `<span class="question-answer">Cevap: ${q.user_answer}</span>` : '<span class="question-answer no-answer">Cevaplanmadı</span>'}
                    </div>
            `;
            
            if (isMultipleChoice && q.options) {
                // Parse options
                let options = q.options;
                if (typeof options === 'string') {
                    try {
                        options = JSON.parse(options);
                    } catch (e) {
                        options = {};
                    }
                }
                
                // Display question text and multiple choice options
                html += `
                    <div class="question-text-main">${q.left_text}</div>
                    <div class="question-options-list">
                `;
                
                ['A', 'B', 'C', 'D', 'E'].forEach(optionKey => {
                    if (options[optionKey]) {
                        const isSelected = hasAnswer && String(q.user_answer) === optionKey;
                        html += `
                            <div class="question-option-item ${isSelected ? 'selected' : ''}">
                                <span class="option-letter">${optionKey}</span>
                                <span class="option-text">${options[optionKey]}</span>
                                ${isSelected ? '<span class="option-check">✓</span>' : ''}
                            </div>
                        `;
                    }
                });
                
                html += `
                    </div>
                `;
            } else {
                // Binary format (old style)
                const isLeftSelected = hasAnswer && ['A', 'B', '2', '1'].includes(String(q.user_answer));
                const isRightSelected = hasAnswer && ['C', 'D', '-1', '-2', '0'].includes(String(q.user_answer));
                
                html += `
                    <div class="question-texts">
                        <div class="question-option ${isLeftSelected ? 'selected' : ''}">
                            ${q.left_text}
                        </div>
                        <div class="question-divider">⚖️</div>
                        <div class="question-option ${isRightSelected ? 'selected' : ''}">
                            ${q.right_text}
                        </div>
                    </div>
                `;
            }
            
            html += `
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    document.getElementById('modal-body').innerHTML = html;
}

async function viewTestQuestions(testId) {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/admin/tests/${testId}/questions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Sorular alınamadı');
        
        const data = await response.json();
        displayQuestionsModal(data);
        openModal();
        
    } catch (error) {
        console.error('Questions error:', error);
        showToast('Sorular yüklenemedi', 'error');
    } finally {
        showLoading(false);
    }
}

function displayQuestionsModal(data) {
    const { test, questions } = data;
    
    document.getElementById('modal-title').textContent = `${test.icon || '📝'} ${test.name} - Sorular`;
    
    let html = `
        <div class="detail-section">
            <h3>📋 Test Bilgileri</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Test Adı</span>
                    <span class="detail-value">${test.name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Slug</span>
                    <span class="detail-value">${test.slug}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Soru Sayısı</span>
                    <span class="detail-value">${questions.length}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Süre</span>
                    <span class="detail-value">${test.duration_minutes} dakika</span>
                </div>
            </div>
        </div>
    `;
    
    if (questions.length > 0) {
        html += `
            <div class="detail-section">
                <h3>📝 Sorular (${questions.length})</h3>
                <div class="questions-list">
        `;
        
        questions.forEach(q => {
            const isMultipleChoice = q.question_type === 'multiple_choice';
            
            html += `
                <div class="question-item">
                    <div class="question-header">
                        <span class="question-num">Soru ${q.question_number}</span>
                        ${q.section ? `<span class="question-section">${q.section}</span>` : ''}
                        <span class="question-type-badge">${isMultipleChoice ? 'Çoktan Seçmeli' : 'İkili'}</span>
                    </div>
            `;
            
            if (isMultipleChoice && q.options) {
                // Parse options
                let options = q.options;
                if (typeof options === 'string') {
                    try {
                        options = JSON.parse(options);
                    } catch (e) {
                        options = {};
                    }
                }
                
                // Display question text and multiple choice options
                html += `
                    <div class="question-text-main"><strong>Soru:</strong> ${q.left_text}</div>
                    <div class="question-options-list">
                `;
                
                ['A', 'B', 'C', 'D', 'E'].forEach(optionKey => {
                    if (options[optionKey]) {
                        html += `
                            <div class="question-option-item">
                                <span class="option-letter">${optionKey}</span>
                                <span class="option-text">${options[optionKey]}</span>
                            </div>
                        `;
                    }
                });
                
                html += `
                    </div>
                `;
            } else {
                // Binary format
                html += `
                    <div class="question-texts">
                        <div class="question-option">
                            <strong>A/B:</strong> ${q.left_text}
                        </div>
                        <div class="question-divider">⚖️</div>
                        <div class="question-option">
                            <strong>C/D:</strong> ${q.right_text}
                        </div>
                    </div>
                `;
            }
            
            html += `
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    } else {
        html += '<div class="empty-state">Bu teste henüz soru eklenmemiş.</div>';
    }
    
    document.getElementById('modal-body').innerHTML = html;
}

function openModal() {
    document.getElementById('modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Close modal on outside click
document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') {
        closeModal();
    }
});

// ============================================
//  UTILITIES
// ============================================

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
