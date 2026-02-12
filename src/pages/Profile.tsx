import { useState, useEffect } from 'react';
import { User, Calendar, BarChart3, Clock, Crown, Mic } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { getAnalyses, type AnalysisRecord } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const Profile = () => {
  const { user, logout } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const data = await getAnalyses(user.telegramUserId);
        setAnalyses(data);
      } catch (error) {
        console.error('Error loading analyses:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user]);

  if (!user) return null;

  // Calculate stats
  const totalTests = analyses.length;
  const totalDuration = analyses.reduce((sum, a) => sum + (a.duration || 0), 0);
  const avgDuration = totalTests > 0 ? Math.round(totalDuration / totalTests) : 0;
  
  // Daily limit (for free users)
  const today = new Date().toDateString();
  const todayTests = analyses.filter(a => new Date(a.createdAt).toDateString() === today).length;
  const dailyLimit = 3; // Free user limit
  const remainingTests = Math.max(0, dailyLimit - todayTests);

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">👤 Profil</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Mening Profilim
          </h1>
        </div>

        {/* User Card */}
        <Card className="border-border overflow-hidden">
          <div className="h-20 gradient-primary" />
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col items-center -mt-10">
              <div className="w-20 h-20 rounded-full bg-card border-4 border-card flex items-center justify-center overflow-hidden">
                {user.photoUrl ? (
                  <img 
                    src={user.photoUrl} 
                    alt={user.firstName} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <h2 className="mt-3 text-xl font-bold text-foreground">
                {user.firstName} {user.lastName || ''}
              </h2>
              {user.username && (
                <p className="text-muted-foreground">@{user.username}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-muted-foreground">
                  Bepul foydalanuvchi
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mic className="h-5 w-5 text-primary" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-6 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{totalTests}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Jami testlar</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-6 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{avgDuration}s</p>
                  )}
                  <p className="text-xs text-muted-foreground">O'rtacha vaqt</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Calendar className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{todayTests}</p>
                  <p className="text-xs text-muted-foreground">Bugungi testlar</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <BarChart3 className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{remainingTests}</p>
                  <p className="text-xs text-muted-foreground">Qolgan limit</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Limit Card */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              📊 Kunlik Limit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Bugun ishlatilgan</span>
              <span className="font-medium">{todayTests} / {dailyLimit}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div 
                className="h-3 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, (todayTests / dailyLimit) * 100)}%`,
                  background: todayTests >= dailyLimit 
                    ? 'hsl(var(--destructive))' 
                    : 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))'
                }}
              />
            </div>
            {remainingTests === 0 && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <Crown className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Kunlik limit tugadi</p>
                  <p className="text-xs text-muted-foreground">Premium bilan cheksiz test qiling</p>
                </div>
                <Button size="sm" className="shrink-0">
                  💎 Premium
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              ⚙️ Hisob ma'lumotlari
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Telegram ID</span>
              <span className="font-mono text-sm">{user.telegramUserId}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Ism</span>
              <span>{user.firstName} {user.lastName || ''}</span>
            </div>
            {user.username && (
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Username</span>
                <span>@{user.username}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Status</span>
              <Badge className="bg-muted text-muted-foreground">Bepul</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
