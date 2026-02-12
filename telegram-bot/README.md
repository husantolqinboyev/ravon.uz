# Ravon AI Telegram Bot

Ingliz tili talaffuzini baholash tizimi uchun Telegram bot.

## O'rnatish

### 1. Python o'rnatish
Python 3.9+ versiyasi kerak.

### 2. Kutubxonalarni o'rnatish
```bash
cd telegram-bot
pip install -r requirements.txt
```

### 3. Konfiguratsiya
`.env.example` faylini `.env` ga nusxalang va sozlang:
```bash
cp .env.example .env
```

`.env` faylini tahrirlang va `TELEGRAM_BOT_TOKEN` ni qo'shing.

### 4. Botni ishga tushirish
```bash
python bot.py
```

## Buyruqlar

| Buyruq | Tavsif |
|--------|--------|
| `/start` | Kirish kodini olish |
| `/code` | Yangi kod olish |
| `/help` | Yordam |

## Xususiyatlar

- ✅ Kanal a'zoligini tekshirish
- ✅ 6 xonali autentifikatsiya kodi generatsiya qilish
- ✅ Kodning 5 daqiqalik muddati
- ✅ Web saytga o'tish tugmasi

## Server uchun

### Systemd service yaratish

`/etc/systemd/system/ravonai-bot.service` faylini yarating:

```ini
[Unit]
Description=Ravon AI Telegram Bot
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/telegram-bot
ExecStart=/usr/bin/python3 bot.py
Restart=always
RestartSec=10
EnvironmentFile=/path/to/telegram-bot/.env

[Install]
WantedBy=multi-user.target
```

Ishga tushirish:
```bash
sudo systemctl daemon-reload
sudo systemctl enable ravonai-bot
sudo systemctl start ravonai-bot
```

## Aloqa

Admin: @khamidovsanat
