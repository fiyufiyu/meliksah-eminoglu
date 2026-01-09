// ============================================
// Test Page Script - Supports Binary & Multiple Choice
// ============================================

const API_URL = window.location.origin + '/api';
const token = localStorage.getItem('token');

// Test State
const testState = {
    slug: null,
    test: null,
    questions: [],
    currentQuestion: 1,
    totalQuestions: 0,
    answers: {},
    resultId: null,
    questionType: 'binary' // 'binary' or 'multiple_choice'
};

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    // Get test slug from URL
    const urlParams = new URLSearchParams(window.location.search);
    testState.slug = urlParams.get('test');
    
    if (!testState.slug) {
        showToast('error', 'Test bulunamadı');
        window.location.href = '/';
        return;
    }
    
    await loadTest();
    setupKeyboardShortcuts();
});

// ============================================
// Load Test
// ============================================
async function loadTest() {
    showLoading(true, 'Test yükleniyor...');
    
    try {
        // Get test details
        const testResponse = await apiRequest(`/tests/${testState.slug}`);
        
        testState.test = testResponse.test;
        testState.questions = testResponse.questions;
        testState.totalQuestions = testResponse.questions.length;
        
        // Determine question type from first question
        if (testState.questions.length > 0 && testState.questions[0].question_type === 'multiple_choice') {
            testState.questionType = 'multiple_choice';
        } else {
            testState.questionType = 'binary';
        }
        
        // Check if test already completed
        if (testResponse.userResult?.is_completed) {
            window.location.href = `/result.html?test=${testState.slug}`;
            return;
        }
        
        // Load saved answers if any
        if (testResponse.userResult?.answers) {
            testState.answers = testResponse.userResult.answers;
        }
        
        // Start or continue test
        const startResponse = await apiRequest(`/tests/${testState.slug}/start`, {
            method: 'POST'
        });
        
        if (startResponse.alreadyCompleted) {
            window.location.href = `/result.html?test=${testState.slug}`;
            return;
        }
        
        testState.resultId = startResponse.resultId;
        
        if (startResponse.answers && Object.keys(startResponse.answers).length > 0) {
            testState.answers = startResponse.answers;
            // Find the first unanswered question
            for (let i = 1; i <= testState.totalQuestions; i++) {
                if (!testState.answers[i]) {
                    testState.currentQuestion = i;
                    break;
                }
            }
        }
        
        // Setup layout based on question type
        setupLayout();
        
        // Update UI
        updateTestHeader();
        loadQuestion(testState.currentQuestion);
        
    } catch (error) {
        console.error('Load test error:', error);
        showToast('error', error.message || 'Test yüklenemedi');
        setTimeout(() => window.location.href = '/', 2000);
    } finally {
        showLoading(false);
    }
}

// ============================================
// Setup Layout based on Question Type
// ============================================
function setupLayout() {
    const binaryLayout = document.getElementById('binary-layout');
    const multipleLayout = document.getElementById('multiple-layout');
    
    if (testState.questionType === 'multiple_choice') {
        binaryLayout.classList.add('hidden');
        multipleLayout.classList.remove('hidden');
    } else {
        binaryLayout.classList.remove('hidden');
        multipleLayout.classList.add('hidden');
    }
}

// ============================================
// Update Test Header
// ============================================
function updateTestHeader() {
    document.title = `${testState.test.name} - Symbiont AI`;
    document.getElementById('test-icon').textContent = testState.test.icon;
    document.getElementById('test-title').textContent = testState.test.name;
    document.getElementById('total-q').textContent = testState.totalQuestions;
}

// ============================================
// Load Question
// ============================================
function loadQuestion(num) {
    const question = testState.questions[num - 1];
    
    if (!question) {
        console.error('Question not found:', num);
        return;
    }
    
    // Update question number display
    document.getElementById('q-number').textContent = num;
    document.getElementById('current-q').textContent = num;
    document.getElementById('section-indicator').textContent = question.section || '';
    
    // Update progress
    const progress = (num / testState.totalQuestions) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    
    if (testState.questionType === 'multiple_choice') {
        loadMultipleChoiceQuestion(question);
    } else {
        loadBinaryQuestion(question);
    }
    
    // Load saved answer if exists
    const savedAnswer = testState.answers[num];
    
    // Clear all selections
    document.querySelectorAll('.answer-option').forEach(btn => {
        btn.classList.remove('selected');
        if (savedAnswer && btn.dataset.answer === savedAnswer) {
            btn.classList.add('selected');
        }
    });
    
    // Update navigation buttons
    document.getElementById('prev-btn').disabled = num === 1;
    
    const nextBtn = document.getElementById('next-btn');
    if (num === testState.totalQuestions) {
        nextBtn.textContent = 'Testi Bitir ✓';
    } else {
        nextBtn.textContent = 'Sonraki →';
    }
    nextBtn.disabled = !savedAnswer;
    
    testState.currentQuestion = num;
}

