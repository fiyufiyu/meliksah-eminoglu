# 🚀 Railway Deployment Rehberi

Bu rehber, Symbiont AI Psikoloji Testleri platformunu Railway'e deploy etmek için adım adım talimatlar içerir.

## 📋 Ön Gereksinimler

- [x] Railway hesabı (https://railway.app/)
- [x] Git yüklü
- [x] GitHub hesabı (önerilen)
- [x] PostgreSQL veritabanı Railway'de oluşturulmuş
- [x] OpenAI API Key

## 🔧 Adım 1: Git Repository Hazırlama

### 1.1 Git Repository Başlatma (Henüz yapmadıysanız)

```bash
cd /Users/meliksah/Documents/programming/AI-Tests/mbti-test-app
git init
```

### 1.2 İlk Commit

```bash
git add .
git commit -m "Initial commit: Symbiont AI Psychology Tests Platform"
```

### 1.3 GitHub'a Push (Önerilen)

1. GitHub'da yeni bir repository oluşturun
2. Aşağıdaki komutları çalıştırın:

```bash
git remote add origin https://github.com/KULLANICI_ADINIZ/REPO_ADINIZ.git
git branch -M main
git push -u origin main
```

## 🚂 Adım 2: Railway'de Proje Oluşturma

### 2.1 Railway'e Giriş

1. https://railway.app/ adresine gidin
2. GitHub hesabınızla giriş yapın

### 2.2 Yeni Proje Oluşturma

1. **"New Project"** butonuna tıklayın
2. **"Deploy from GitHub repo"** seçeneğini seçin
3. Repository'nizi seçin
4. Railway otomatik olarak projeyi detect edecek

## 🗄️ Adım 3: PostgreSQL Veritabanı Bağlama

### 3.1 Mevcut PostgreSQL'i Kullanma

Zaten Railway'de bir PostgreSQL veritabanınız varsa:

1. Railway dashboard'da **"+ New"** tıklayın
2. **"Database" → "Add PostgreSQL"** seçin
3. Veritabanı oluşturulduktan sonra otomatik olarak `DATABASE_URL` environment variable'ı eklenecek

### 3.2 Mevcut Veritabanı Bilgilerini Kullanma

Zaten bir veritabanınız varsa, Variables bölümünden `DATABASE_URL` ekleyin.

## 🔐 Adım 4: Environment Variables Ayarlama

Railway dashboard'da projenize gidin ve **"Variables"** sekmesine tıklayın.

Aşağıdaki değişkenleri ekleyin:

```bash
# Port (Railway otomatik atayacak)
PORT=3000

# Database (Railway PostgreSQL'den otomatik)
DATABASE_URL=postgresql://...

# JWT Secret (Güçlü bir secret key oluşturun)
JWT_SECRET=super-secret-jwt-key-change-this-to-random-string

# OpenAI API Key
OPENAI_API_KEY=sk-proj-...

# MBTI Prompt ID (OpenAI'den aldığınız prompt ID)
MBTI_PROMPT_ID=pmpt_695a48bfde2c81979053d77844965dda0c832f12945d6553
MBTI_PROMPT_VERSION=3

# AI Therapist Prompt ID (varsa)
AI_THERAPIST_PROMPT_ID=pmpt_...
AI_THERAPIST_PROMPT_VERSION=1

# Node Environment
NODE_ENV=production
```

### 🔑 Güvenli JWT Secret Oluşturma

Terminal'de güçlü bir secret key oluşturun:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Çıktıyı kopyalayın ve `JWT_SECRET` olarak kullanın.

## 🚀 Adım 5: Deploy

### 5.1 Otomatik Deploy

Railway, GitHub'a her push yaptığınızda otomatik deploy edecektir.

```bash
git add .
git commit -m "Ready for production"
git push origin main
```

### 5.2 Manuel Deploy

Railway dashboard'da **"Deploy"** butonuna tıklayın.

### 5.3 Deploy İzleme

Railway dashboard'da **"Deployments"** sekmesinden deploy durumunu izleyebilirsiniz.

## 🌐 Adım 6: Domain Ayarlama

### 6.1 Railway Domain

Railway otomatik olarak bir domain verir:
- `your-project.railway.app`

### 6.2 Özel Domain (İsteğe Bağlı)

1. Railway dashboard'da **"Settings"** → **"Domains"**
2. **"Custom Domain"** butonuna tıklayın
3. Domain'inizi ekleyin
4. DNS kayıtlarını ayarlayın

## ✅ Adım 7: Test Etme

Deploy tamamlandıktan sonra:

1. Railway'in verdiği URL'yi açın
2. Ana sayfanın yüklendiğini kontrol edin
3. Kayıt olup giriş yapın
4. Bir test çözün
5. Admin paneline erişimi test edin

## 🔍 Sorun Giderme

### Veritabanı Bağlantı Hatası

```bash
# Railway logs'u kontrol edin
railway logs
```

Eğer `ENOTFOUND` hatası alıyorsanız:
- `DATABASE_URL` değişkeninin doğru olduğundan emin olun
- Railway PostgreSQL'in public URL'sini kullandığınızdan emin olun

### Port Hatası

Railway otomatik olarak `PORT` environment variable'ı sağlar.
`server.js` dosyasında:

```javascript
const PORT = process.env.PORT || 3000;
```

### OpenAI API Hatası

- `OPENAI_API_KEY` değişkeninin doğru olduğundan emin olun
- API key'inizin aktif olduğundan emin olun
- OpenAI hesabınızda bakiye olduğundan emin olun

## 📝 Önemli Notlar

### Güvenlik

1. ✅ `.env` dosyası `.gitignore`'da
2. ✅ Tüm secret key'ler Railway Variables'da
3. ✅ Admin paneli sadece belirli email'e açık
4. ✅ JWT token authentication aktif

### Veritabanı

- Railway PostgreSQL otomatik backup yapar
- Ücretsiz planda bazı limitler vardır
- Production için Hobby planı önerilir

### Monitoring

Railway dashboard'dan:
- CPU & Memory kullanımı
- Request logs
- Error logs
- Deployment history

## 🔄 Güncelleme Yapmak

Kod değişikliği yaptığınızda:

```bash
git add .
git commit -m "Update: açıklama"
git push origin main
```

Railway otomatik olarak yeniden deploy edecektir.

## 💰 Maliyet

### Hobby Plan ($5/ay)

- 500 saat çalışma
- 512 MB RAM
- 1 GB Disk
- PostgreSQL dahil

### Pro Plan ($20/ay)

- Sınırsız çalışma
- Daha fazla kaynak
- Priority support

## 📚 Ek Kaynaklar

- Railway Docs: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- PostgreSQL Docs: https://www.postgresql.org/docs/

## 🆘 Destek

Sorun yaşarsanız:
1. Railway logs'u kontrol edin
2. Railway Discord'a sorun
3. GitHub Issues açın

---

**🎉 Başarılar! Artık Symbiont AI Production'da!**

