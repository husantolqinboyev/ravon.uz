"""
Ravon AI Telegram Bot
/start komandasi - autentifikatsiya kodi generatsiya qilish

O'rnatish:
1. pip install python-telegram-bot requests
2. BOT_TOKEN va SUPABASE_URL ni .env faylida sozlang
3. python bot.py

Ishlab chiqarish uchun:
- Webhook yoki polling rejimida ishga tushiring
- Serverda doimiy ishlashi uchun systemd service yarating
"""

import os
import logging
import requests
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes

# Logging sozlash
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Konfiguratsiya
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE')
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://ywglycsqygdjubqmuahm.supabase.co')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3Z2x5Y3NxeWdkanVicW11YWhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDgzODEsImV4cCI6MjA4NTE4NDM4MX0.TDE6Oc_IsGYShJkRBLIADIWEdKatmkG393JigsLAD5I')

# Kanal ID (tekshirish uchun)
CHANNEL_ID = -1003014655042
CHANNEL_USERNAME = '@englishwithSanatbek'

# Web sayt URL
WEB_APP_URL = 'https://ravonai.vercel.app'


async def check_channel_membership(bot, user_id: int) -> bool:
    """Foydalanuvchi kanalga a'zo ekanligini tekshirish"""
    try:
        member = await bot.get_chat_member(chat_id=CHANNEL_ID, user_id=user_id)
        return member.status in ['member', 'administrator', 'creator']
    except Exception as e:
        logger.error(f"Kanal a'zoligini tekshirishda xatolik: {e}")
        return False


async def generate_auth_code(user_data: dict) -> dict:
    """Supabase Edge Function orqali autentifikatsiya kodini generatsiya qilish"""
    try:
        response = requests.post(
            f"{SUPABASE_URL}/functions/v1/telegram-auth",
            json={
                "action": "generate",
                "telegram_user_id": user_data['id'],
                "telegram_first_name": user_data['first_name'],
                "telegram_last_name": user_data.get('last_name'),
                "telegram_username": user_data.get('username'),
                "telegram_photo_url": None  # Telegram API orqali avatar olish mumkin
            },
            headers={
                "Content-Type": "application/json",
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
            }
        )
        return response.json()
    except Exception as e:
        logger.error(f"Kod generatsiya qilishda xatolik: {e}")
        return {"error": str(e)}


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    /start komandasi
    1. Kanal a'zoligini tekshirish
    2. Autentifikatsiya kodini generatsiya qilish
    3. Foydalanuvchiga kodini yuborish
    """
    user = update.effective_user
    
    # Kanal a'zoligini tekshirish
    is_member = await check_channel_membership(context.bot, user.id)
    
    if not is_member:
        # Kanalga a'zo bo'lish uchun tugma
        keyboard = [
            [InlineKeyboardButton("📢 Kanalga a'zo bo'lish", url=f"https://t.me/{CHANNEL_USERNAME.replace('@', '')}")],
            [InlineKeyboardButton("✅ Tekshirish", callback_data="check_membership")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            f"👋 Salom, {user.first_name}!\n\n"
            f"🔒 Ravon AI dan foydalanish uchun avval rasmiy kanalimizga a'zo bo'ling:\n\n"
            f"📢 {CHANNEL_USERNAME}\n\n"
            f"A'zo bo'lgandan so'ng, \"✅ Tekshirish\" tugmasini bosing.",
            reply_markup=reply_markup
        )
        return
    
    # Autentifikatsiya kodini generatsiya qilish
    user_data = {
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'username': user.username
    }
    
    result = await generate_auth_code(user_data)
    
    if result.get('success') and result.get('code'):
        code = result['code']
        
        keyboard = [
            [InlineKeyboardButton("🌐 Web saytga o'tish", url=WEB_APP_URL)]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            f"👋 Salom, {user.first_name}!\n\n"
            f"🎯 Ravon AI - Ingliz tili talaffuzini baholash tizimi\n\n"
            f"📝 Sizning kirish kodingiz:\n\n"
            f"<code>{code}</code>\n\n"
            f"⏰ Kod 5 daqiqa ichida amal qiladi\n\n"
            f"📌 Qadamlar:\n"
            f"1️⃣ Kodni nusxalang (bosing)\n"
            f"2️⃣ Web saytga o'ting\n"
            f"3️⃣ Kodni kiriting\n\n"
            f"🔒 Xavfsizlik: Kodni boshqalarga bermang!",
            parse_mode='HTML',
            reply_markup=reply_markup
        )
    else:
        error_msg = result.get('error', 'Noma\'lum xatolik')
        await update.message.reply_text(
            f"❌ Xatolik yuz berdi: {error_msg}\n\n"
            f"Iltimos, keyinroq qayta urinib ko'ring yoki @khamidovsanat ga murojaat qiling."
        )


async def check_membership_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Kanal a'zoligini qayta tekshirish callback"""
    query = update.callback_query
    await query.answer()
    
    user = query.from_user
    is_member = await check_channel_membership(context.bot, user.id)
    
    if is_member:
        # A'zo bo'lgan - kodni generatsiya qilish
        user_data = {
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'username': user.username
        }
        
        result = await generate_auth_code(user_data)
        
        if result.get('success') and result.get('code'):
            code = result['code']
            
            keyboard = [
                [InlineKeyboardButton("🌐 Web saytga o'tish", url=WEB_APP_URL)]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(
                f"✅ A'zolik tasdiqlandi!\n\n"
                f"📝 Sizning kirish kodingiz:\n\n"
                f"<code>{code}</code>\n\n"
                f"⏰ Kod 5 daqiqa ichida amal qiladi\n\n"
                f"📌 Qadamlar:\n"
                f"1️⃣ Kodni nusxalang (bosing)\n"
                f"2️⃣ Web saytga o'ting\n"
                f"3️⃣ Kodni kiriting",
                parse_mode='HTML',
                reply_markup=reply_markup
            )
        else:
            await query.edit_message_text(
                f"❌ Kod generatsiya qilishda xatolik.\n"
                f"Iltimos, /start buyrug'ini qayta yuboring."
            )
    else:
        await query.answer(
            "❌ Siz hali kanalga a'zo emassiz. Avval kanalga a'zo bo'ling!",
            show_alert=True
        )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/help komandasi"""
    await update.message.reply_text(
        "🎯 <b>Ravon AI Bot Yordam</b>\n\n"
        "📌 <b>Buyruqlar:</b>\n"
        "/start - Kirish kodini olish\n"
        "/help - Yordam\n"
        "/code - Yangi kod olish\n\n"
        "📌 <b>Qanday foydalanish:</b>\n"
        "1. /start buyrug'ini yuboring\n"
        "2. 6 xonali kodni oling\n"
        "3. Web saytga o'ting\n"
        "4. Kodni kiriting va tizimga kiring\n\n"
        "📌 <b>Muammo bo'lsa:</b>\n"
        "Admin: @khamidovsanat",
        parse_mode='HTML'
    )


async def code_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/code komandasi - yangi kod olish"""
    # start bilan bir xil logika
    await start(update, context)


def main() -> None:
    """Botni ishga tushirish"""
    # Application yaratish
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Handlerlarni qo'shish
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("code", code_command))
    application.add_handler(CallbackQueryHandler(check_membership_callback, pattern="^check_membership$"))
    
    # Botni polling rejimida ishga tushirish
    logger.info("Bot ishga tushdi...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
