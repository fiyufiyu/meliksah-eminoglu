require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// OpenAI Client - Optional (only initialize if API key exists)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('✅ OpenAI client initialized');
} else {
  console.warn('⚠️ OPENAI_API_KEY not found - AI analysis will be disabled');
}

// Stored Prompt IDs (will be updated by user)
const PROMPT_IDS = {
  mbti: process.env.MBTI_PROMPT_ID || 'pmpt_695a48bfde2c81979053d77844965dda0c832f12945d6553',
  ai_therapist: process.env.AI_THERAPIST_PROMPT_ID || '' // User will provide
};

const PROMPT_VERSIONS = {
  mbti: process.env.MBTI_PROMPT_VERSION || '3',
  ai_therapist: process.env.AI_THERAPIST_PROMPT_VERSION || '1'
};

// Middleware
app.use(cors({ credentials: true, origin: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Protected admin route (must be before static middleware)
app.get('/admin.html', authenticateAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Static files (after protected routes)
app.use(express.static('public'));

// PostgreSQL Connection - Railway compatible
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/psycho_tests',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Veritabanı bağlantı hatası:', err.message);
  } else {
    console.log('✅ PostgreSQL bağlantısı başarılı:', res.rows[0].now);
    initDatabase();
  }
});

// Initialize Database Schema
async function initDatabase() {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tests table (available tests)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tests (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(10),
        question_count INTEGER DEFAULT 0,
        duration_minutes INTEGER DEFAULT 15,
        color VARCHAR(50) DEFAULT '#6366f1',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Test questions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_questions (
        id SERIAL PRIMARY KEY,
        test_id INTEGER REFERENCES tests(id),
        question_number INTEGER NOT NULL,
        left_text TEXT NOT NULL,
        right_text TEXT NOT NULL,
        section VARCHAR(255),
        question_type VARCHAR(50) DEFAULT 'binary',
        options JSONB,
        UNIQUE(test_id, question_number)
      )
    `);
    
    // Add new columns if they don't exist (for existing databases)
    await pool.query(`
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE test_questions ADD COLUMN question_type VARCHAR(50) DEFAULT 'binary';
        EXCEPTION WHEN duplicate_column THEN NULL;
        END;
        BEGIN
          ALTER TABLE test_questions ADD COLUMN options JSONB;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END;
      END $$;
    `);

    // User test results table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_test_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        test_id INTEGER REFERENCES tests(id),
        answers JSONB DEFAULT '{}',
        result_type VARCHAR(50),
        scores JSONB DEFAULT '{}',
      ai_analysis TEXT,
        is_completed BOOLEAN DEFAULT false,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        analysis_date TIMESTAMP,
        UNIQUE(user_id, test_id)
      )
    `);

    console.log('✅ Veritabanı tabloları hazır');

    // Seed default tests if not exist
    await seedDefaultTests();

  } catch (err) {
    console.error('❌ Tablo oluşturma hatası:', err);
  }
}

