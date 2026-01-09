// API Base URL
const API_URL = 'http://localhost:3000/api';

// Get test ID from URL
const urlParams = new URLSearchParams(window.location.search);
const testId = urlParams.get('testId');

// State
let analysisData = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!testId) {
        showError('Test ID bulunamadı');
        return;
    }
    
    performAnalysis();
});

// Perform AI Analysis
async function performAnalysis() {
    showLoading();
    
    try {
        const response = await fetch(`${API_URL}/admin/analyze-test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ testId: parseInt(testId) })
        });
        
        const data = await response.json();
        
        if (data.success) {
            analysisData = data;
            displayAnalysis(data);
            showSuccess();
        } else {
            showError(data.error || 'Analiz yapılamadı');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Sunucuya bağlanılamadı. Lütfen sunucunun çalıştığından ve OpenAI API key\'in doğru olduğundan emin olun.');
    }
}

// Display Analysis
function displayAnalysis(data) {
    const { test, analysis } = data;
    
    // User Info
    document.getElementById('user-name').textContent = test.name || 'Belirtilmemiş';
    document.getElementById('user-email').textContent = test.email;
    document.getElementById('user-mbti').textContent = test.mbtiType;
    document.getElementById('analysis-date').textContent = new Date().toLocaleString('tr-TR');
    
    // Scores
    const scoresGrid = document.getElementById('scores-grid');
    scoresGrid.innerHTML = `
        <div class="score-item">
            <div class="score-label">Dışadönük / İçedönük</div>
            <div class="score-values">
                <span>E: ${test.scores.E || 0}</span>
                <span>I: ${test.scores.I || 0}</span>
            </div>
        </div>
        <div class="score-item">
            <div class="score-label">Duyumsama / Sezgi</div>
            <div class="score-values">
                <span>S: ${test.scores.S || 0}</span>
                <span>N: ${test.scores.N || 0}</span>
            </div>
        </div>
        <div class="score-item">
            <div class="score-label">Düşünme / Hissetme</div>
            <div class="score-values">
                <span>T: ${test.scores.T || 0}</span>
                <span>F: ${test.scores.F || 0}</span>
            </div>
        </div>
        <div class="score-item">
            <div class="score-label">Yargılama / Algılama</div>
            <div class="score-values">
                <span>J: ${test.scores.J || 0}</span>
                <span>P: ${test.scores.P || 0}</span>
            </div>
        </div>
    `;
    
    // AI Analysis
    const analysisText = document.getElementById('analysis-text');
    analysisText.innerHTML = formatAnalysisText(analysis);
}

// Format Analysis Text - Improved Markdown Parser
function formatAnalysisText(text) {
    if (!text) return '<p>Analiz bulunamadı.</p>';
    
    // Escape HTML to prevent XSS
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Headers (must be before other formatting)
    formatted = formatted
        .replace(/^#### (.*?)$/gm, '<h4>$1</h4>')
        .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
        .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
        .replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    
    // Bold and Italic
    formatted = formatted
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/__(.*?)__/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Code blocks
    formatted = formatted
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Links
    formatted = formatted
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    // Lists - Ordered and Unordered
    formatted = formatted.replace(/^(\d+)\.\s+(.*?)$/gm, '<li>$2</li>');
    formatted = formatted.replace(/^[-*+]\s+(.*?)$/gm, '<li>$1</li>');
    
    // Wrap consecutive list items in ul/ol tags
    formatted = formatted.replace(/(<li>.*?<\/li>\n?)+/g, function(match) {
        const isOrdered = /\d+\./.test(match);
        const listItems = match.trim().split('</li>').filter(item => item.trim());
        const wrappedItems = listItems.map(item => {
            const content = item.replace('<li>', '').trim();
            return `<li>${content}</li>`;
        }).join('\n');
        return isOrdered ? `<ol>${wrappedItems}</ol>` : `<ul>${wrappedItems}</ul>`;
    });
    
    // Horizontal rules
    formatted = formatted.replace(/^---$/gm, '<hr>');
    formatted = formatted.replace(/^\*\*\*$/gm, '<hr>');
    
    // Blockquotes
    formatted = formatted.replace(/^>\s+(.*?)$/gm, '<blockquote>$1</blockquote>');
    
    // Line breaks - convert double newlines to paragraph breaks
    formatted = formatted.split('\n\n').map(para => {
        para = para.trim();
        if (!para) return '';
        
        if (para.startsWith('<h') || 
            para.startsWith('<ul') || 
            para.startsWith('<ol') || 
            para.startsWith('<li') ||
            para.startsWith('<pre') ||
            para.startsWith('<blockquote') ||
            para.startsWith('<hr')) {
            return para;
        }
        
        para = para.replace(/\n/g, '<br>');
        return `<p>${para}</p>`;
    }).join('\n');
    
    // Clean up empty paragraphs
    formatted = formatted.replace(/<p><\/p>/g, '');
    formatted = formatted.replace(/<p>\s*<\/p>/g, '');
    
    return formatted;
}

// Copy Analysis
function copyAnalysis() {
    const analysisText = analysisData.analysis;
    
    navigator.clipboard.writeText(analysisText).then(() => {
        // Success feedback
        const btn = document.querySelector('.btn-copy');
        const originalText = btn.textContent;
        btn.textContent = '✓ Kopyalandı!';
        btn.style.background = 'var(--success-color)';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        alert('Kopyalama başarısız oldu');
    });
}

// Print Analysis
function printAnalysis() {
    window.print();
}

// Download Analysis (simplified - browser print to PDF)
function downloadAnalysis() {
    alert('PDF indirmek için:\n\n1. "Yazdır" butonuna tıklayın\n2. Yazıcı seçiminde "PDF olarak kaydet" seçin\n3. Kaydet butonuna tıklayın');
    window.print();
}

// Email Analysis
async function emailAnalysis() {
    if (!analysisData) return;
    
    const { test, analysis } = analysisData;
    const subject = `MBTI Test Sonuçlarınız - ${test.mbtiType}`;
    const body = `Merhaba ${test.name || ''},\n\n` +
                 `MBTI Test sonuçlarınız:\n\n` +
                 `MBTI Tipi: ${test.mbtiType}\n\n` +
                 `${analysis}\n\n` +
                 `İyi günler!`;
    
    const mailtoLink = `mailto:${test.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.location.href = mailtoLink;
}

// UI State Management
function showLoading() {
    document.getElementById('loading-state').classList.remove('hidden');
    document.getElementById('error-state').classList.add('hidden');
    document.getElementById('success-state').classList.add('hidden');
}

function showError(message) {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('error-state').classList.remove('hidden');
    document.getElementById('success-state').classList.add('hidden');
    document.getElementById('error-message').textContent = message;
}

function showSuccess() {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('error-state').classList.add('hidden');
    document.getElementById('success-state').classList.remove('hidden');
}

