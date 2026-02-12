import { useState } from 'react';
import { Crown, Check, Sparkles, MessageCircle, Copy, ExternalLink } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// Admin Telegram username
const ADMIN_USERNAME = 'khamidovsanat';

const Premium = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  if (!user) return null;

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(`@${ADMIN_USERNAME}`);
    toast({
      title: "Nusxalandi!",
      description: `@${ADMIN_USERNAME} nusxalandi`,
    });
  };

  const handleContactAdmin = () => {
    window.open(`https://t.me/${ADMIN_USERNAME}`, '_blank');
  };

  const features = [
    '✅ Cheksiz kunlik test',
    '✅ Tezroq tahlil natijalari',
    '✅ Batafsil transkripsiya',
    '✅ So\'z-so\'z tahlil',
    '✅ Audio yuklab olish',
    '✅ Prioritet qo\'llab-quvvatlash',
  ];

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <Crown className="h-4 w-4" />
            <span className="text-sm font-medium">💎 Premium</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Premium Rejalar
          </h1>
          <p className="text-muted-foreground">
            Cheksiz imkoniyatlar bilan ingliz tilingizni rivojlantiring
          </p>
        </div>

        {/* Current Status */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Hozirgi status</h3>
                <p className="text-sm text-muted-foreground">
                  Siz hozirda bepul rejada foydalanmoqdasiz (kuniga 3 ta test)
                </p>
              </div>
              <Badge variant="outline" className="text-muted-foreground border-muted-foreground">
                Bepul
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              🌟 Premium imkoniyatlari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* How to buy */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              💳 Premium sotib olish
            </CardTitle>
            <CardDescription>
              Premium sotib olish uchun admin bilan bog'laning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center gap-4 p-6 rounded-lg bg-muted/50">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Admin bilan bog'laning</p>
                <div className="flex items-center gap-2 justify-center">
                  <Badge variant="secondary" className="text-base px-4 py-2">
                    @{ADMIN_USERNAME}
                  </Badge>
                  <Button variant="outline" size="icon" onClick={handleCopyUsername}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Qadamlar:</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                  <p className="text-sm text-foreground">Adminga yozing: @{ADMIN_USERNAME}</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                  <p className="text-sm text-foreground">Kerakli tarifni tanlang</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                  <p className="text-sm text-foreground">To'lovni amalga oshiring</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
                  <p className="text-sm text-foreground">Admin premium ni faollashtiradi</p>
                </div>
              </div>
            </div>

            <Button 
              className="w-full" 
              size="lg"
              onClick={handleContactAdmin}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Admin bilan bog'lanish
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              ❓ Ko'p so'raladigan savollar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Premium qancha turadi?</h4>
              <p className="text-sm text-muted-foreground">
                Tariflar haqida ma'lumot olish uchun admin bilan bog'laning.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Qanday to'lash mumkin?</h4>
              <p className="text-sm text-muted-foreground">
                Bank kartasi orqali to'lash mumkin. Admin sizga to'lov ma'lumotlarini yuboradi.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Premium qachon faollashadi?</h4>
              <p className="text-sm text-muted-foreground">
                To'lov tasdiqlangandan so'ng darhol faollashadi.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Premium;
