"""
Ravon AI Telegram Bot - Render Polling versiyasi
Barcha web funksiyalar bilan to'liq bot

O'rnatish:
1. pip install -r requirements.txt
2. .env faylini sozlang
3. python bot.py

Render.com da deploy:
- Build Command: pip install -r requirements.txt
- Start Command: python bot.py
"""

import os
import logging
import json
import aiohttp
from datetime import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler, 
    MessageHandler, ConversationHandler, ContextTypes, filters
)

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
CHANNEL_ID = int(os.getenv('CHANNEL_ID', '-1003014655042'))
CHANNEL_USERNAME = os.getenv('CHANNEL_USERNAME', '@englishwithSanatbek')

# Web sayt URL
WEB_APP_URL = os.getenv('WEB_APP_URL', 'https://ravonai.vercel.app')

# Admin username
ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'khamidovsanat')


# ==================== HELPER FUNCTIONS ====================

async def supabase_request(endpoint: str, method: str = 'POST', data: dict = None, headers: dict = None):
    """Supabase Edge Function ga so'rov yuborish"""
    url = f"{SUPABASE_URL}/functions/v1/{endpoint}"
    default_headers = {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }
    if headers:
        default_headers.update(headers)
    
    async with aiohttp.ClientSession() as session:
        async with session.request(method, url, json=data, headers=default_headers) as response:
            try:
                return await response.json()
            except:
                return {"error": await response.text()}


async def check_channel_membership(bot, user_id: int) -> bool:
    """Foydalanuvchi kanalga a'zo ekanligini tekshirish"""
    try:
        member = await bot.get_chat_member(chat_id=CHANNEL_ID, user_id=user_id)
        return member.status in ['member', 'administrator', 'creator']
    except Exception as e:
        logger.error(f"Kanal a'zoligini tekshirishda xatolik: {e}")
        return False


async def generate_auth_code(user_data: dict) -> dict:
    """Autentifikatsiya kodini generatsiya qilish"""
    return await supabase_request('telegram-auth', data={
        "action": "generate",
        "telegram_user_id": user_data['id'],
        "telegram_first_name": user_data['first_name'],
        "telegram_last_name": user_data.get('last_name'),
        "telegram_username": user_data.get('username'),
        "telegram_photo_url": None
    })


async def get_user_role(telegram_user_id: int) -> str:
    """Foydalanuvchi rolini olish"""
    result = await supabase_request('check-user-role', data={
        "telegramUserId": str(telegram_user_id)
    })
    return result.get('role', 'user')


def get_main_menu_keyboard():
    """Asosiy menyu tugmalari"""
    keyboard = [
        [
            InlineKeyboardButton("🎤 Talaffuz testi", callback_data="menu_test"),
            InlineKeyboardButton("🔊 Matn tinglash", callback_data="menu_tts"),
        ],
        [
            InlineKeyboardButton("👤 Profil", callback_data="menu_profile"),
            InlineKeyboardButton("📊 Statistika", callback_data="menu_stats"),
        ],
        [
            InlineKeyboardButton("💎 Premium", callback_data="menu_premium"),
            InlineKeyboardButton("👥 Referal", callback_data="menu_referral"),
        ],
        [
            InlineKeyboardButton("❓ Yordam", callback_data="menu_help"),
            InlineKeyboardButton("🌐 Web sayt", url=WEB_APP_URL),
        ],
    ]
    return InlineKeyboardMarkup(keyboard)