// ============================================
// Load Binary Question (Left/Right format)
// ============================================
function loadBinaryQuestion(question) {
    document.getElementById('top-text').textContent = question.left_text;
    document.getElementById('bottom-text').textContent = question.right_text;
}

// ============================================
// Load Multiple Choice Question (A-E options)
// ============================================
function loadMultipleChoiceQuestion(question) {
    // Set main question text
    document.getElementById('question-main-text').textContent = question.left_text;
    
    // Parse options
    let options = question.options;
    if (typeof options === 'string') {
        try {
            options = JSON.parse(options);
        } catch (e) {
            console.error('Failed to parse options:', e);
            options = {};
        }
    }
    
    // Update option texts
    document.getElementById('option-a-text').textContent = options.A || 'Seçenek A';
    document.getElementById('option-b-text').textContent = options.B || 'Seçenek B';
    document.getElementById('option-c-text').textContent = options.C || 'Seçenek C';
    document.getElementById('option-d-text').textContent = options.D || 'Seçenek D';
    document.getElementById('option-e-text').textContent = options.E || 'Seçenek E';
}

// ============================================
// Select Answer
// ============================================
async function selectAnswer(answer) {
    // Update UI
    const answerListId = testState.questionType === 'multiple_choice' ? 'multiple-answers' : 'binary-answers';
    document.querySelectorAll(`#${answerListId} .answer-option`).forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.answer === answer) {
            btn.classList.add('selected');
        }
    });
    
    // Save to state
    testState.answers[testState.currentQuestion] = answer;
    
    // Enable next button
    document.getElementById('next-btn').disabled = false;
    
    // Save to server
    try {
        await apiRequest(`/tests/${testState.slug}/answer`, {
            method: 'POST',
            body: JSON.stringify({
                questionNumber: testState.currentQuestion,
                answer: answer
            })
        });
    } catch (error) {
        console.error('Save answer error:', error);
        // Don't show error toast, just log it - answer is saved locally
    }
}

// ============================================
// Navigation
// ============================================
function nextQuestion() {
    if (testState.currentQuestion < testState.totalQuestions) {
        loadQuestion(testState.currentQuestion + 1);
    } else {
        completeTest();
    }
}

function previousQuestion() {
    if (testState.currentQuestion > 1) {
        loadQuestion(testState.currentQuestion - 1);
    }
}

// ============================================
// Complete Test
// ============================================
async function completeTest() {
    // Check if all questions answered
    const answeredCount = Object.keys(testState.answers).length;
    if (answeredCount < testState.totalQuestions) {
        showToast('warning', `Lütfen tüm soruları cevaplayın (${answeredCount}/${testState.totalQuestions})`);
        return;
    }
    
    showLoading(true, 'Test tamamlanıyor...');
    
    try {
        const response = await apiRequest(`/tests/${testState.slug}/complete`, {
            method: 'POST'
        });
        
        if (response.success) {
            showToast('success', 'Test tamamlandı!');
            
            // Redirect to results
            setTimeout(() => {
                window.location.href = `/result.html?test=${testState.slug}`;
            }, 1000);
        } else {
            showToast('error', 'Test tamamlanamadı');
        }
    } catch (error) {
        console.error('Complete test error:', error);
        showToast('error', error.message || 'Test tamamlanamadı');
    } finally {
        showLoading(false);
    }
}

// ============================================
// Keyboard Shortcuts
// ============================================
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if in input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch(e.key) {
            case '1':
                selectAnswer('A');
                break;
            case '2':
                selectAnswer('B');
                break;
            case '3':
                selectAnswer('C');
                break;
            case '4':
                selectAnswer('D');
                break;
            case '5':
                if (testState.questionType === 'multiple_choice') {
                    selectAnswer('E');
                }
                break;
            case 'ArrowLeft':
                if (!document.getElementById('prev-btn').disabled) {
                    previousQuestion();
                }
                break;
            case 'ArrowRight':
                if (!document.getElementById('next-btn').disabled) {
                    nextQuestion();
                }
                break;
            case 'Enter':
                if (!document.getElementById('next-btn').disabled) {
                    nextQuestion();
                }
                break;
        }
    });
}

// ============================================
// UI Utilities
// ============================================
function showLoading(show, text = 'Yükleniyor...') {
    const loading = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    
    if (loadingText) loadingText.textContent = text;
    
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
