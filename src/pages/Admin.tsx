import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  CreditCard, 
  Settings, 
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Edit,
  RefreshCw,
  GraduationCap,
  Activity
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { TeachersManagement } from '@/components/TeachersManagement';
import { ApiRequestLogs } from '@/components/ApiRequestLogs';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Plan {
  id: string;
  name: string;
  description: string;
  duration_days: number;
  price: number;
  daily_limit: number | null;
  is_active: boolean;
}

interface PaymentRequest {
  id: string;
  telegram_user_id: string;
  telegram_username: string | null;
  telegram_first_name: string | null;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  plan: { name: string; price: number; duration_days: number } | null;
}

interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  pendingPayments: number;
  todayLogins: number;
}

interface PaymentSettings {
  card_number: string;
  card_holder: string;
  bank_name: string;
  additional_info: string;
}

const Admin = () => {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  
  // Dialogs
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [editSettingsOpen, setEditSettingsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [settingsForm, setSettingsForm] = useState<PaymentSettings>({
    card_number: '',
    card_holder: '',
    bank_name: '',
    additional_info: ''
  });

  const adminApi = async (action: string, data: object = {}) => {
    if (!user) throw new Error('Not authenticated');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'x-telegram-user-id': user.telegramUserId
      },
      body: JSON.stringify({ action, ...data })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'API error');
    }
    
    return result;
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [statsResult, plansResult, paymentsResult, settingsResult] = await Promise.all([
        adminApi('get_stats'),
        adminApi('get_plans'),
        adminApi('get_payment_requests'),
        adminApi('get_payment_settings')
      ]);
      
      setStats(statsResult.stats);
      setPlans(plansResult.plans || []);
      setPaymentRequests(paymentsResult.requests || []);
      setPaymentSettings(settingsResult.settings);
      setIsAdmin(true);
      
      if (settingsResult.settings) {
        setSettingsForm(settingsResult.settings);
      }
      
    } catch (error) {
      console.error('Admin access error:', error);
      setIsAdmin(false);
      toast({
        title: "Ruxsat yo'q",
        description: "Siz admin emassiz",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      loadData();
    }
  }, [user, authLoading]);

  const handleApprovePayment = async (paymentId: string) => {
    try {
      await adminApi('approve_payment', { payment_id: paymentId });
      toast({ title: "Tasdiqlandi!", description: "To'lov tasdiqlandi va obuna faollashtirildi" });
      loadData();
    } catch (error) {
      toast({ title: "Xatolik", description: String(error), variant: "destructive" });
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    try {
      await adminApi('reject_payment', { payment_id: paymentId });
      toast({ title: "Rad etildi", description: "To'lov rad etildi" });
      loadData();
    } catch (error) {
      toast({ title: "Xatolik", description: String(error), variant: "destructive" });
    }
  };

  const handleUpdatePlan = async () => {
    if (!selectedPlan) return;
    
    try {
      await adminApi('update_plan', selectedPlan);
      toast({ title: "Saqlandi", description: "Tarif yangilandi" });
      setEditPlanOpen(false);
      loadData();
    } catch (error) {
      toast({ title: "Xatolik", description: String(error), variant: "destructive" });
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await adminApi('update_payment_settings', settingsForm);
      toast({ title: "Saqlandi", description: "To'lov sozlamalari yangilandi" });
      setEditSettingsOpen(false);
      loadData();
    } catch (error) {
      toast({ title: "Xatolik", description: String(error), variant: "destructive" });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h1 className="text-xl font-bold mb-2">Ruxsat yo'q</h1>
            <p className="text-muted-foreground mb-4">
              Bu sahifa faqat adminlar uchun
            </p>
            <Button onClick={() => navigate('/test')}>
              Bosh sahifaga
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Shield className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h1 className="text-lg font-bold font-display">Admin Panel</h1>
                <p className="text-xs text-muted-foreground">Ravon AI boshqaruv</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/test')}>
                Saytga
              </Button>
              <Button variant="ghost" size="sm" onClick={logout}>
                Chiqish
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                  <p className="text-xs text-muted-foreground">Jami foydalanuvchilar</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <CheckCircle className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</p>
                  <p className="text-xs text-muted-foreground">Faol obunalar</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.pendingPayments || 0}</p>
                  <p className="text-xs text-muted-foreground">Kutilmoqda</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <BarChart3 className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.todayLogins || 0}</p>
                  <p className="text-xs text-muted-foreground">Bugun kirganlar</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="payments" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="payments" className="text-xs">
              <CreditCard className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">To'lovlar</span> {(stats?.pendingPayments || 0) > 0 && (
                <Badge variant="destructive" className="ml-1">{stats?.pendingPayments}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="plans" className="text-xs">
              <Settings className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Tariflar</span>
            </TabsTrigger>
            <TabsTrigger value="teachers" className="text-xs">
              <GraduationCap className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">O'qituvchi</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs">
              <Activity className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">API Logs</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              <Settings className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Sozlama</span>
            </TabsTrigger>
          </TabsList>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>To'lov so'rovlari</CardTitle>
                <CardDescription>Foydalanuvchilardan kelgan to'lov so'rovlarini tasdiqlang</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>To'lov so'rovlari yo'q</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentRequests.map((request) => (
                      <div 
                        key={request.id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {request.telegram_first_name || 'Foydalanuvchi'}
                            </p>
                            {request.telegram_username && (
                              <span className="text-sm text-muted-foreground">
                                @{request.telegram_username}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {request.plan?.name || 'Noma\'lum tarif'} - {request.amount?.toLocaleString()} so'm
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleString('uz-UZ')}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {request.status === 'pending' ? (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleRejectPayment(request.id)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => handleApprovePayment(request.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Tasdiqlash
                              </Button>
                            </>
                          ) : (
                            <Badge variant={request.status === 'approved' ? 'default' : 'destructive'}>
                              {request.status === 'approved' ? '✅ Tasdiqlangan' : '❌ Rad etilgan'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tarif rejalar</CardTitle>
                <CardDescription>Obuna tariflarini boshqaring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <div 
                      key={plan.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{plan.name}</p>
                          {!plan.is_active && (
                            <Badge variant="outline">Nofaol</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {plan.description}
                        </p>
                        <p className="text-sm">
                          💰 {plan.price.toLocaleString()} so'm | 
                          ⏱️ {plan.duration_days} kun | 
                          📊 {plan.daily_limit === null ? 'Cheksiz' : `${plan.daily_limit} ta/kun`}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedPlan(plan);
                          setEditPlanOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers" className="space-y-4">
            <TeachersManagement />
          </TabsContent>

          {/* API Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <ApiRequestLogs />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>To'lov ma'lumotlari</CardTitle>
                <CardDescription>Foydalanuvchilarga ko'rsatiladigan karta ma'lumotlari</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentSettings ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <p className="text-sm text-muted-foreground">Karta raqami</p>
                      <p className="font-mono text-lg">{paymentSettings.card_number}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <p className="text-sm text-muted-foreground">Karta egasi</p>
                      <p className="font-medium">{paymentSettings.card_holder}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <p className="text-sm text-muted-foreground">Bank nomi</p>
                      <p className="font-medium">{paymentSettings.bank_name}</p>
                    </div>
                    {paymentSettings.additional_info && (
                      <div className="p-4 rounded-lg bg-muted/30 border border-border">
                        <p className="text-sm text-muted-foreground">Qo'shimcha ma'lumot</p>
                        <p>{paymentSettings.additional_info}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>To'lov ma'lumotlari kiritilmagan</p>
                  </div>
                )}
                <Button 
                  className="w-full mt-4"
                  onClick={() => setEditSettingsOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Tahrirlash
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Plan Dialog */}
      <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tarifni tahrirlash</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Nomi</label>
                <Input 
                  value={selectedPlan.name}
                  onChange={(e) => setSelectedPlan({...selectedPlan, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Tavsif</label>
                <Input 
                  value={selectedPlan.description || ''}
                  onChange={(e) => setSelectedPlan({...selectedPlan, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Narx (so'm)</label>
                  <Input 
                    type="number"
                    value={selectedPlan.price}
                    onChange={(e) => setSelectedPlan({...selectedPlan, price: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Muddat (kun)</label>
                  <Input 
                    type="number"
                    value={selectedPlan.duration_days}
                    onChange={(e) => setSelectedPlan({...selectedPlan, duration_days: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Kunlik limit (bo'sh = cheksiz)</label>
                <Input 
                  type="number"
                  value={selectedPlan.daily_limit || ''}
                  onChange={(e) => setSelectedPlan({
                    ...selectedPlan, 
                    daily_limit: e.target.value ? Number(e.target.value) : null
                  })}
                  placeholder="Cheksiz"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlanOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleUpdatePlan}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Settings Dialog */}
      <Dialog open={editSettingsOpen} onOpenChange={setEditSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>To'lov sozlamalari</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Karta raqami</label>
              <Input 
                value={settingsForm.card_number}
                onChange={(e) => setSettingsForm({...settingsForm, card_number: e.target.value})}
                placeholder="8600 1234 5678 9012"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Karta egasi</label>
              <Input 
                value={settingsForm.card_holder}
                onChange={(e) => setSettingsForm({...settingsForm, card_holder: e.target.value})}
                placeholder="SANAT KHAMIDOV"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Bank nomi</label>
              <Input 
                value={settingsForm.bank_name}
                onChange={(e) => setSettingsForm({...settingsForm, bank_name: e.target.value})}
                placeholder="Uzcard, Humo, Visa, etc."
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Qo'shimcha ma'lumot</label>
              <Input 
                value={settingsForm.additional_info}
                onChange={(e) => setSettingsForm({...settingsForm, additional_info: e.target.value})}
                placeholder="To'lov izohi..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSettingsOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleUpdateSettings}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
