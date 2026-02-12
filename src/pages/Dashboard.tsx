import { useState, useEffect } from 'react';
import { Mic, Target, Waves, FileCheck, Music } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AudioRecorder } from '@/components/AudioRecorder';
import { AnalysisHistory } from '@/components/AnalysisHistory';
import { MaterialSelector } from '@/components/MaterialSelector';
import { PdfReport } from '@/components/PdfReport';
import { saveAnalysis } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedContent, setSelectedContent] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | undefined>();
  const [testResults, setTestResults] = useState<Array<{
    content: string;
    transcript?: string;
    accuracy_score?: number;
    fluency_score?: number;
    completeness_score?: number;
    prosody_score?: number;
    overall_score?: number;
    ai_feedback?: string;
    created_at: string;
    duration?: number;
  }>>([]);
  const { user, logout } = useAuth();
  const { toast } = useToast();

  // Load previous test results for PDF report
  useEffect(() => {
    const loadTestResults = async () => {
      if (!user?.telegramUserId) return;
      
      const { data } = await supabase
        .from('test_results')
        .select('*')
        .eq('telegram_user_id', user.telegramUserId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setTestResults(data);
      }
    };

    loadTestResults();
  }, [user?.telegramUserId]);

  const handleSelectContent = (content: string, materialId?: string) => {
    setSelectedContent(content);
    setSelectedMaterialId(materialId);
  };

  const handleAnalyze = async (audioBlob: Blob, duration: number) => {
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      if (selectedContent) {
        formData.append('reference_text', selectedContent);
      }
      if (user?.telegramUserId) {
        formData.append('telegram_user_id', user.telegramUserId);
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-audio`,
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();

      if (result.error) {
        // Check if it's a limit error
        if (result.limit !== undefined) {
          toast({
            title: "Kunlik limit tugadi",
            description: `Bugun ${result.used}/${result.limit} ta test ishlatildi. ${!result.isPremium ? "Premium obunaga o'ting!" : "Ertaga soat 12:00 da yangilanadi."}`,
            variant: "destructive",
          });
          return;
        }
        throw new Error(result.error);
      }

      // Save to IndexedDB for local history
      await saveAnalysis({
        analysis: result.analysis,
        transcript: result.transcript,
        duration,
        createdAt: new Date(),
        telegramUserId: user?.telegramUserId,
      });

      // Save to Supabase for teacher view and PDF report
      if (user?.telegramUserId) {
        const testResultData = {
          telegram_user_id: user.telegramUserId,
          material_id: selectedMaterialId || null,
          content: selectedContent || result.transcript || 'Free speech',
          transcript: result.transcript,
          accuracy_score: result.scores?.accuracy,
          fluency_score: result.scores?.fluency,
          completeness_score: result.scores?.completeness,
          prosody_score: result.scores?.prosody,
          overall_score: result.scores?.overall,
          ai_feedback: result.feedback,
          duration,
        };

        await supabase.from('test_results').insert(testResultData);

        // Update test results for PDF
        setTestResults(prev => [{
          ...testResultData,
          created_at: new Date().toISOString()
        }, ...prev]);

        // Mark material as completed if it was assigned
        if (selectedMaterialId) {
          await supabase
            .from('student_materials')
            .update({ is_completed: true, completed_at: new Date().toISOString() })
            .eq('material_id', selectedMaterialId)
            .eq('student_id', user.telegramUserId);
        }
      }

      toast({
        title: "Tahlil muvaffaqiyatli!",
        description: "Natija tarixga saqlandi",
      });

      setRefreshTrigger((prev) => prev + 1);
      setSelectedContent('');
      setSelectedMaterialId(undefined);

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Xatolik",
        description: error instanceof Error ? error.message : "Tahlil qilishda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 animate-fade-in px-2 md:px-0">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-primary/10 text-primary">
            <Mic className="h-4 w-4" />
            <span className="text-xs md:text-sm font-medium">Talaffuzni Test Qilish</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-display text-foreground">
            Ingliz Tili Talaffuz Tahlili
          </h1>
          <p className="text-muted-foreground">
            Matn tanlang yoki o'zingiz yozing, keyin talaffuz qiling
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <Card className="bg-card border-border hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-4 text-center">
              <Target className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1 md:mb-2 text-primary" />
              <p className="text-xs font-medium text-foreground">To'g'rilik</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Accuracy</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-4 text-center">
              <Waves className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1 md:mb-2 text-secondary" />
              <p className="text-xs font-medium text-foreground">Ravonlik</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Fluency</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-4 text-center">
              <FileCheck className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1 md:mb-2 text-accent" />
              <p className="text-xs font-medium text-foreground">To'liqlik</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Completeness</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-4 text-center">
              <Music className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-1 md:mb-2 text-info" />
              <p className="text-xs font-medium text-foreground">Ohang</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Prosody</p>
            </CardContent>
          </Card>
        </div>

        {/* Material Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Matn tanlang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MaterialSelector 
              telegramUserId={user.telegramUserId}
              onSelect={handleSelectContent}
              selectedContent={selectedContent}
            />
          </CardContent>
        </Card>

        {/* Audio Recorder */}
        <AudioRecorder 
          onAnalyze={handleAnalyze} 
          isAnalyzing={isAnalyzing}
        />

        {/* PDF Report Button */}
        {testResults.length > 0 && (
          <div className="flex justify-end">
            <PdfReport 
              results={testResults}
              userName={`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Foydalanuvchi'}
            />
          </div>
        )}

        {/* Analysis History */}
        <AnalysisHistory 
          refreshTrigger={refreshTrigger} 
        />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
