// ============================================
// Result Page Script
// ============================================

const API_URL = window.location.origin + '/api';
const token = localStorage.getItem('token');

// Result State
const resultState = {
    slug: null,
    test: null,
    result: null,
    questions: []
};

// MBTI Type Descriptions
const mbtiDescriptions = {
    'INTJ': { name: 'Mimar', desc: 'Stratejik, analitik ve bağımsız düşünür. Uzun vadeli vizyona sahip, sistemli planlayıcı.' },
    'INTP': { name: 'Mantıkçı', desc: 'Meraklı, analitik ve yaratıcı problem çözücü. Teorik düşünmeye yatkın.' },
    'ENTJ': { name: 'Komutan', desc: 'Lider, kararlı ve organize. Hedef odaklı, etkili karar alıcı.' },
    'ENTP': { name: 'Münazaracı', desc: 'Yenilikçi, meraklı ve tartışmayı seven. Yaratıcı problem çözücü.' },
    'INFJ': { name: 'Savunucu', desc: 'İdealist, sezgisel ve empatik. İnsanlara yardım etme odaklı, vizyoner.' },
    'INFP': { name: 'Arabulucu', desc: 'İdealist, yaratıcı ve değer odaklı. Derin duygular ve otantiklik.' },
    'ENFJ': { name: 'Kahramanca Önder', desc: 'Karizmatik, empatik ve ilham verici lider. İnsanları geliştirmeye odaklı.' },
    'ENFP': { name: 'Aktivist', desc: 'Coşkulu, yaratıcı ve sosyal. Yeni olasılıkları keşfetmeyi seven.' },
    'ISTJ': { name: 'Lojistikçi', desc: 'Güvenilir, pratik ve detay odaklı. Sistemli ve sorumlu.' },
    'ISFJ': { name: 'Koruyucu', desc: 'Koruyucu, sadık ve dikkatli. İnsanlara hizmet etmeyi seven.' },
    'ESTJ': { name: 'Yönetici', desc: 'Organize, pratik ve karar verici. Kuralları ve düzeni önemseyen lider.' },
    'ESFJ': { name: 'Konsolos', desc: 'Sosyal, yardımsever ve organize. Harmoniyi önemseyen, destekleyici.' },
    'ISTP': { name: 'Virtüöz', desc: 'Pratik, esnek ve mekanik becerileri yüksek. Sorun çözmeyi seven.' },
    'ISFP': { name: 'Maceracı', desc: 'Yaratıcı, esnek ve deneyim odaklı. Estetik ve özgürlük değerli.' },
    'ESTP': { name: 'Girişimci', desc: 'Enerjik, pratik ve risk alabilen. Anı yaşayan, hızlı karar alıcı.' },
    'ESFP': { name: 'Eğlendirici', desc: 'Sosyal, spontane ve eğlenceli. İnsanlarla olmayı seven, yaşam dolu.' }
};

// AI Therapist Type Descriptions
const therapistDescriptions = {
    'DUYGUSAL_REHBER': { 
        name: 'Duygusal Rehber', 
        icon: '💗',
        desc: 'Empatik, destekleyici ve esnek bir yaklaşım. Duygularınızı anlamak ve işlemek için size eşlik eder.' 
    },
    'SICAK_MENTOR': { 
        name: 'Sıcak Mentor', 
        icon: '🤗',
        desc: 'Şefkatli ve yapılandırılmış bir rehber. Hem duygusal destek hem de somut adımlar sunar.' 
    },
    'MOTİVASYONEL_KOÇ': { 
        name: 'Motivasyonel Koç', 
        icon: '🔥',
        desc: 'Enerjik ve ilham verici. Sizi harekete geçirmek ve potansiyelinizi ortaya çıkarmak için çalışır.' 
    },
    'YAŞAM_KOÇU': { 
        name: 'Yaşam Koçu', 
        icon: '🌟',
        desc: 'Hedef odaklı ve yönlendirici. Hayatınızı dönüştürmek için somut planlar oluşturur.' 
    },
    'BİLİŞSEL_DANIŞMAN': { 
        name: 'Bilişsel Danışman', 
        icon: '🧩',
        desc: 'Düşünce kalıplarınızı analiz eden ve dönüştüren bir yaklaşım. Esnek ve destekleyici.' 
    },
    'CBT_UZMANI': { 
        name: 'CBT Uzmanı', 
        icon: '📋',
        desc: 'Bilişsel davranışçı terapi odaklı. Yapılandırılmış tekniklerle düşünce ve davranışları değiştirir.' 
    },
    'STRATEJİK_DANIŞMAN': { 
        name: 'Stratejik Danışman', 
        icon: '🎯',
        desc: 'Analitik ve çözüm odaklı. Sorunları mantıksal olarak parçalayıp çözüm üretir.' 
    },
    'PROBLEM_ÇÖZÜCÜ': { 
        name: 'Problem Çözücü', 
        icon: '⚡',
        desc: 'Hızlı ve etkili. Somut sorunlara yapılandırılmış çözümler sunar.' 
    },
    'GENEL_TERAPİST': { 
        name: 'Genel Terapist', 
        icon: '🤖',
        desc: 'Dengeli ve çok yönlü bir yaklaşım. İhtiyaçlarınıza göre adapte olur.' 
    }
};

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    resultState.slug = urlParams.get('test');
    
    if (!resultState.slug) {
        showToast('error', 'Test bulunamadı');
        window.location.href = '/';
        return;
    }
    
    await loadResult();
});

