# Ravon AI Telegram Bot - Render Polling versiyasi

Bu bot Render.com da polling rejimida ishlaydi va web saytdagi barcha funksiyalarni o'z ichiga oladi.

## Funksiyalar

- 🎤 Talaffuz testi haqida ma'lumot va havolalar
- 🔊 TTS (Text-to-Speech) haqida ma'lumot
- 👤 Profil ko'rish va role tekshirish
- 📊 Statistika sahifasiga yo'naltirish
- 💎 Premium tarif ma'lumotlari
- 👥 Referal dasturi
- ❓ Yordam va FAQ
- 🔐 6 xonali login kod generatsiyasi
- 📢 Kanal a'zolik tekshiruvi

## O'rnatish

### Lokal
```bash
cd render-bot
pip install -r requirements.txt
cp .env.example .env
# .env faylini to'ldiring
python bot.py
```

### Render.com

1. GitHub repo'ni Render'ga ulang
2. **New Web Service** yarating
3. Sozlamalar:
   - **Root Directory**: `render-bot`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python bot.py`
   - **Environment**: Python 3
4. Environment variables qo'shing:
   - `TELEGRAM_BOT_TOKEN` - BotFather dan olingan token
   - `SUPABASE_URL` - Supabase URL
   - `SUPABASE_ANON_KEY` - Supabase anon key
   - `CHANNEL_ID` - Telegram kanal ID
   - `CHANNEL_USERNAME` - Kanal username
   - `WEB_APP_URL` - Web sayt URL
   - `ADMIN_USERNAME` - Admin username

## Buyruqlar

| Buyruq | Tavsif |
|--------|--------|
| /start | Login kodi olish |
| /menu | Asosiy menyu |
| /help | Yordam |
| /code | Yangi kod olish |
| /profile | Profil |
| /stats | Statistika |
| /premium | Premium ma'lumoti |
| /referral | Referal dasturi |