// Seed default tests
async function seedDefaultTests() {
  try {
    // Check if AI Therapist test exists
    const existing = await pool.query("SELECT id FROM tests WHERE slug = 'ai-therapist'");
    
    if (existing.rows.length > 0) {
      console.log('📋 AI Mental Destek Stili testi zaten mevcut');
      return;
    }

    // Insert AI Mental Destek Stili test
    await pool.query(`
      INSERT INTO tests (slug, name, description, icon, question_count, duration_minutes, color)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      'ai-therapist',
      'AI Mental Destek Stili',
      'Sizin için en uygun AI terapist yaklaşımını keşfedin. 20 soru ile kişiselleştirilmiş destek stili profiliniz oluşturulacak.',
      '🧠',
      20,
      15,
      '#8b5cf6'
    ]);

    // Seed AI Therapist questions
    await seedAITherapistQuestions();

    console.log('✅ AI Mental Destek Stili testi eklendi');
  } catch (err) {
    console.error('❌ Test ekleme hatası:', err);
  }
}

// Seed MBTI Questions
// Seed AI Therapist Questions
async function seedAITherapistQuestions() {
  const therapistTest = await pool.query("SELECT id FROM tests WHERE slug = 'ai-therapist'");
  if (therapistTest.rows.length === 0) return;
  
  const testId = therapistTest.rows[0].id;

  // First, delete old questions for this test
  await pool.query('DELETE FROM test_questions WHERE test_id = $1', [testId]);

  const questions = [
    {
      num: 1,
      text: "1. AI terapist, seninle konuşurken en çok hangi rolde faydalı olur?",
      section: "Temel Rol Tercihi",
      options: {
        A: "Sadece alan açan, dinleyen, anlaşıldığımı hissettiren",
        B: "Kafayı toparlatan, netleştiren, çerçeveleyen",
        C: "Duygu yükselince hızla regüle eden",
        D: "Problem çözen, adım çıkaran, uygulamaya iten",
        E: "Örüntü yakalayan, \"aynı filmi\" fark ettiren"
      }
    },
    {
      num: 2,
      text: "2. AI'nin genel tonu nasıl olsun?",
      section: "Ton ve Üslup",
      options: {
        A: "Çok yumuşak, sakin, şefkatli",
        B: "Sakin ama net; tatlı-sert",
        C: "Dengeli; hem sıcak hem ciddi",
        D: "Direkt ve keskin; gerektiğinde sert",
        E: "Koç gibi disiplinli; sonuç odaklı"
      }
    },
    {
      num: 3,
      text: "3. Konuşmayı AI nasıl yönetmeli?",
      section: "Konuşma Yönetimi",
      options: {
        A: "Ben anlatayım, o arada kısa yansıtma yapsın",
        B: "Soru sorarak beni konuştursun",
        C: "Sık özetleyip \"şu an bu noktadayız\" diye sabitlesin",
        D: "Hızlı analiz edip bir çerçeve kurup onunla gitsin",
        E: "Yanlış yaptığım yerde durdurup yüzleştirsin"
      }
    },
    {
      num: 4,
      text: "4. AI'nin \"yüzleştirme\" seviyesi ne kadar olsun?",
      section: "Yüzleştirme Seviyesi",
      options: {
        A: "Hiç; sadece destek ve anlayış",
        B: "Çok hafif; kırmadan dokundursun",
        C: "Orta; nazik ama net işaret etsin",
        D: "Yüksek; direkt söyleyip keskinleştirsin",
        E: "Çok yüksek; bahane bırakmasın"
      }
    },
    {
      num: 5,
      text: "5. İlk mesajlarda AI hangi kapıdan girmeli?",
      section: "Giriş Yaklaşımı",
      options: {
        A: "\"Şu an iç dünyanda ne oluyor?\" diye duyguya girsin",
        B: "\"Ne yaşadın, ne oldu?\" diye olayları toplasın",
        C: "\"Bu konuşmadan ne almak istiyorsun?\" diye hedef koydursun",
        D: "\"Şu an kaç/10 zor?\" diye yoğunluğu ölçüp triage yapsın",
        E: "\"Bu daha önce de oluyor mu?\" diye örüntü aramaya başlasın"
      }
    },
    {
      num: 6,
      text: "6. AI'nin ana önceliği hangisi olsun?",
      section: "Ana Öncelik",
      options: {
        A: "Rahatlatmak ve yükü azaltmak",
        B: "Netlik kazandırmak (adı koymak)",
        C: "Davranışa geçirmek (somut ilerleme)",
        D: "Esneklik/dayanıklılık geliştirmek",
        E: "Kök örüntüyü dönüştürmek"
      }
    },
    {
      num: 7,
      text: "7. Bir konuşmanın sonunda \"iyi geçti\" dedirten çıktı hangisi?",
      section: "Başarı Kriteri",
      options: {
        A: "İçim hafifledi, daha sakinim",
        B: "Aklım netleşti; \"mesele bu\" dedim",
        C: "1–2 küçük adımım var; ne yapacağım belli",
        D: "İlişkide söyleyeceğim cümle/çizdiğim sınır net",
        E: "Hem içgörü hem adım: anlam + hareket"
      }
    },
    {
      num: 8,
      text: "8. Tempo nasıl olsun?",
      section: "Tempo Tercihi",
      options: {
        A: "Yavaş; sindire sindire, derin",
        B: "Orta; dengeli",
        C: "Hızlı; direkt noktaya",
        D: "Benim enerjimi aynalasın (ben hızlıysam hızlı, yavaşsam yavaş)",
        E: "Duygu yükselince hızlansın, sakinleşince derinleşsin"
      }
    },
    {
      num: 9,
      text: "9. Mesajların \"yoğunluğu\" nasıl olsun?",
      section: "Mesaj Yoğunluğu",
      options: {
        A: "Çok kısa ve sade",
        B: "Kısa ama yön veren",
        C: "Orta; açıklayıcı ama boğmayan",
        D: "Derin ve detaylı; nüanslı",
        E: "Duruma göre; bazen kısa bazen uzun"
      }
    },
    {
      num: 10,
      text: "10. AI seni nasıl \"takip etsin\" ki bu süreç sende düzenli kullanım alışkanlığına dönüşsün?",
      section: "Takip ve Alışkanlık",
      options: {
        A: "Hiç takip etmesin; sadece o anki konuşmada kalsın",
        B: "Nazikçe hatırlatsın, ara ara yoklasın",
        C: "Hedef belirleyip düzenli check-in yapsın, ilerlemeyi görünür kılsın",
        D: "Net standart koysun; \"söz verdin\" gibi hesap sorabilsin",
        E: "Takibi ben yöneteyim; ne zaman istersem o zaman devreye girsin"
      }
    },
    {
      num: 11,
      text: "11. AI ne zaman \"mod değiştirsin\"?",
      section: "Mod Değiştirme",
      options: {
        A: "Ben açıkça isteyince",
        B: "Aynı noktada dönüp durduğum belli olunca",
        C: "Duygu taşması belirince",
        D: "Konuşma eyleme dönmüyorsa",
        E: "Her seferinde seçenek sunup bana seçtirsin"
      }
    },
    {
      num: 12,
      text: "12. Duygu yükseldiğinde AI ilk hamleyi nasıl yapsın?",
      section: "Duygu Regülasyonu",
      options: {
        A: "Aynalasın, güven versin, sakinleştirsin",
        B: "Kısa bir regülasyon akışı açsın",
        C: "Düşünce–duygu–davranış bağını hızlıca çıkarsın",
        D: "\"Şimdi ne yaparsak 1 tık iyileşir?\" diye eyleme çeksin",
        E: "Duygunun altındaki ihtiyaç/değeri buldursun"
      }
    },
    {
      num: 13,
      text: "13. Kaygı döngüsünde AI neye ağırlık versin?",
      section: "Kaygı Yönetimi",
      options: {
        A: "Belirsizliği sadeleştirsin; netlik oluştursun",
        B: "Belirsizlikle kalma kasını güçlendirsin",
        C: "Kontrol alanı / kontrol dışı ayrımı yaptırsın",
        D: "Varsayımı test eden sorularla düşünceyi çürütsün",
        E: "\"Şimdi çözmek zorunda değilsin\" deyip sistemden çıkarsın"
      }
    },
    {
      num: 14,
      text: "14. Aşırı düşünme (kafada dönme) olduğunda AI ne yapsın?",
      section: "Aşırı Düşünme",
      options: {
        A: "Yükü boşaltsın; iç dökmeye alan açsın",
        B: "Otomatik düşünceyi yakalayıp alternatif üretsin",
        C: "\"Bu bir zihin hikâyesi\" deyip mesafe koydursun",
        D: "Net bir karar kuralı koysun; seçim yaptırsın",
        E: "Döngünün altındaki korku/ihtiyacı açsın"
      }
    },
    {
      num: 15,
      text: "15. Erteleme/kaçınma olduğunda AI'nin yaklaşımı?",
      section: "Erteleme Yönetimi",
      options: {
        A: "Baskıyı azaltıp şefkatle eşlik etsin",
        B: "En küçük adıma bölsün; başlatmaya odaklansın",
        C: "Net hedef ve standart koysun; takip etsin",
        D: "Kaçınmayı yüzleştirip \"şu an kaçıyorsun\" desin",
        E: "Kaçınmanın sağladığı \"kazanç\"ı ortaya çıkarsın"
      }
    },
    {
      num: 16,
      text: "16. Öfke/taşkınlık olduğunda AI nasıl bir duruş alsın?",
      section: "Öfke Yönetimi",
      options: {
        A: "Tamamen yatıştırıcı; ortamı yumuşatsın",
        B: "Yatıştırıcı + sınır koyan (davranış çizgisi net)",
        C: "Direkt; sınırları sertçe çizen",
        D: "Analitik; tetikleyici ve mekanizmayı çözümleyen",
        E: "İletişim provası; cümle kurdurup alternatifleri deneten"
      }
    },
    {
      num: 17,
      text: "17. İlişki konusu açıldığında AI nereye odaklansın?",
      section: "İlişki Odağı",
      options: {
        A: "Önce benim duygum ve regülasyonum",
        B: "İletişim cümlesi ve prova",
        C: "Sınır koyma ve talep netliği",
        D: "Tekrarlayan ilişki örüntüm ve kök dinamik",
        E: "Karşı tarafı değil, benim kontrol alanımı büyütmek"
      }
    },
    {
      num: 18,
      text: "18. Geçmişe ne kadar girsin?",
      section: "Geçmiş Odağı",
      options: {
        A: "Hiç; sadece şimdi ve çözüm",
        B: "Az; sadece gerekli olduğunda",
        C: "Orta; örüntü çıkarmak için",
        D: "Derin; kök nedenleri anlamak için",
        E: "Konuya göre ayarlasın"
      }
    },
    {
      num: 19,
      text: "19. AI'nin seni \"tanıma ve hatırlama\" biçimi nasıl olsun?",
      section: "Hafıza ve Kişiselleştirme",
      options: {
        A: "Hiç hatırlamasın; her sohbet sıfırdan",
        B: "Sadece o sohbet içinde hatırlasın",
        C: "Sadece benim seçtiğim başlıkları/etiketleri hatırlasın",
        D: "Önemli noktaları hatırlayıp zamanla profili derinleştirsin",
        E: "Hatırlama tamamen benim kontrolümde olsun (aç/kapat, seç/sil)"
      }
    },
    {
      num: 20,
      text: "20. AI, konuşma içinde \"dil ve anlatım\" olarak nasıl konuşsun?",
      section: "Dil ve Anlatım",
      options: {
        A: "Çok sade; gündelik ve kısa",
        B: "Sade ama net; yer yer örnekli",
        C: "Analitik; kavramlandıran ama anlaşılır",
        D: "Metafor/benzetme kullanan; daha yaratıcı",
        E: "Benim dilimi aynalayan; üslubuma uyumlanan"
      }
    }
  ];

  // Update test question count
  await pool.query('UPDATE tests SET question_count = $1 WHERE id = $2', [questions.length, testId]);

  for (const q of questions) {
    await pool.query(`
      INSERT INTO test_questions (test_id, question_number, left_text, right_text, section, question_type, options)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (test_id, question_number) DO UPDATE SET
        left_text = $3,
        right_text = $4,
        section = $5,
        question_type = $6,
        options = $7
    `, [testId, q.num, q.text, '', q.section, 'multiple_choice', JSON.stringify(q.options)]);
  }
  
  console.log('✅ AI Mental Destek Stili soruları eklendi (20 soru)');
}

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş oturum' });
    }
    req.user = user;
    next();
  });
}

// Optional auth - doesn't block but provides user if logged in
function optionalAuth(req, res, next) {
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
  
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  next();
}

// Admin authentication middleware
function authenticateAdmin(req, res, next) {
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
  const isHtmlRequest = req.path.endsWith('.html') || req.accepts('html');
  
  if (!token) {
    if (isHtmlRequest) {
      return res.redirect('/?error=admin_login_required');
    }
    return res.status(401).json({ error: 'Admin erişimi için giriş yapmanız gerekiyor' });
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      if (isHtmlRequest) {
        return res.redirect('/?error=invalid_session');
      }
      return res.status(403).json({ error: 'Geçersiz oturum' });
    }
    
    // Check if user is admin
    try {
      const result = await pool.query('SELECT email FROM users WHERE id = $1', [user.id]);
      
      if (result.rows.length === 0 || result.rows[0].email !== 'meliksaheminoglutr@gmail.com') {
        if (isHtmlRequest) {
          return res.redirect('/?error=admin_access_denied');
        }
        return res.status(403).json({ error: 'Bu sayfaya erişim yetkiniz yok' });
      }
      
      req.user = user;
      next();
    } catch (error) {
      if (isHtmlRequest) {
        return res.redirect('/?error=auth_check_failed');
      }
      return res.status(500).json({ error: 'Yetki kontrolü başarısız' });
    }
  });
}

// ============== AUTH ROUTES ==============

// Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email ve şifre gerekli' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
  }

  try {
    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Bu email zaten kayıtlı' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hashedPassword, name || '']
    );

    const user = result.rows[0];

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({ 
      success: true, 
      user: { id: user.id, email: user.email, name: user.name },
      token
    });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Kayıt işlemi başarısız' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email ve şifre gerekli' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Geçersiz email veya şifre' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Geçersiz email veya şifre' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
      token
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Giriş işlemi başarısız' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Kullanıcı bilgisi alınamadı' });
  }
});

// ============== TEST ROUTES ==============

// Get all available tests
app.get('/api/tests', optionalAuth, async (req, res) => {
  try {
    const testsResult = await pool.query(`
      SELECT id, slug, name, description, icon, question_count, duration_minutes, color
      FROM tests
      WHERE is_active = true
      ORDER BY id
    `);

    let tests = testsResult.rows;

    // If user is logged in, add their completion status
    if (req.user) {
      const resultsResult = await pool.query(`
        SELECT test_id, is_completed, result_type
        FROM user_test_results
        WHERE user_id = $1
      `, [req.user.id]);

      const userResults = {};
      resultsResult.rows.forEach(r => {
        userResults[r.test_id] = { completed: r.is_completed, result: r.result_type };
      });

      tests = tests.map(test => ({
        ...test,
        userStatus: userResults[test.id] || null
      }));
    }

    res.json({ tests });
  } catch (err) {
    console.error('Get tests error:', err);
    res.status(500).json({ error: 'Testler alınamadı' });
  }
});

// Get test details with questions
app.get('/api/tests/:slug', authenticateToken, async (req, res) => {
  try {
    const testResult = await pool.query('SELECT * FROM tests WHERE slug = $1', [req.params.slug]);
    
    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test bulunamadı' });
    }

    const test = testResult.rows[0];

    // Get questions
    const questionsResult = await pool.query(`
      SELECT question_number, left_text, right_text, section, question_type, options
      FROM test_questions
      WHERE test_id = $1
      ORDER BY question_number
    `, [test.id]);

    // Get user's existing result for this test
    const userResultResult = await pool.query(`
      SELECT * FROM user_test_results
      WHERE user_id = $1 AND test_id = $2
    `, [req.user.id, test.id]);

    res.json({
      test,
      questions: questionsResult.rows,
      userResult: userResultResult.rows[0] || null
    });
  } catch (err) {
    console.error('Get test error:', err);
    res.status(500).json({ error: 'Test bilgisi alınamadı' });
  }
});

// Start or continue a test
app.post('/api/tests/:slug/start', authenticateToken, async (req, res) => {
  try {
    const testResult = await pool.query('SELECT * FROM tests WHERE slug = $1', [req.params.slug]);
    
    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test bulunamadı' });
    }

    const test = testResult.rows[0];

    // Check if user already has a result for this test
    const existingResult = await pool.query(`
      SELECT * FROM user_test_results
      WHERE user_id = $1 AND test_id = $2
    `, [req.user.id, test.id]);

    if (existingResult.rows.length > 0) {
      const result = existingResult.rows[0];
      
      // If test is completed, redirect to results
      if (result.is_completed) {
        return res.json({
          success: true,
          alreadyCompleted: true,
          resultId: result.id,
          resultType: result.result_type
        });
      }

      // Continue existing test
      return res.json({
        success: true,
        resultId: result.id,
        answers: result.answers || {},
        message: 'Teste devam ediliyor'
      });
    }

    // Create new test result
    const newResult = await pool.query(`
      INSERT INTO user_test_results (user_id, test_id, answers)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [req.user.id, test.id, JSON.stringify({})]);

    res.json({
      success: true,
      resultId: newResult.rows[0].id,
      answers: {},
      message: 'Test başlatıldı'
    });

  } catch (err) {
    console.error('Start test error:', err);
    res.status(500).json({ error: 'Test başlatılamadı' });
  }
});

