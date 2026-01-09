# 🧠 Symbiont AI - Psikoloji Testleri Platformu

Modern, kullanıcı dostu ve AI destekli psikoloji testleri platformu.

## ✨ Özellikler

### 🎯 Çoklu Test Desteği
- **MBTI Kişilik Testi** - 16 kişilik tipi analizi
- **AI Terapist Eşleştirme** - Size uygun terapist profili
- **Big Five Testi** - 5 faktör kişilik modeli
- **Psikoanalitik Test** - Bilinçaltı analizi
- **Stres Yönetimi** - Stresle başa çıkma tarzı
- **Duygusal Zeka** - EQ seviye ölçümü

### 🤖 AI Destekli Analiz
- OpenAI Prompt API entegrasyonu
- Kişiselleştirilmiş detaylı analizler
- Markdown formatında zengin içerik

### 🔒 Güvenli Kimlik Doğrulama
- JWT token tabanlı oturum yönetimi
- Bcrypt ile şifrelenmiş parolalar
- Admin paneli erişim kontrolü

### 📊 Admin Paneli
- Tüm test sonuçlarını görüntüleme
- Kullanıcı yönetimi
- Test istatistikleri
- Detaylı cevap analizi

### 📱 Modern UI/UX
- Mobil-first tasarım
- Responsive layout
- Smooth animasyonlar
- Dark mode desteği
- Elegant gradients & glassmorphism

## 🚀 Kurulum

### Gereksinimler
- Node.js 16+
- PostgreSQL 14+
- OpenAI API Key

### Adımlar

1. **Repository'yi klonlayın**
```bash
git clone <repo-url>
cd mbti-test-app
```

2. **Bağımlılıkları yükleyin**
```bash
npm install
```

3. **Environment variables oluşturun**
```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin:
```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/psycho_tests
JWT_SECRET=your-super-secret-jwt-key
OPENAI_API_KEY=sk-proj-...
MBTI_PROMPT_ID=pmpt_...
MBTI_PROMPT_VERSION=3
```

4. **Veritabanını başlatın**
```bash
# PostgreSQL'i başlatın
# Uygulama çalıştığında tablolar otomatik oluşturulacak
```

5. **Uygulamayı çalıştırın**
```bash
npm start
```

Uygulama http://localhost:3000 adresinde çalışacaktır.

## 📁 Proje Yapısı

```
mbti-test-app/
├── server.js              # Ana server dosyası
├── package.json           # Bağımlılıklar
├── .env                   # Environment variables
├── public/                # Frontend dosyaları
│   ├── index.html         # Ana sayfa
│   ├── test.html          # Test sayfası
│   ├── result.html        # Sonuç sayfası
│   ├── admin.html         # Admin paneli
│   ├── style.css          # Ana stiller
│   ├── test-style.css     # Test sayfası stilleri
│   ├── result-style.css   # Sonuç sayfası stilleri
│   ├── admin-style.css    # Admin paneli stilleri
│   ├── script.js          # Ana sayfa JS
│   ├── test-script.js     # Test sayfası JS
│   ├── result-script.js   # Sonuç sayfası JS
│   └── admin-script.js    # Admin paneli JS
└── README.md              # Bu dosya
```

## 🗄️ Veritabanı Şeması

### Tablolar
- **users** - Kullanıcı bilgileri
- **tests** - Mevcut testler
- **test_questions** - Test soruları
- **user_test_results** - Kullanıcı sonuçları

## 🎨 Teknolojiler

### Backend
- **Express.js** - Web framework
- **PostgreSQL** - Veritabanı
- **JWT** - Kimlik doğrulama
- **Bcrypt** - Şifreleme
- **OpenAI API** - AI analizi

### Frontend
- **Vanilla JavaScript** - Hiç framework yok!
- **CSS3** - Modern animasyonlar
- **Google Fonts** - Playfair Display & DM Sans

## 🔐 Admin Paneli

Sadece belirli email adresi admin paneline erişebilir:
- Email: `meliksaheminoglutr@gmail.com`
- URL: `/admin.html`

### Admin Özellikleri
- Dashboard istatistikleri
- Tüm test sonuçları
- Test yönetimi
- Kullanıcı listesi
- Detaylı cevap görüntüleme

## 🌐 Production Deployment

Railway'e deploy için: [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) dosyasına bakın.

### Hızlı Deploy

```bash
# Git repository başlat
git init
git add .
git commit -m "Initial commit"

# GitHub'a push
git remote add origin <your-repo-url>
git push -u origin main

# Railway'de deploy et
# 1. Railway.app'te yeni proje oluştur
# 2. GitHub repo'sunu bağla
# 3. Environment variables ekle
# 4. Deploy!
```

## 🧪 Test Etme

1. Ana sayfaya git: http://localhost:3000
2. Kayıt ol
3. Bir test seç
4. Soruları yanıtla
5. AI analizini gör
6. Admin panelini kontrol et (admin email ile)

## 📊 API Endpoints

### Public Endpoints
- `GET /api/tests` - Tüm testleri listele
- `GET /api/tests/:slug` - Tek test detayı
- `POST /api/auth/register` - Kayıt ol
- `POST /api/auth/login` - Giriş yap

### Protected Endpoints (JWT gerekli)
- `GET /api/tests/:slug/result` - Test sonucu
- `POST /api/tests/:slug/submit` - Cevapları gönder
- `POST /api/tests/:slug/analyze` - AI analizi

### Admin Endpoints (Admin auth gerekli)
- `GET /api/admin/results` - Tüm sonuçlar
- `GET /api/admin/tests` - Test yönetimi
- `GET /api/admin/users` - Kullanıcı listesi
- `GET /api/admin/results/:id/details` - Detaylı cevaplar

## 🎯 Özellik Geliştirme Roadmap

- [ ] PDF rapor indirme
- [ ] Email ile sonuç gönderme
- [ ] Sosyal medya paylaşımı
- [ ] Çok dilli destek
- [ ] Karanlık/Aydınlık tema toggle
- [ ] Test karşılaştırma
- [ ] İlerleme grafiği
- [ ] Bildirim sistemi

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Push edin (`git push origin feature/AmazingFeature`)
5. Pull Request açın

## 📄 Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 👤 İletişim

Proje Sahibi - meliksaheminoglutr@gmail.com

## 🙏 Teşekkürler

- OpenAI API
- Railway Platform
- PostgreSQL
- Express.js Community

---

**Yapılma Tarihi:** 2026
**Versiyon:** 2.0.0
**Durum:** 🟢 Production Ready
