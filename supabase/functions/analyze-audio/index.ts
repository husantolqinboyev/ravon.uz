import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Daily limits - resets at 12:00 Tashkent time
const FREE_DAILY_LIMIT = 10;
const PREMIUM_DAILY_LIMIT = 100;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    
    // Handle JSON requests for material generation
    if (contentType.includes('application/json')) {
      const body = await req.json();
      
      if (body.action === 'generate_material') {
        return await handleMaterialGeneration(body);
      }
    }

    // Handle form data for audio analysis
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const referenceText = formData.get('reference_text') as string | null;
    const telegramUserId = formData.get('telegram_user_id') as string | null;
    
    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'No audio file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received audio file:', audioFile.name, 'Size:', audioFile.size);
    console.log('Reference text:', referenceText || 'None');
    console.log('Telegram User ID:', telegramUserId || 'None');

    // Initialize Supabase for limit checking
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check user limit if telegramUserId is provided
    if (telegramUserId) {
      // Check if user is premium
      const { data: isPremium } = await supabase.rpc('is_premium_user', {
        _telegram_user_id: telegramUserId
      });

      // Get daily usage count
      const { data: dailyCount } = await supabase.rpc('get_daily_pronunciation_count', {
        _telegram_user_id: telegramUserId
      });

      const currentCount = dailyCount || 0;
      const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;

      console.log(`Pronunciation test: user=${telegramUserId}, count=${currentCount}, limit=${limit}, isPremium=${isPremium}`);

      if (currentCount >= limit) {
        return new Response(
          JSON.stringify({ 
            error: 'Kunlik limit tugadi',
            limit,
            used: currentCount,
            isPremium: !!isPremium
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Convert audio to base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = base64Encode(arrayBuffer);

    // Use OpenRouter API
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    console.log('Sending to OpenRouter...');

    // Build the prompt based on whether we have reference text
    let prompt: string;
    
    if (referenceText) {
      prompt = `Ingliz tilida talaffuz tahlili qiling. 

REFERENCE MATN (foydalanuvchi aytishi kerak bo'lgan matn):
"${referenceText}"

Quyidagilarni bajaring:
1. Audio faylni matnga aylantirib transkripsiya qiling
2. Aytilgan matnni reference matn bilan solishtiring
3. Talaffuz sifatini 0-100 oraliqda baholang:
   - Accuracy (to'g'rilik): so'zlar to'g'ri aytildimi
   - Fluency (ravonlik): to'xtashlarsiz, tabiiy oqim
   - Completeness (to'liqlik): barcha so'zlar aytildimi
   - Prosody (ohang): urg'u, intonatsiya, ritm
4. Umumiy baho va yaxshilash uchun aniq tavsiyalar bering

Javobni FAQAT quyidagi JSON formatda bering (boshqa hech narsa yozmasdan):
{
  "transcript": "aytilgan matn",
  "scores": {
    "accuracy": 85,
    "fluency": 80,
    "completeness": 90,
    "prosody": 75,
    "overall": 82
  },
  "feedback": "Qisqa tavsiya va yaxshilash uchun maslahat",
  "analysis": "Batafsil tahlil"
}`;
    } else {
      prompt = `Ingliz tilida erkin nutq talaffuz tahlili qiling.

Quyidagilarni bajaring:
1. Audio faylni matnga aylantirib transkripsiya qiling
2. Talaffuz sifatini 0-100 oraliqda baholang:
   - Accuracy (to'g'rilik): so'zlar to'g'ri aytildimi
   - Fluency (ravonlik): to'xtashlarsiz, tabiiy oqim
   - Prosody (ohang): urg'u, intonatsiya, ritm
3. Umumiy baho va yaxshilash uchun tavsiyalar bering

Javobni FAQAT quyidagi JSON formatda bering:
{
  "transcript": "aytilgan matn",
  "scores": {
    "accuracy": 85,
    "fluency": 80,
    "completeness": 100,
    "prosody": 75,
    "overall": 82
  },
  "feedback": "Qisqa tavsiya",
  "analysis": "Batafsil tahlil"
}`;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ravon-ai.lovable.app',
        'X-Title': 'Ravon AI'
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:audio/webm;base64,${base64Audio}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error:', response.status, errorText);
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const result = await response.json();
    console.log('OpenRouter response received');

    const analysisText = result.choices?.[0]?.message?.content || '';
    
    // Try to parse JSON from response
    let parsedResult;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log('Could not parse JSON, using text response');
    }

    if (parsedResult) {
      // Record usage if telegramUserId is provided
      if (telegramUserId) {
        await supabase.from('pronunciation_usage').insert({
          telegram_user_id: telegramUserId,
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          transcript: parsedResult.transcript,
          scores: parsedResult.scores,
          feedback: parsedResult.feedback,
          analysis: parsedResult.analysis
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fallback to text response
    return new Response(
      JSON.stringify({ 
        success: true,
        analysis: analysisText,
        transcript: null,
        scores: null,
        feedback: null
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Error processing audio:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: 'Audio tahlil qilishda xatolik yuz berdi',
        details: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Handle AI material generation
async function handleMaterialGeneration(body: { prompt: string; type: 'word' | 'text' }) {
  const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
  
  if (!OPENROUTER_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { prompt, type } = body;
  
  const systemPrompt = type === 'word' 
    ? `Siz ingliz tili o'qituvchisi yordamchisisiz. Foydalanuvchi so'rovi asosida bitta inglizcha so'z va uning o'zbekcha tarjimasini bering.
       Javobni FAQAT shu formatda bering:
       {"content": "inglizcha so'z", "translation": "o'zbekcha tarjima"}`
    : `Siz ingliz tili o'qituvchisi yordamchisisiz. Foydalanuvchi so'rovi asosida inglizcha matn (3-5 gap) va uning o'zbekcha tarjimasini bering.
       Javobni FAQAT shu formatda bering:
       {"content": "inglizcha matn", "translation": "o'zbekcha tarjima"}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ravon-ai.lovable.app',
        'X-Title': 'Ravon AI'
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return new Response(
        JSON.stringify(parsed),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ content: content, translation: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Material generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