// ============================================
// Load Result
// ============================================
async function loadResult() {
    try {
        const response = await apiRequest(`/tests/${resultState.slug}/result`);
        
        if (!response.completed) {
            showToast('warning', 'Test henüz tamamlanmadı');
            window.location.href = `/test.html?test=${resultState.slug}`;
            return;
        }
        
        resultState.test = response.test;
        resultState.result = response.result;
        resultState.questions = response.questions;
        
        // Update page title
        document.title = `${response.test.name} Sonuçları - Symbiont AI`;
        
        // Render result
        renderResult();
        
        // Check if AI analysis exists
        if (resultState.result.aiAnalysis) {
            showAnalysis(resultState.result.aiAnalysis);
        } else {
            // Generate new analysis
            await generateAnalysis();
        }
        
    } catch (error) {
        console.error('Load result error:', error);
        showToast('error', error.message || 'Sonuçlar yüklenemedi');
    }
}

// ============================================
// Render Result
// ============================================
function renderResult() {
    const test = resultState.test;
    const result = resultState.result;
    
    // Update badge
    const badgeEl = document.querySelector('.result-badge span:last-child');
    if (badgeEl) badgeEl.textContent = test.name;
    
    document.getElementById('result-icon').textContent = test.icon;
    document.getElementById('meta-test').textContent = test.name;
    
    // Update result type
    const resultType = result.resultType;
    document.getElementById('result-type').textContent = resultType;
    
    // Get description based on test type
    let description;
    if (test.slug === 'mbti') {
        description = mbtiDescriptions[resultType];
        document.getElementById('result-subtitle').textContent = description?.name || resultType;
    } else if (test.slug === 'ai-therapist') {
        description = therapistDescriptions[resultType];
        if (description) {
            document.getElementById('result-icon').textContent = description.icon;
            document.getElementById('result-subtitle').textContent = description.name;
        }
    } else {
        document.getElementById('result-subtitle').textContent = 'Test Sonucunuz';
    }
    
    // Render scores
    renderScores(result.scores, test.slug);
    
    // Trigger celebration
    setTimeout(() => {
        document.getElementById('celebration').style.opacity = '1';
    }, 500);
}

