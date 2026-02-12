import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Kanal ID va username
const CHANNEL_ID = -1003014655042;
const CHANNEL_USERNAME = '@englishwithSanatbek';

// Web sayt URL
const WEB_APP_URL = 'https://ravonai.vercel.app';

// 6 xonali kod generatsiya qilish
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Telegram API ga so'rov yuborish
async function sendTelegramRequest(method: string, body: Record<string, unknown>) {
  const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }
  
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  return response.json();
}

// Xabar yuborish
async function sendMessage(chatId: number, text: string, replyMarkup?: Record<string, unknown>, parseMode = 'HTML') {
  return sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
    reply_markup: replyMarkup,
  });
}

// Kanal a'zoligini tekshirish
async function checkChannelMembership(userId: number): Promise<boolean> {
  try {
    const result = await sendTelegramRequest('getChatMember', {
      chat_id: CHANNEL_ID,
      user_id: userId,
    });
    
    if (result.ok && result.result) {
      const status = result.result.status;
      return ['member', 'administrator', 'creator'].includes(status);
    }
    return false;
  } catch (error) {
    console.error('Error checking channel membership:', error);
    return false;
  }
}

// Callback query javob berish
async function answerCallbackQuery(callbackQueryId: string, text?: string, showAlert = false) {
  return sendTelegramRequest('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

// Xabarni tahrirlash
async function editMessage(chatId: number, messageId: number, text: string, replyMarkup?: Record<string, unknown>) {
  return sendTelegramRequest('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    reply_markup: replyMarkup,
  });
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const update = await req.json();
    console.log('Received update:', JSON.stringify(update));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // /start komandasi
    if (update.message?.text?.startsWith('/start') || update.message?.text?.startsWith('/code')) {
      const user = update.message.from;
      const chatId = update.message.chat.id;

      console.log(`Processing /start for user: ${user.id}`);

      // Kanal a'zoligini tekshirish
      const isMember = await checkChannelMembership(user.id);

      if (!isMember) {
        const keyboard = {
          inline_keyboard: [
            [{ text: "📢 Kanalga a'zo bo'lish", url: `https://t.me/${CHANNEL_USERNAME.replace('@', '')}` }],
            [{ text: "✅ Tekshirish", callback_data: "check_membership" }]
          ]
        };

        await sendMessage(
          chatId,
          `👋 Salom, ${user.first_name}!\n\n` +
          `🔒 Ravon AI dan foydalanish uchun avval rasmiy kanalimizga a'zo bo'ling:\n\n` +
          `📢 ${CHANNEL_USERNAME}\n\n` +
          `A'zo bo'lgandan so'ng, "✅ Tekshirish" tugmasini bosing.`,
          keyboard
        );
        
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Eski kodlarni o'chirish
      await supabase
        .from('auth_codes')
        .delete()
        .eq('telegram_user_id', user.id);

      // Yangi kod generatsiya qilish
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      const { error } = await supabase
        .from('auth_codes')
        .insert({
          code,
          telegram_user_id: user.id,
          telegram_first_name: user.first_name,
          telegram_last_name: user.last_name || null,
          telegram_username: user.username || null,
          telegram_photo_url: null,
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        console.error('Error inserting auth code:', error);
        await sendMessage(
          chatId,
          `❌ Xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring.`
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`Auth code generated: ${code} for user: ${user.id}`);

      const keyboard = {
        inline_keyboard: [
          [{ text: "🌐 Web saytga o'tish", url: WEB_APP_URL }]
        ]
      };

      await sendMessage(
        chatId,
        `👋 Salom, ${user.first_name}!\n\n` +
        `🎯 Ravon AI - Ingliz tili talaffuzini baholash tizimi\n\n` +
        `📝 Sizning kirish kodingiz:\n\n` +
        `<code>${code}</code>\n\n` +
        `⏰ Kod 5 daqiqa ichida amal qiladi\n\n` +
        `📌 Qadamlar:\n` +
        `1️⃣ Kodni nusxalang (bosing)\n` +
        `2️⃣ Web saytga o'ting\n` +
        `3️⃣ Kodni kiriting\n\n` +
        `🔒 Xavfsizlik: Kodni boshqalarga bermang!`,
        keyboard
      );

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // /help komandasi
    if (update.message?.text?.startsWith('/help')) {
      const chatId = update.message.chat.id;

      await sendMessage(
        chatId,
        `🎯 <b>Ravon AI Bot Yordam</b>\n\n` +
        `📌 <b>Buyruqlar:</b>\n` +
        `/start - Kirish kodini olish\n` +
        `/help - Yordam\n` +
        `/code - Yangi kod olish\n\n` +
        `📌 <b>Qanday foydalanish:</b>\n` +
        `1. /start buyrug'ini yuboring\n` +
        `2. 6 xonali kodni oling\n` +
        `3. Web saytga o'ting\n` +
        `4. Kodni kiriting va tizimga kiring\n\n` +
        `📌 <b>Muammo bo'lsa:</b>\n` +
        `Admin: @khamidovsanat`
      );

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Callback query (tekshirish tugmasi)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const user = callbackQuery.from;
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;

      if (callbackQuery.data === 'check_membership') {
        const isMember = await checkChannelMembership(user.id);

        if (isMember) {
          await answerCallbackQuery(callbackQuery.id);

          // Eski kodlarni o'chirish
          await supabase
            .from('auth_codes')
            .delete()
            .eq('telegram_user_id', user.id);

          // Yangi kod generatsiya qilish
          const code = generateCode();
          const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

          const { error } = await supabase
            .from('auth_codes')
            .insert({
              code,
              telegram_user_id: user.id,
              telegram_first_name: user.first_name,
              telegram_last_name: user.last_name || null,
              telegram_username: user.username || null,
              telegram_photo_url: null,
              expires_at: expiresAt.toISOString(),
            });

          if (error) {
            console.error('Error inserting auth code:', error);
            await editMessage(
              chatId,
              messageId,
              `❌ Kod generatsiya qilishda xatolik.\nIltimos, /start buyrug'ini qayta yuboring.`
            );
            return new Response(JSON.stringify({ ok: true }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const keyboard = {
            inline_keyboard: [
              [{ text: "🌐 Web saytga o'tish", url: WEB_APP_URL }]
            ]
          };

          await editMessage(
            chatId,
            messageId,
            `✅ A'zolik tasdiqlandi!\n\n` +
            `📝 Sizning kirish kodingiz:\n\n` +
            `<code>${code}</code>\n\n` +
            `⏰ Kod 5 daqiqa ichida amal qiladi\n\n` +
            `📌 Qadamlar:\n` +
            `1️⃣ Kodni nusxalang (bosing)\n` +
            `2️⃣ Web saytga o'ting\n` +
            `3️⃣ Kodni kiriting`,
            keyboard
          );
        } else {
          await answerCallbackQuery(
            callbackQuery.id,
            "❌ Siz hali kanalga a'zo emassiz. Avval kanalga a'zo bo'ling!",
            true
          );
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Boshqa xabarlar uchun
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in telegram-webhook:', error);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
