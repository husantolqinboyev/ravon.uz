import { HelpCircle, MessageCircle, ExternalLink, Mic, BarChart3, Crown, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// Admin and channel info
const ADMIN_USERNAME = 'khamidovsanat';
const CHANNEL_USERNAME = 'englishwithSanatbek';

const Help = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const faqItems = [
    {
      question: "Ravon AI nima?",
      answer: "Ravon AI - bu ingliz tili talaffuzingizni sun'iy intellekt yordamida tahlil qiluvchi tizim. Siz inglizcha gaplashsangiz, AI talaffuzingizni 4 ta ko'rsatkich bo'yicha baholaydi: to'g'rilik, ravonlik, to'liqlik va ohang."
    },
    {
      question: "Kunlik limit nima?",
      answer: "Bepul foydalanuvchilar kuniga 3 marta test o'tkazishlari mumkin. Premium foydalanuvchilar uchun cheklov yo'q - cheksiz test qilishingiz mumkin."
    },
    {
      question: "Premium qanday sotib olaman?",
      answer: "Premium sotib olish uchun admin bilan bog'laning (@" + ADMIN_USERNAME + "). Admin sizga to'lov ma'lumotlarini yuboradi. To'lov tasdiqlangandan so'ng premium faollashadi."
    },
    {
      question: "Ma'lumotlarim qayerda saqlanadi?",
      answer: "Barcha tahlil natijalari faqat brauzeringizda (IndexedDB) saqlanadi. Biz serverda hech qanday audio yoki natijalarni saqlamaymiz - maxfiyligingiz to'liq himoyalangan."
    },
    {
      question: "Referal dasturi qanday ishlaydi?",
      answer: "Do'stlaringizni referal havola orqali taklif qiling. Ular ro'yxatdan o'tganda sizga bonus beriladi: 3 ta do'st = +3 test limiti, 10 ta do'st = +1 hafta premium."
    },
    {
      question: "Audio formatlari qanday?",
      answer: "Tizim WebM, OGG, MP3 va WAV formatlarini qo'llab-quvvatlaydi. Maksimal audio davomiyligi 30 soniya."
    },
    {
      question: "Tahlil natijalari nima anglatadi?",
      answer: "Accuracy (To'g'rilik) - so'zlarning to'g'ri talaffuz qilinishi. Fluency (Ravonlik) - gapirish tezligi va ritmi. Completeness (To'liqlik) - barcha so'zlar aytilganmi. Prosody (Ohang) - urg'u va intonatsiya."
    },
  ];

  const features = [
    {
      icon: Mic,
      title: "Talaffuzni test qilish",
      description: "Inglizcha gapiring va AI tahlilini oling"
    },
    {
      icon: BarChart3,
      title: "Statistika",
      description: "O'rganish jarayoningizni kuzating"
    },
    {
      icon: Users,
      title: "Referal dasturi",
      description: "Do'stlarni taklif qilib bonus oling"
    },
    {
      icon: Crown,
      title: "Premium",
      description: "Cheksiz testlar va qo'shimcha imkoniyatlar"
    },
  ];

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm font-medium">ℹ️ Yordam</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Yordam Markazi
          </h1>
          <p className="text-muted-foreground">
            Savol-javoblar va qo'llanma
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <Card key={index} className="border-border hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-3">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-medium text-foreground">{feature.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              ❓ Ko'p so'raladigan savollar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-foreground">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              📞 Bog'lanish
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium text-foreground">Admin</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Savollar va premium uchun
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`https://t.me/${ADMIN_USERNAME}`, '_blank')}
                >
                  @{ADMIN_USERNAME}
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <MessageCircle className="h-5 w-5 text-secondary" />
                  <span className="font-medium text-foreground">Kanal</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Yangiliklar va darslar
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`https://t.me/${CHANNEL_USERNAME}`, '_blank')}
                >
                  @{CHANNEL_USERNAME}
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              💡 Foydali maslahatlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-primary">•</span>
                <span className="text-sm text-foreground">
                  Yaxshi audio sifati uchun sokin joyda gapiring
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary">•</span>
                <span className="text-sm text-foreground">
                  Har bir test 30 soniyadan oshmasligi kerak
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary">•</span>
                <span className="text-sm text-foreground">
                  Aniq va ravon gapiring, shoshilmang
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary">•</span>
                <span className="text-sm text-foreground">
                  Tahlil natijalarini diqqat bilan o'qing va takroriy mashq qiling
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Help;
