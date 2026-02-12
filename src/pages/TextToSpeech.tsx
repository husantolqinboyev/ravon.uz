import { useState, useEffect, useRef } from 'react';
import { Volume2, Play, Pause, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Limits
const FREE_CHAR_LIMIT = 200;
const PREMIUM_CHAR_LIMIT = 2000;
const FREE_DAILY_LIMIT = 5;
const PREMIUM_DAILY_LIMIT = 50;

const TextToSpeech = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [dailyUsed, setDailyUsed] = useState(0);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const charLimit = isPremium ? PREMIUM_CHAR_LIMIT : FREE_CHAR_LIMIT;
  const dailyLimit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const remainingDaily = Math.max(0, dailyLimit - dailyUsed);

  // Load premium status and daily usage
  useEffect(() => {
    const loadUsageData = async () => {
      if (!user?.telegramUserId) return;
      
      try {
        const [premiumResult, usageResult] = await Promise.all([
          supabase.rpc('is_premium_user', { _telegram_user_id: user.telegramUserId }),
          supabase.rpc('get_daily_tts_count', { _telegram_user_id: user.telegramUserId })
        ]);

        setIsPremium(!!premiumResult.data);
        setDailyUsed(usageResult.data || 0);
      } catch (error) {
        console.error('Error loading usage data:', error);
      } finally {
        setIsLoadingUsage(false);
      }
    };

    loadUsageData();
  }, [user?.telegramUserId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    };
  }, []);

  if (!user) return null;

  const handleSpeak = async () => {
    if (!text.trim()) {
      toast({
        title: "Matn kiriting",
        description: "Iltimos, o'qitish uchun matn kiriting",
        variant: "destructive",
      });
      return;
    }

    // If currently playing, stop
    if (isPlaying) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      setIsPlaying(false);
      return;
    }

    // Check daily limit
    if (remainingDaily <= 0) {
      toast({
        title: "Kunlik limit tugadi",
        description: `Bugun ${dailyUsed}/${dailyLimit} marta ishlatildi. ${!isPremium ? "Premium obunaga o'ting!" : "Ertaga soat 12:00 da yangilanadi."}`,
        variant: "destructive",
      });
      return;
    }

    // Check character limit
    if (text.length > charLimit) {
      toast({
        title: "Matn juda uzun",
        description: `Maksimal ${charLimit} ta belgi. ${!isPremium ? "Premium bilan 2000 ta belgigacha!" : ""}`,
        variant: "destructive",
      });
      return;
    }

    // Record usage
    try {
      await supabase.from('tts_usage').insert({
        telegram_user_id: user.telegramUserId,
        text_length: text.length
      });
      setDailyUsed(prev => prev + 1);
    } catch (error) {
      console.error('Error recording TTS usage:', error);
    }

    // Use browser's built-in Speech API
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => {
      setIsPlaying(false);
      utteranceRef.current = null;
    };
    utterance.onerror = (e) => {
      // 'interrupted' is not a real error - it's when cancel() is called
      if (e.error !== 'interrupted') {
        toast({
          title: "Xatolik",
          description: "Matnni o'qishda xatolik yuz berdi",
          variant: "destructive",
        });
      }
      setIsPlaying(false);
      utteranceRef.current = null;
    };
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const exampleTexts = [
    "Hello, how are you today?",
    "The weather is beautiful today.",
    "I would like to improve my English pronunciation.",
    "Practice makes perfect.",
  ];

  const usagePercent = dailyLimit > 0 ? Math.min(100, (dailyUsed / dailyLimit) * 100) : 0;

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-fade-in px-2 md:px-0">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary">
            <Volume2 className="h-4 w-4" />
            <span className="text-sm font-medium">🔊 Matnni Tinglash</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Text to Speech
          </h1>
          <p className="text-muted-foreground">
            Inglizcha matnni tinglang va talaffuzni o'rganing
          </p>
        </div>

        {/* Usage Info */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Kunlik foydalanish</span>
                <Badge variant={isPremium ? "default" : "outline"} className="text-xs">
                  {isPremium ? "💎 Premium" : "Bepul"}
                </Badge>
              </div>
              <span className="text-sm font-medium text-foreground">
                {isLoadingUsage ? "..." : `${dailyUsed} / ${dailyLimit}`}
              </span>
            </div>
            <Progress value={usagePercent} className="h-2" />
            {remainingDaily <= 2 && remainingDaily > 0 && (
              <p className="text-xs text-warning mt-1">⚠️ Faqat {remainingDaily} ta qoldi</p>
            )}
            {remainingDaily === 0 && (
              <p className="text-xs text-destructive mt-1">❌ Kunlik limit tugadi. Ertaga soat 12:00 da yangilanadi.</p>
            )}
          </CardContent>
        </Card>

        {/* Main Input */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Matn kiriting</CardTitle>
            <CardDescription>
              Inglizcha matn yozing yoki nusxalab qo'ying (maks. {charLimit} belgi)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter your English text here..."
              value={text}
              onChange={(e) => {
                if (e.target.value.length <= charLimit) {
                  setText(e.target.value);
                }
              }}
              className="min-h-[150px] resize-none"
              maxLength={charLimit}
            />
            <div className="flex items-center justify-between">
              <span className={`text-xs ${text.length >= charLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                {text.length} / {charLimit}
                {!isPremium && text.length >= FREE_CHAR_LIMIT && (
                  <span className="ml-2 text-primary">💎 Premium bilan 2000 belgigacha!</span>
                )}
              </span>
              <Button
                onClick={handleSpeak}
                disabled={!text.trim() || remainingDaily <= 0}
                className="min-w-[140px]"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4" />
                    To'xtatish
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Tinglash
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Example Texts */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              📝 Namuna matnlar
            </CardTitle>
            <CardDescription>
              Bosing va matnni sinab ko'ring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exampleTexts.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start h-auto py-3 px-4 text-left"
                  onClick={() => setText(example)}
                >
                  <span className="text-sm">{example}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              💡 Maslahatlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Diqqat bilan tinglang va takrorlashga harakat qiling</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Og'zaki mashq qilgandan so'ng talaffuzni test qiling</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Murakkab so'zlarni alohida tinglang</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TextToSpeech;