# ==================== COMMAND HANDLERS ====================

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/start komandasi - Kirish kodi va asosiy menyu"""
    user = update.effective_user
    
    # Kanal a'zoligini tekshirish
    is_member = await check_channel_membership(context.bot, user.id)
    
    if not is_member:
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
        
        await update.message.reply_text(
            f"👋 Salom, {user.first_name}!\n\n"
            f"🎯 <b>Ravon AI</b> - Ingliz tili talaffuzini baholash tizimi\n\n"
            f"📝 Sizning kirish kodingiz:\n\n"
            f"<code>{code}</code>\n\n"
            f"⏰ Kod 5 daqiqa ichida amal qiladi\n\n"
            f"📌 <b>Qadamlar:</b>\n"
            f"1️⃣ Kodni nusxalang (bosing)\n"
            f"2️⃣ Web saytga o'ting\n"
            f"3️⃣ Kodni kiriting\n\n"
            f"🔒 Xavfsizlik: Kodni boshqalarga bermang!",
            parse_mode='HTML',
            reply_markup=get_main_menu_keyboard()
        )
    else:
        error_msg = result.get('error', "Noma'lum xatolik")
        await update.message.reply_text(
            f"❌ Xatolik yuz berdi: {error_msg}\n\n"
            f"Iltimos, keyinroq qayta urinib ko'ring yoki @{ADMIN_USERNAME} ga murojaat qiling."
        )


async def menu_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/menu komandasi - Asosiy menyu"""
    user = update.effective_user
    await update.message.reply_text(
        f"📱 <b>Ravon AI - Asosiy menyu</b>\n\n"
        f"Kerakli bo'limni tanlang:",
        parse_mode='HTML',
        reply_markup=get_main_menu_keyboard()
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/help komandasi"""
    await update.message.reply_text(
        "🎯 <b>Ravon AI Bot Yordam</b>\n\n"
        "📌 <b>Buyruqlar:</b>\n"
        "/start - Kirish kodini olish\n"
        "/menu - Asosiy menyu\n"
        "/help - Yordam\n"
        "/code - Yangi kod olish\n"
        "/profile - Profilim\n"
        "/stats - Statistikam\n"
        "/premium - Premium ma'lumoti\n"
        "/referral - Referal dasturi\n\n"
        "📌 <b>Qanday foydalanish:</b>\n"
        "1. /start buyrug'ini yuboring\n"
        "2. 6 xonali kodni oling\n"
        "3. Web saytga o'ting va kodni kiriting\n"
        "4. Talaffuzni test qiling\n\n"
        "📌 <b>Talaffuz test qilish:</b>\n"
        "• Web saytda matn tanlang\n"
        "• Ovozingizni yozib yuborng\n"
        "• AI tahlil natijasini oling\n\n"
        "📌 <b>Muammo bo'lsa:</b>\n"
        f"Admin: @{ADMIN_USERNAME}",
        parse_mode='HTML'
    )


async def code_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/code komandasi - yangi kod olish"""
    await start(update, context)


async def profile_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/profile komandasi"""
    user = update.effective_user
    role = await get_user_role(user.id)
    
    role_emoji = {"admin": "👑", "teacher": "🎓", "user": "👤"}.get(role, "👤")
    role_name = {"admin": "Admin", "teacher": "O'qituvchi", "user": "Foydalanuvchi"}.get(role, "Foydalanuvchi")
    
    keyboard = [
        [InlineKeyboardButton("🌐 Web saytda ko'rish", url=f"{WEB_APP_URL}/profile")],
        [InlineKeyboardButton("🔙 Menyu", callback_data="back_to_menu")]
    ]
    
    await update.message.reply_text(
        f"👤 <b>Mening Profilim</b>\n\n"
        f"📛 Ism: {user.first_name} {user.last_name or ''}\n"
        f"👤 Username: @{user.username or 'yo\'q'}\n"
        f"🆔 Telegram ID: <code>{user.id}</code>\n"
        f"{role_emoji} Role: {role_name}\n\n"
        f"📊 Batafsil statistika uchun web saytga o'ting.",
        parse_mode='HTML',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/stats komandasi"""
    keyboard = [
        [InlineKeyboardButton("📊 Web saytda ko'rish", url=f"{WEB_APP_URL}/stats")],
        [InlineKeyboardButton("🔙 Menyu", callback_data="back_to_menu")]
    ]
    
    await update.message.reply_text(
        f"📊 <b>Statistika</b>\n\n"
        f"Batafsil statistikani ko'rish uchun web saytga o'ting:\n"
        f"• Jami testlar soni\n"
        f"• O'rtacha ball\n"
        f"• Haftalik tahlil\n"
        f"• So'nggi natijalar\n\n"
        f"🌐 {WEB_APP_URL}/stats",
        parse_mode='HTML',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def premium_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/premium komandasi"""
    keyboard = [
        [InlineKeyboardButton("💳 Premium sotib olish", url=f"{WEB_APP_URL}/premium")],
        [InlineKeyboardButton(f"📞 Admin: @{ADMIN_USERNAME}", url=f"https://t.me/{ADMIN_USERNAME}")],
        [InlineKeyboardButton("🔙 Menyu", callback_data="back_to_menu")]
    ]
    
    await update.message.reply_text(
        "💎 <b>Premium Rejalar</b>\n\n"
        "🌟 <b>Premium imkoniyatlari:</b>\n"
        "✅ Kunlik 100 ta talaffuz testi (bepul: 10)\n"
        "✅ Kunlik 50 ta TTS (bepul: 5)\n"
        "✅ 2000 belgigacha matn tinglash\n"
        "✅ Batafsil tahlil va tavsiyalar\n"
        "✅ PDF hisobot yuklab olish\n"
        "✅ Prioritet qo'llab-quvvatlash\n\n"
        "💰 <b>Narxlar:</b>\n"
        "📅 Haftalik: 15,000 so'm\n"
        "📅 Oylik: 45,000 so'm\n"
        "📅 Yillik: 300,000 so'm\n\n"
        f"📞 Sotib olish uchun: @{ADMIN_USERNAME}",
        parse_mode='HTML',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def referral_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/referral komandasi"""
    user = update.effective_user
    referral_link = f"https://t.me/ravonaiweb_bot?start=ref_{user.id}"
    
    keyboard = [
        [InlineKeyboardButton("📤 Havolani ulashish", switch_inline_query=f"Men Ravon AI orqali ingliz tili talaffuzimni yaxshilayapman! Sen ham sinab ko'r: {referral_link}")],
        [InlineKeyboardButton("🌐 Web saytda ko'rish", url=f"{WEB_APP_URL}/referral")],
        [InlineKeyboardButton("🔙 Menyu", callback_data="back_to_menu")]
    ]
    
    await update.message.reply_text(
        f"👥 <b>Referal Dasturi</b>\n\n"
        f"Do'stlaringizni taklif qiling va bonus oling!\n\n"
        f"🔗 <b>Sizning havolangiz:</b>\n"
        f"<code>{referral_link}</code>\n\n"
        f"🎁 <b>Bonuslar:</b>\n"
        f"• 1 do'st = +1 bonus limit\n"
        f"• 3 do'st = +3 bonus limit\n"
        f"• 10 do'st = +1 hafta premium\n\n"
        f"📤 Havolani ulashing va bonus oling!",
        parse_mode='HTML',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


# ==================== CALLBACK HANDLERS ====================

async def check_membership_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Kanal a'zoligini qayta tekshirish"""
    query = update.callback_query
    await query.answer()
    
    user = query.from_user
    is_member = await check_channel_membership(context.bot, user.id)
    
    if is_member:
        user_data = {
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'username': user.username
        }
        
        result = await generate_auth_code(user_data)
        
        if result.get('success') and result.get('code'):
            code = result['code']
            
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
                reply_markup=get_main_menu_keyboard()
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


async def menu_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Menyu tugmalari callback"""
    query = update.callback_query
    await query.answer()
    
    user = query.from_user
    data = query.data
    
    if data == "back_to_menu":
        await query.edit_message_text(
            f"📱 <b>Ravon AI - Asosiy menyu</b>\n\n"
            f"Kerakli bo'limni tanlang:",
            parse_mode='HTML',
            reply_markup=get_main_menu_keyboard()
        )
        return
    
    if data == "menu_test":
        keyboard = [
            [InlineKeyboardButton("🎤 Web saytda test qilish", url=f"{WEB_APP_URL}/test")],
            [InlineKeyboardButton("🔙 Menyu", callback_data="back_to_menu")]
        ]
        await query.edit_message_text(
            "🎤 <b>Talaffuz Testi</b>\n\n"
            "Talaffuzingizni AI yordamida tahlil qiling!\n\n"
            "📌 <b>Qanday ishlaydi:</b>\n"
            "1. Matn tanlang yoki o'zingiz yozing\n"
            "2. Ovozingizni yozib yuboring\n"
            "3. AI tahlil natijasini oling\n\n"
            "📊 <b>Baholash ko'rsatkichlari:</b>\n"
            "• 🎯 Accuracy (To'g'rilik)\n"
            "• 🌊 Fluency (Ravonlik)\n"
            "• ✅ Completeness (To'liqlik)\n"
            "• 🎵 Prosody (Ohang)\n\n"
            "⏱️ Maks. audio: 30 soniya\n"
            "📊 Bepul: 10 ta/kun | Premium: 100 ta/kun",
            parse_mode='HTML',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    elif data == "menu_tts":
        keyboard = [
            [InlineKeyboardButton("🔊 Web saytda tinglash", url=f"{WEB_APP_URL}/tts")],
            [InlineKeyboardButton("🔙 Menyu", callback_data="back_to_menu")]
        ]
        await query.edit_message_text(
            "🔊 <b>Matnni Tinglash (TTS)</b>\n\n"
            "Inglizcha matnni tinglang va talaffuzni o'rganing!\n\n"
            "📌 <b>Imkoniyatlar:</b>\n"
            "• Inglizcha matn kiriting\n"
            "• Brauzer ovozi bilan tinglang\n"
            "• Takrorlang va mashq qiling\n\n"
            "📊 Bepul: 5 ta/kun (200 belgi)\n"
            "💎 Premium: 50 ta/kun (2000 belgi)",
            parse_mode='HTML',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    elif data == "menu_profile":
        role = await get_user_role(user.id)
        role_emoji = {"admin": "👑", "teacher": "🎓", "user": "👤"}.get(role, "👤")
        role_name = {"admin": "Admin", "teacher": "O'qituvchi", "user": "Foydalanuvchi"}.get(role, "Foydalanuvchi")
        
        keyboard = [
            [InlineKeyboardButton("🌐 Web saytda ko'rish", url=f"{WEB_APP_URL}/profile")],
            [InlineKeyboardButton("🔙 Menyu", callback_data="back_to_menu")]
        ]
        await query.edit_message_text(
            f"👤 <b>Mening Profilim</b>\n\n"
            f"📛 Ism: {user.first_name} {user.last_name or ''}\n"
            f"👤 Username: @{user.username or 'yoq'}\n"
            f"🆔 Telegram ID: <code>{user.id}</code>\n"
            f"{role_emoji} Role: {role_name}",
            parse_mode='HTML',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    elif data == "menu_stats":
        keyboard = [
            [InlineKeyboardButton("📊 Web saytda ko'rish", url=f"{WEB_APP_URL}/stats")],
            [InlineKeyboardButton("🔙 Menyu", callback_data="back_to_menu")]
        ]
        await query.edit_message_text(
            "📊 <b>Statistika</b>\n\n"
            "Batafsil statistikani web saytda ko'ring:\n"
            "• Jami testlar soni\n"
            "• O'rtacha ball\n"
            "• Haftalik tahlil\n"
            "• So'nggi natijalar",
            parse_mode='HTML',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    elif data == "menu_premium":
        keyboard = [
            [InlineKeyboardButton("💳 Sotib olish", url=f"{WEB_APP_URL}/premium")],
            [InlineKeyboardButton(f"📞 @{ADMIN_USERNAME}", url=f"https://t.me/{ADMIN_USERNAME}")],
            [InlineKeyboardButton("🔙 Menyu", callback_data="back_to_menu")]
        ]
        await query.edit_message_text(
            "💎 <b>Premium</b>\n\n"
            "🌟 Imkoniyatlar:\n"
            "✅ 100 ta talaffuz test/kun\n"
            "✅ 50 ta TTS/kun\n"
            "✅ 2000 belgigacha matn\n"
            "✅ PDF hisobot\n\n"
            "💰 Haftalik: 15,000 so'm\n"
            "💰 Oylik: 45,000 so'm\n"
            "💰 Yillik: 300,000 so'm",
            parse_mode='HTML',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    elif data == "menu_referral":
        referral_link = f"https://t.me/ravonaiweb_bot?start=ref_{user.id}"
        keyboard = [
            [InlineKeyboardButton("📤 Ulashish", switch_inline_query=f"Ravon AI bilan talaffuzingizni yaxshilang: {referral_link}")],
            [InlineKeyboardButton("🌐 Web saytda ko'rish", url=f"{WEB_APP_URL}/referral")],
            [InlineKeyboardButton("🔙 Menyu", callback_data="back_to_menu")]
        ]
        await query.edit_message_text(
            f"👥 <b>Referal Dasturi</b>\n\n"
            f"🔗 Havolangiz:\n"
            f"<code>{referral_link}</code>\n\n"
            f"🎁 3 do'st = +3 bonus limit\n"
            f"🎁 10 do'st = +1 hafta premium",
            parse_mode='HTML',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    
    elif data == "menu_help":
        keyboard = [
            [InlineKeyboardButton("🌐 Yordam markazi", url=f"{WEB_APP_URL}/help")],
            [InlineKeyboardButton(f"📞 @{ADMIN_USERNAME}", url=f"https://t.me/{ADMIN_USERNAME}")],
            [InlineKeyboardButton("🔙 Menyu", callback_data="back_to_menu")]
        ]
        await query.edit_message_text(
            "❓ <b>Yordam</b>\n\n"
            "📌 <b>Buyruqlar:</b>\n"
            "/start - Kirish kodi\n"
            "/menu - Menyu\n"
            "/help - Yordam\n"
            "/profile - Profil\n"
            "/stats - Statistika\n"
            "/premium - Premium\n"
            "/referral - Referal\n\n"
            "❓ <b>FAQ:</b>\n"
            "• Bepul: 10 test/kun, 5 TTS/kun\n"
            "• Premium: 100 test/kun, 50 TTS/kun\n"
            "• Limitlar har kuni 12:00 da yangilanadi\n"
            "• Maks. audio: 30 soniya\n\n"
            f"📞 Muammo bo'lsa: @{ADMIN_USERNAME}",
            parse_mode='HTML',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )


# ==================== MAIN ====================

def main() -> None:
    """Botni ishga tushirish"""
    if BOT_TOKEN == 'YOUR_BOT_TOKEN_HERE':
        logger.error("TELEGRAM_BOT_TOKEN sozlanmagan! .env faylida sozlang.")
        return
    
    # Application yaratish
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Command handlerlar
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("menu", menu_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("code", code_command))
    application.add_handler(CommandHandler("profile", profile_command))
    application.add_handler(CommandHandler("stats", stats_command))
    application.add_handler(CommandHandler("premium", premium_command))
    application.add_handler(CommandHandler("referral", referral_command))
    
    # Callback query handlerlar
    application.add_handler(CallbackQueryHandler(check_membership_callback, pattern="^check_membership$"))
    application.add_handler(CallbackQueryHandler(menu_callback, pattern="^(menu_|back_to_menu)"))
    
    # Botni polling rejimida ishga tushirish
    logger.info("🤖 Ravon AI Bot ishga tushdi (polling rejimi)...")
    logger.info(f"📢 Kanal: {CHANNEL_USERNAME}")
    logger.info(f"🌐 Web App: {WEB_APP_URL}")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