// Save answer
app.post('/api/tests/:slug/answer', authenticateToken, async (req, res) => {
  const { questionNumber, answer } = req.body;

  try {
    const testResult = await pool.query('SELECT id FROM tests WHERE slug = $1', [req.params.slug]);
    
    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test bulunamadı' });
    }

    const testId = testResult.rows[0].id;

    // Get current answers
    const resultResult = await pool.query(`
      SELECT id, answers FROM user_test_results
      WHERE user_id = $1 AND test_id = $2
    `, [req.user.id, testId]);

    if (resultResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test sonucu bulunamadı' });
    }

    const result = resultResult.rows[0];
    const answers = result.answers || {};
    answers[questionNumber] = answer;

    // Update answers
    await pool.query(`
      UPDATE user_test_results
      SET answers = $1
      WHERE id = $2
    `, [JSON.stringify(answers), result.id]);

    res.json({ success: true });

  } catch (err) {
    console.error('Save answer error:', err);
    res.status(500).json({ error: 'Cevap kaydedilemedi' });
  }
});

// Complete test
app.post('/api/tests/:slug/complete', authenticateToken, async (req, res) => {
  try {
    const testResult = await pool.query('SELECT * FROM tests WHERE slug = $1', [req.params.slug]);
    
    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test bulunamadı' });
    }

    const test = testResult.rows[0];

    // Get user's answers
    const resultResult = await pool.query(`
      SELECT * FROM user_test_results
      WHERE user_id = $1 AND test_id = $2
    `, [req.user.id, test.id]);

    if (resultResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test sonucu bulunamadı' });
    }

    const userResult = resultResult.rows[0];
    const answers = userResult.answers || {};

    // Calculate result based on test type
    let resultType, scores;

    if (test.slug === 'mbti') {
      const calculation = calculateMBTI(answers);
      resultType = calculation.type;
      scores = calculation.scores;
    } else if (test.slug === 'ai-therapist') {
      const calculation = calculateAITherapist(answers);
      resultType = calculation.type;
      scores = calculation.scores;
    } else {
      resultType = 'COMPLETED';
      scores = {};
    }

    // Update result
    await pool.query(`
      UPDATE user_test_results
      SET result_type = $1, scores = $2, is_completed = true, completed_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [resultType, JSON.stringify(scores), userResult.id]);

      res.json({ 
        success: true, 
      resultType,
      scores
    });

  } catch (err) {
    console.error('Complete test error:', err);
    res.status(500).json({ error: 'Test tamamlanamadı' });
  }
});

// Get test result
app.get('/api/tests/:slug/result', authenticateToken, async (req, res) => {
  try {
    const testResult = await pool.query('SELECT * FROM tests WHERE slug = $1', [req.params.slug]);
    
    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test bulunamadı' });
    }

    const test = testResult.rows[0];

    // Get user's result
    const resultResult = await pool.query(`
      SELECT * FROM user_test_results
      WHERE user_id = $1 AND test_id = $2
    `, [req.user.id, test.id]);

    if (resultResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sonuç bulunamadı' });
    }

    const result = resultResult.rows[0];

    if (!result.is_completed) {
      return res.json({
        completed: false,
        message: 'Test henüz tamamlanmadı'
      });
    }

    // Get questions for analysis display (including options for multiple choice)
    const questionsResult = await pool.query(`
      SELECT question_number, left_text, right_text, section, question_type, options
      FROM test_questions
      WHERE test_id = $1
      ORDER BY question_number
    `, [test.id]);

    res.json({
      completed: true,
      test,
      result: {
        id: result.id,
        resultType: result.result_type,
        scores: result.scores,
        answers: result.answers,
        aiAnalysis: result.ai_analysis,
        completedAt: result.completed_at,
        analysisDate: result.analysis_date
      },
      questions: questionsResult.rows
    });

  } catch (err) {
    console.error('Get result error:', err);
    res.status(500).json({ error: 'Sonuç alınamadı' });
  }
});

// Generate AI Analysis
app.post('/api/tests/:slug/analyze', authenticateToken, async (req, res) => {
  try {
    // Check if OpenAI is available
    if (!openai) {
      return res.status(503).json({ 
        success: false,
        error: 'AI analiz servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
        analysis: 'AI analiz servisi yapılandırılmamış. Sistem yöneticisine başvurun.'
      });
    }

    const testResult = await pool.query('SELECT * FROM tests WHERE slug = $1', [req.params.slug]);
    
    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test bulunamadı' });
    }

    const test = testResult.rows[0];

    // Get user's result
    const resultResult = await pool.query(`
      SELECT utr.*, u.name, u.email
      FROM user_test_results utr
      JOIN users u ON u.id = utr.user_id
      WHERE utr.user_id = $1 AND utr.test_id = $2
    `, [req.user.id, test.id]);

    if (resultResult.rows.length === 0 || !resultResult.rows[0].is_completed) {
      return res.status(400).json({ error: 'Test henüz tamamlanmadı' });
    }

    const result = resultResult.rows[0];

    // Get questions
    const questionsResult = await pool.query(`
      SELECT question_number, left_text, right_text
      FROM test_questions
      WHERE test_id = $1
      ORDER BY question_number
    `, [test.id]);

    const questions = {};
    questionsResult.rows.forEach(q => {
      questions[q.question_number] = { left: q.left_text, right: q.right_text };
    });

    // Format answers for AI
    let formattedAnswers = '';
    const answers = result.answers || {};
    
    for (const [num, answer] of Object.entries(answers)) {
      const q = questions[num];
      if (q) {
        const answerMeaning = ['A', 'B'].includes(answer) 
          ? `Sol tercih (${q.left})` 
          : `Sağ tercih (${q.right})`;
        formattedAnswers += `Soru ${num}: ${answer} - ${answerMeaning}\n`;
      }
    }

    // Prepare test data
    const testData = {
      email: result.email,
      name: result.name || 'Belirtilmemiş',
      test_name: test.name,
      result_type: result.result_type,
      scores: JSON.stringify(result.scores),
      answers: formattedAnswers
    };

    console.log('🤖 OpenAI analizi başlatılıyor...');

    // Get appropriate prompt ID
    const promptId = PROMPT_IDS[test.slug.replace('-', '_')] || PROMPT_IDS.mbti;
    const promptVersion = PROMPT_VERSIONS[test.slug.replace('-', '_')] || '1';

    let analysis;

    if (promptId) {
      // Use stored prompt
      const response = await openai.responses.create({
        input: JSON.stringify(testData, null, 2),
        prompt: {
          id: promptId,
          version: promptVersion
        }
      });

      analysis = response.output_text || 
                 response.output?.[0]?.content?.[0]?.text || 
                 response.output?.[0]?.content ||
                 response.choices?.[0]?.message?.content || 
                 (typeof response.output === 'string' ? response.output : null) ||
                 'Analiz oluşturulamadı';
    } else {
      // Fallback to chat completion
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Sen bir kişilik analisti ve terapistsin. Kullanıcının test sonuçlarını detaylı analiz et ve Türkçe olarak açıkla.`
          },
          {
            role: 'user',
            content: JSON.stringify(testData, null, 2)
          }
        ]
      });

      analysis = response.choices[0].message.content;
    }

    console.log('✅ AI analizi tamamlandı');

    // Save analysis
    await pool.query(`
      UPDATE user_test_results
      SET ai_analysis = $1, analysis_date = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [analysis, result.id]);

    res.json({
      success: true,
      analysis
    });

  } catch (err) {
    console.error('AI Analysis error:', err);
    res.status(500).json({ error: 'Analiz oluşturulamadı', details: err.message });
  }
});

// ============== CALCULATION FUNCTIONS ==============

function calculateMBTI(answers) {
  let scores = {
    E: 0, I: 0,
    S: 0, N: 0,
    T: 0, F: 0,
    J: 0, P: 0
  };

  const answerValues = { 'A': 2, 'B': 1, 'C': -1, 'D': -2 };

  // E/I (1-12)
  for (let i = 1; i <= 12; i++) {
    const answer = answers[i];
    if (answer && answerValues[answer]) {
      const value = answerValues[answer];
      if (value > 0) scores.E += value;
      else scores.I += Math.abs(value);
    }
  }

  // S/N (13-23)
  for (let i = 13; i <= 23; i++) {
    const answer = answers[i];
    if (answer && answerValues[answer]) {
      const value = answerValues[answer];
      if (value > 0) scores.S += value;
      else scores.N += Math.abs(value);
    }
  }

  // T/F (24-34)
  for (let i = 24; i <= 34; i++) {
    const answer = answers[i];
    if (answer && answerValues[answer]) {
      const value = answerValues[answer];
      if (value > 0) scores.T += value;
      else scores.F += Math.abs(value);
    }
  }

  // J/P (35-44)
  for (let i = 35; i <= 44; i++) {
    const answer = answers[i];
    if (answer && answerValues[answer]) {
      const value = answerValues[answer];
      if (value > 0) scores.J += value;
      else scores.P += Math.abs(value);
    }
  }

  const type = 
    (scores.E >= scores.I ? 'E' : 'I') +
    (scores.S >= scores.N ? 'S' : 'N') +
    (scores.T >= scores.F ? 'T' : 'F') +
    (scores.J >= scores.P ? 'J' : 'P');

  return { type, scores };
}

function calculateAITherapist(answers) {
  // New scoring system for 5-option (A-E) questions
  // Each option represents different therapist characteristics
  
  let scores = {
    supportive: 0,       // A seçenekleri: Dinleyen, yumuşak, destekleyici
    cognitive: 0,        // B seçenekleri: Netleştiren, analitik, yapılandırıcı
    adaptive: 0,         // C seçenekleri: Dengeli, orta yol, duruma göre
    behavioral: 0,       // D seçenekleri: Problem çözen, direkt, eylem odaklı
    depth: 0             // E seçenekleri: Örüntü yakalayan, derin, kök neden odaklı
  };

  // Count each answer type
  const answerCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  
  for (const [num, answer] of Object.entries(answers)) {
    if (answerCounts.hasOwnProperty(answer)) {
      answerCounts[answer]++;
    }
    
    // Map answers to scores
    switch(answer) {
      case 'A':
        scores.supportive += 2;
        break;
      case 'B':
        scores.cognitive += 2;
        break;
      case 'C':
        scores.adaptive += 2;
        break;
      case 'D':
        scores.behavioral += 2;
        break;
      case 'E':
        scores.depth += 2;
        break;
    }
  }

  // Find dominant style
  const scoreEntries = Object.entries(scores);
  scoreEntries.sort((a, b) => b[1] - a[1]);
  
  const primaryStyle = scoreEntries[0][0];
  const secondaryStyle = scoreEntries[1][0];
  
  // Define therapist profiles
  const profiles = {
    // Primary: Supportive (A-heavy)
    'supportive-cognitive': { type: 'SICAK_MENTOR', name: 'Sıcak Mentor' },
    'supportive-adaptive': { type: 'DUYGUSAL_REHBER', name: 'Duygusal Rehber' },
    'supportive-behavioral': { type: 'DESTEKLEYICI_KOC', name: 'Destekleyici Koç' },
    'supportive-depth': { type: 'EMPATIK_ANALIST', name: 'Empatik Analist' },
    
    // Primary: Cognitive (B-heavy)
    'cognitive-supportive': { type: 'YAPILANDIRICI_DANIŞMAN', name: 'Yapılandırıcı Danışman' },
    'cognitive-adaptive': { type: 'CBT_UZMANI', name: 'Bilişsel Davranışçı Uzman' },
    'cognitive-behavioral': { type: 'STRATEJIK_ANALIST', name: 'Stratejik Analist' },
    'cognitive-depth': { type: 'SEMA_TERAPISTI', name: 'Şema Terapisti' },
    
    // Primary: Adaptive (C-heavy)
    'adaptive-supportive': { type: 'ESNEK_DESTEKCI', name: 'Esnek Destekçi' },
    'adaptive-cognitive': { type: 'BUTUNLESTIRICI', name: 'Bütünleştirici Terapist' },
    'adaptive-behavioral': { type: 'PRATIK_REHBER', name: 'Pratik Rehber' },
    'adaptive-depth': { type: 'BUTUNCUL_DANIŞMAN', name: 'Bütüncül Danışman' },
    
    // Primary: Behavioral (D-heavy)
    'behavioral-supportive': { type: 'MOTIVASYONEL_KOC', name: 'Motivasyonel Koç' },
    'behavioral-cognitive': { type: 'PROBLEM_COZUCU', name: 'Problem Çözücü' },
    'behavioral-adaptive': { type: 'AKSIYON_ODAKLI', name: 'Aksiyon Odaklı Koç' },
    'behavioral-depth': { type: 'TRANSFORMASYONEL_KOC', name: 'Transformasyonel Koç' },
    
    // Primary: Depth (E-heavy)
    'depth-supportive': { type: 'HUMANIST_TERAPIST', name: 'Hümanist Terapist' },
    'depth-cognitive': { type: 'PSIKODINAMIK_DANIŞMAN', name: 'Psikodinamik Danışman' },
    'depth-adaptive': { type: 'VAROLUŞÇU_TERAPIST', name: 'Varoluşçu Terapist' },
    'depth-behavioral': { type: 'GEŞTALT_TERAPISTI', name: 'Gestalt Terapisti' }
  };

  const profileKey = `${primaryStyle}-${secondaryStyle}`;
  const profile = profiles[profileKey] || { type: 'BUTUNLESTIRICI', name: 'Bütünleştirici Terapist' };

  // Add answer distribution to scores for detailed analysis
  scores.answerDistribution = answerCounts;
  scores.primaryStyle = primaryStyle;
  scores.secondaryStyle = secondaryStyle;
  scores.profileName = profile.name;

  return { type: profile.type, scores };
}

// ============== ADMIN ROUTES ==============

// Admin - Get all users
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, email, name, created_at,
        (SELECT COUNT(*) FROM user_test_results WHERE user_id = users.id AND is_completed = true) as completed_tests
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Kullanıcılar alınamadı' });
  }
});

// Admin - Get all test results
app.get('/api/admin/results', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT utr.*, u.email, u.name as user_name, t.name as test_name, t.slug as test_slug
      FROM user_test_results utr
      JOIN users u ON u.id = utr.user_id
      JOIN tests t ON t.id = utr.test_id
      WHERE utr.is_completed = true
      ORDER BY utr.completed_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin results error:', err);
    res.status(500).json({ error: 'Sonuçlar alınamadı' });
  }
});

// Admin - Get all tests with question counts
app.get('/api/admin/tests', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.*,
        COUNT(DISTINCT tq.id) as actual_question_count,
        COUNT(DISTINCT utr.id) as total_completions
      FROM tests t
      LEFT JOIN test_questions tq ON tq.test_id = t.id
      LEFT JOIN user_test_results utr ON utr.test_id = t.id AND utr.is_completed = true
      GROUP BY t.id
      ORDER BY t.created_at ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin tests error:', err);
    res.status(500).json({ error: 'Testler alınamadı' });
  }
});

// Admin - Get questions for a specific test
app.get('/api/admin/tests/:testId/questions', authenticateAdmin, async (req, res) => {
  try {
    const { testId } = req.params;
    
    // Get test info
    const testResult = await pool.query('SELECT * FROM tests WHERE id = $1', [testId]);
    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test bulunamadı' });
    }
    
    // Get questions
    const questionsResult = await pool.query(`
      SELECT * FROM test_questions 
      WHERE test_id = $1 
      ORDER BY question_number ASC
    `, [testId]);
    
    res.json({
      test: testResult.rows[0],
      questions: questionsResult.rows
    });
  } catch (err) {
    console.error('Admin questions error:', err);
    res.status(500).json({ error: 'Sorular alınamadı' });
  }
});

// Admin - Get detailed result with questions and answers
app.get('/api/admin/results/:resultId/details', authenticateAdmin, async (req, res) => {
  try {
    const { resultId } = req.params;
    
    // Get result info
    const resultQuery = await pool.query(`
      SELECT utr.*, u.email, u.name as user_name, t.name as test_name, t.slug as test_slug
      FROM user_test_results utr
      JOIN users u ON u.id = utr.user_id
      JOIN tests t ON t.id = utr.test_id
      WHERE utr.id = $1
    `, [resultId]);
    
    if (resultQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Sonuç bulunamadı' });
    }
    
    const result = resultQuery.rows[0];
    
    // Get questions for this test
    const questionsQuery = await pool.query(`
      SELECT * FROM test_questions 
      WHERE test_id = $1 
      ORDER BY question_number ASC
    `, [result.test_id]);
    
    // Parse answers from JSONB field
    const userAnswers = result.answers || {};
    
    // Combine questions with answers from JSONB
    const questionsWithAnswers = questionsQuery.rows.map(question => {
      const answer = userAnswers[question.question_number.toString()] || userAnswers[question.question_number];
      return {
        ...question,
        user_answer: answer || null,
        answer_timestamp: result.completed_at || result.started_at
      };
    });
    
    res.json({
      result,
      questions: questionsWithAnswers
    });
  } catch (err) {
    console.error('Admin result details error:', err);
    res.status(500).json({ error: 'Detaylar alınamadı' });
  }
});

// Health check endpoint (for Railway)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server - bind to 0.0.0.0 for Railway
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server çalışıyor: http://${HOST}:${PORT}`);
  console.log(`📊 Admin paneli: http://localhost:${PORT}/admin.html`);
  console.log(`✅ Server başarıyla başlatıldı - PORT: ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  console.log('\n👋 Veritabanı bağlantısı kapatıldı');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