// ============================================
// Render Scores
// ============================================
function renderScores(scores, testSlug) {
    const container = document.getElementById('scores-grid');
    
    if (testSlug === 'mbti') {
        const dimensions = [
            { label: 'Dışadönük (E) vs İçedönük (I)', keys: ['E', 'I'] },
            { label: 'Duyumsama (S) vs Sezgi (N)', keys: ['S', 'N'] },
            { label: 'Düşünme (T) vs Hissetme (F)', keys: ['T', 'F'] },
            { label: 'Yargılama (J) vs Algılama (P)', keys: ['J', 'P'] }
        ];
        
        container.innerHTML = dimensions.map(dim => {
            const [key1, key2] = dim.keys;
            const score1 = scores[key1] || 0;
            const score2 = scores[key2] || 0;
            const total = score1 + score2;
            const percentage = total > 0 ? (score1 / total) * 100 : 50;
            const winner = score1 >= score2 ? key1 : key2;
            
            return `
                <div class="score-item">
                    <div class="score-label">${dim.label}</div>
                    <div class="score-bar-container">
                        <span class="${winner === key1 ? 'score-winner' : ''}">${key1}</span>
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="${winner === key2 ? 'score-winner' : ''}">${key2}</span>
                    </div>
                    <div class="score-values">
                        <span>${score1}</span>
                        <span>${score2}</span>
                    </div>
                </div>
            `;
        }).join('');
    } else if (testSlug === 'ai-therapist') {
        const dimensions = [
            { label: 'Empatik vs Analitik', keys: ['empathetic', 'analytical'] },
            { label: 'Yönlendirici vs Destekleyici', keys: ['directive', 'supportive'] },
            { label: 'Yapılandırılmış vs Esnek', keys: ['structured', 'flexible'] }
        ];
        
        container.innerHTML = dimensions.map(dim => {
            const [key1, key2] = dim.keys;
            const score1 = scores[key1] || 0;
            const score2 = scores[key2] || 0;
            const total = score1 + score2;
            const percentage = total > 0 ? (score1 / total) * 100 : 50;
            
            const label1 = key1.charAt(0).toUpperCase() + key1.slice(1);
            const label2 = key2.charAt(0).toUpperCase() + key2.slice(1);
            
            return `
                <div class="score-item">
                    <div class="score-label">${dim.label}</div>
                    <div class="score-bar-container">
                        <span class="${score1 >= score2 ? 'score-winner' : ''}">${label1.substring(0, 3)}</span>
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="${score2 > score1 ? 'score-winner' : ''}">${label2.substring(0, 3)}</span>
                    </div>
                    <div class="score-values">
                        <span>${score1}</span>
                        <span>${score2}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// ============================================
// AI Analysis
// ============================================
async function generateAnalysis() {
    const loadingEl = document.getElementById('analysis-loading');
    const contentEl = document.getElementById('analysis-content');
    const errorEl = document.getElementById('analysis-error');
    const regenerateBtn = document.getElementById('regenerate-btn');
    
    loadingEl.classList.remove('hidden');
    contentEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    regenerateBtn.style.display = 'none';
    
    try {
        const response = await apiRequest(`/tests/${resultState.slug}/analyze`, {
            method: 'POST'
        });
        
        if (response.success && response.analysis) {
            showAnalysis(response.analysis);
        } else {
            showAnalysisError('Analiz oluşturulamadı');
        }
    } catch (error) {
        console.error('Generate analysis error:', error);
        showAnalysisError(error.message || 'AI servisiyle bağlantı kurulamadı');
    }
}

function showAnalysis(analysis) {
    const loadingEl = document.getElementById('analysis-loading');
    const contentEl = document.getElementById('analysis-content');
    const errorEl = document.getElementById('analysis-error');
    const textEl = document.getElementById('analysis-text');
    const regenerateBtn = document.getElementById('regenerate-btn');
    
    loadingEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    contentEl.classList.remove('hidden');
    regenerateBtn.style.display = 'inline-flex';
    
    textEl.innerHTML = formatAnalysisText(analysis);
}

function showAnalysisError(message) {
    const loadingEl = document.getElementById('analysis-loading');
    const contentEl = document.getElementById('analysis-content');
    const errorEl = document.getElementById('analysis-error');
    const errorMessage = document.getElementById('error-message');
    
    loadingEl.classList.add('hidden');
    contentEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
    errorMessage.textContent = message;
}

async function regenerateAnalysis() {
    await generateAnalysis();
}

// ============================================
// Format Analysis Text (Markdown to HTML)
// ============================================
function formatAnalysisText(text) {
    if (!text) return '<p>Analiz bulunamadı.</p>';
    
    // Escape HTML
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Headers
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
    
    // Lists
    formatted = formatted.replace(/^[-*+]\s+(.*?)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/^(\d+)\.\s+(.*?)$/gm, '<li>$2</li>');
    
    // Wrap list items
    formatted = formatted.replace(/(<li>.*?<\/li>\n?)+/g, function(match) {
        return '<ul>' + match + '</ul>';
    });
    
    // Horizontal rules
    formatted = formatted.replace(/^---$/gm, '<hr>');
    formatted = formatted.replace(/^\*\*\*$/gm, '<hr>');
    
    // Blockquotes
    formatted = formatted.replace(/^>\s+(.*?)$/gm, '<blockquote>$1</blockquote>');
    
    // Paragraphs
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
    
    // Clean up
    formatted = formatted.replace(/<p><\/p>/g, '');
    formatted = formatted.replace(/<p>\s*<\/p>/g, '');
    
    return formatted;
}

// ============================================
// Copy Analysis
// ============================================
function copyAnalysis() {
    const textEl = document.getElementById('analysis-text');
    if (!textEl || textEl.innerText.trim() === '') {
        showToast('warning', 'Henüz analiz yok');
        return;
    }
    
    const text = textEl.innerText || textEl.textContent;
    const test = resultState.test;
    const result = resultState.result;
    
    const fullText = `
${test.name} Sonuçları
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sonucunuz: ${result.resultType}

${text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Symbiont AI - Psikoloji Testleri
    `.trim();
    
    navigator.clipboard.writeText(fullText).then(() => {
        showToast('success', 'Analiz kopyalandı!');
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast('error', 'Kopyalama başarısız');
    });
}

// ============================================
// Share Result
// ============================================
function shareResult() {
    const test = resultState.test;
    const result = resultState.result;
    
    const shareText = `${test.name} testimi tamamladım! Sonucum: ${result.resultType} 🎯`;
    const shareUrl = window.location.origin;
    
    if (navigator.share) {
        navigator.share({
            title: `${test.name} Sonuçları`,
            text: shareText,
            url: shareUrl
        }).then(() => {
            showToast('success', 'Paylaşıldı!');
        }).catch(err => {
            if (err.name !== 'AbortError') {
                console.error('Share failed:', err);
            }
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
            showToast('success', 'Link kopyalandı!');
        }).catch(err => {
            console.error('Copy failed:', err);
            showToast('error', 'Paylaşma başarısız');
        });
    }
}

// ============================================
// UI Utilities
// ============================================
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
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    
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

