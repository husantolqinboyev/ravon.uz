import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Send, 
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  FileText,
  Type,
  UserPlus,
  CheckCircle2
} from 'lucide-react';
import { AddStudentDialog } from '@/components/AddStudentDialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface Student {
  id: string;
  student_id: string;
  created_at: string;
}

interface Material {
  id: string;
  type: string;
  content: string;
  translation: string | null;
  is_public: boolean;
  created_at: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const Teacher = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isTeacher, setIsTeacher] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  // Dialog states
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addMaterialOpen, setAddMaterialOpen] = useState(false);
  const [sendMaterialOpen, setSendMaterialOpen] = useState(false);
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false);

  // Form states
  const [materialType, setMaterialType] = useState<'word' | 'text'>('word');
  const [materialContent, setMaterialContent] = useState('');
  const [materialTranslation, setMaterialTranslation] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const checkTeacherRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.telegramUserId)
        .in('role', ['teacher', 'admin'])
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking role:', error);
      }

      setIsTeacher(!!data);
    } catch (err) {
      console.error('Role check error:', err);
      setIsTeacher(false);
    }
  };

  const loadData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);

      const { data: studentsData } = await supabase
        .from('teacher_students')
        .select('*')
        .eq('teacher_id', user.telegramUserId);

      setStudents(studentsData || []);

      const { data: materialsData } = await supabase
        .from('learning_materials')
        .select('*')
        .eq('created_by', user.telegramUserId)
        .order('created_at', { ascending: false });

      setMaterials(materialsData || []);
    } catch (err) {
      console.error('Load data error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkTeacherRole();
      loadData();
    }
  }, [user]);

  const handleRemoveStudent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('teacher_students')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "O'chirildi", description: "O'quvchi ro'yxatdan chiqarildi" });
      loadData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Xatolik yuz berdi";
      toast({ title: "Xatolik", description: errorMessage, variant: "destructive" });
    }
  };

  const handleAddMaterial = async () => {
    if (!user || !materialContent.trim()) return;

    try {
      const { error } = await supabase
        .from('learning_materials')
        .insert({
          created_by: user.telegramUserId,
          type: materialType,
          content: materialContent.trim(),
          translation: materialTranslation.trim() || null,
          is_public: isPublic
        });

      if (error) throw error;

      toast({ title: "Saqlandi", description: "Material qo'shildi" });
      setAddMaterialOpen(false);
      setMaterialContent('');
      setMaterialTranslation('');
      loadData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Xatolik yuz berdi";
      toast({ title: "Xatolik", description: errorMessage, variant: "destructive" });
    }
  };

  const handleSendMaterial = async () => {
    if (!user || !selectedMaterial || selectedStudents.length === 0) return;

    try {
      const inserts = selectedStudents.map(studentId => ({
        material_id: selectedMaterial.id,
        student_id: studentId,
        sent_by: user.telegramUserId
      }));

      const { error } = await supabase
        .from('student_materials')
        .upsert(inserts, { onConflict: 'material_id,student_id' });

      if (error) throw error;

      toast({ 
        title: "Yuborildi", 
        description: `${selectedStudents.length} ta o'quvchiga yuborildi` 
      });
      setSendMaterialOpen(false);
      setSelectedMaterial(null);
      setSelectedStudents([]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Xatolik yuz berdi";
      toast({ title: "Xatolik", description: errorMessage, variant: "destructive" });
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          action: 'generate_material',
          prompt: aiPrompt,
          type: materialType
        })
      });

      const result = await response.json();
      
      if (result.content) {
        setMaterialContent(result.content);
        if (result.translation) {
          setMaterialTranslation(result.translation);
        }
        setAiGenerateOpen(false);
        setAddMaterialOpen(true);
        toast({ title: "Yaratildi", description: "AI material yaratdi" });
      }
    } catch (err) {
      toast({ title: "Xatolik", description: "AI xatolik", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      const { error } = await supabase
        .from('learning_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "O'chirildi" });
      loadData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Xatolik yuz berdi";
      toast({ title: "Xatolik", description: errorMessage, variant: "destructive" });
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.student_id));
    }
  };

  if (!user) {
    navigate('/');
    return null;
  }

  if (!isTeacher && !isLoading) {
    return (
      <DashboardLayout user={user} onLogout={logout}>
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="p-8 text-center">
            <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-xl font-bold mb-2">Ruxsat yo'q</h1>
            <p className="text-muted-foreground mb-4">
              Bu sahifa faqat o'qituvchilar uchun
            </p>
            <Button onClick={() => navigate('/test')}>
              Bosh sahifaga
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 animate-fade-in px-2 md:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-display flex items-center gap-2">
              <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              O'qituvchi Paneli
            </h1>
            <p className="text-sm text-muted-foreground">O'quvchilarni boshqaring va materiallar yarating</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <Card>
            <CardContent className="p-3 md:p-4 text-center">
              <Users className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-1 md:mb-2 text-primary" />
              <p className="text-xl md:text-2xl font-bold">{students.length}</p>
              <p className="text-xs text-muted-foreground">O'quvchilar</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4 text-center">
              <Type className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-1 md:mb-2 text-secondary" />
              <p className="text-xl md:text-2xl font-bold">{materials.filter(m => m.type === 'word').length}</p>
              <p className="text-xs text-muted-foreground">So'zlar</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4 text-center">
              <FileText className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-1 md:mb-2 text-accent" />
              <p className="text-xl md:text-2xl font-bold">{materials.filter(m => m.type === 'text').length}</p>
              <p className="text-xs text-muted-foreground">Matnlar</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4 text-center">
              <BookOpen className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-1 md:mb-2 text-info" />
              <p className="text-xl md:text-2xl font-bold">{materials.filter(m => m.is_public).length}</p>
              <p className="text-xs text-muted-foreground">Umumiy</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="students" className="text-xs md:text-sm flex items-center gap-1 md:gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">O'quvchilar</span>
              <span className="sm:hidden">O'quvchi</span>
            </TabsTrigger>
            <TabsTrigger value="materials" className="text-xs md:text-sm flex items-center gap-1 md:gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Materiallar</span>
              <span className="sm:hidden">Material</span>
            </TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 md:p-6">
                <div>
                  <CardTitle className="text-base md:text-lg">O'quvchilarim</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Biriktirilgan o'quvchilar ro'yxati</CardDescription>
                </div>
                <Button size="sm" onClick={() => setAddStudentOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Qo'shish</span>
                </Button>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                {students.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Hali o'quvchi yo'q</p>
                    <p className="text-xs">O'quvchi qo'shish uchun yuqoridagi tugmani bosing</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {students.map((student) => (
                      <div 
                        key={student.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">ID: {student.student_id}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(student.created_at).toLocaleDateString('uz-UZ')}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleRemoveStudent(student.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 md:p-6">
                <div>
                  <CardTitle className="text-base md:text-lg">Materiallarim</CardTitle>
                  <CardDescription className="text-xs md:text-sm">So'z va matnlar bazasi</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAiGenerateOpen(true)}>
                    <Sparkles className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">AI bilan</span>
                  </Button>
                  <Button size="sm" onClick={() => setAddMaterialOpen(true)}>
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Qo'shish</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                {materials.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Hali material yo'q</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {materials.map((material) => (
                      <div 
                        key={material.id}
                        className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1 md:gap-2">
                            <Badge variant={material.type === 'word' ? 'default' : 'secondary'} className="text-xs">
                              {material.type === 'word' ? 'So\'z' : 'Matn'}
                            </Badge>
                            {material.is_public && (
                              <Badge variant="outline" className="text-xs">Umumiy</Badge>
                            )}
                          </div>
                          <p className="font-medium mt-1 text-sm line-clamp-2">{material.content}</p>
                          {material.translation && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{material.translation}</p>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-1">
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedMaterial(material);
                              setSelectedStudents([]);
                              setSendMaterialOpen(true);
                            }}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDeleteMaterial(material.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Student Dialog */}
        <AddStudentDialog
          open={addStudentOpen}
          onOpenChange={setAddStudentOpen}
          teacherId={user.telegramUserId}
          existingStudentIds={students.map(s => s.student_id)}
          onSuccess={loadData}
        />

        {/* Add Material Dialog */}
        <Dialog open={addMaterialOpen} onOpenChange={setAddMaterialOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Material qo'shish</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  variant={materialType === 'word' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMaterialType('word')}
                  className="flex-1"
                >
                  <Type className="h-4 w-4 mr-1" />
                  So'z
                </Button>
                <Button 
                  variant={materialType === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMaterialType('text')}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Matn
                </Button>
              </div>
              <div>
                <Label>Inglizcha {materialType === 'word' ? 'so\'z' : 'matn'}</Label>
                {materialType === 'word' ? (
                  <Input 
                    placeholder="Hello"
                    value={materialContent}
                    onChange={(e) => setMaterialContent(e.target.value)}
                  />
                ) : (
                  <Textarea 
                    placeholder="Enter your text here..."
                    value={materialContent}
                    onChange={(e) => setMaterialContent(e.target.value)}
                    rows={4}
                  />
                )}
              </div>
              <div>
                <Label>O'zbekcha tarjima (ixtiyoriy)</Label>
                <Input 
                  placeholder="Salom"
                  value={materialTranslation}
                  onChange={(e) => setMaterialTranslation(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(checked as boolean)}
                />
                <Label htmlFor="isPublic" className="text-sm">Barcha o'quvchilar uchun ochiq</Label>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setAddMaterialOpen(false)} className="w-full sm:w-auto">Bekor</Button>
              <Button onClick={handleAddMaterial} className="w-full sm:w-auto">Saqlash</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send Material Dialog - Improved */}
        <Dialog open={sendMaterialOpen} onOpenChange={setSendMaterialOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Material yuborish
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedMaterial && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Badge className="mb-2">{selectedMaterial.type === 'word' ? 'So\'z' : 'Matn'}</Badge>
                  <p className="font-medium text-sm">{selectedMaterial.content}</p>
                </div>
              )}
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>O'quvchilarni tanlang</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={selectAllStudents}
                    className="text-xs h-7"
                  >
                    {selectedStudents.length === students.length ? 'Bekor qilish' : 'Barchasini tanlash'}
                  </Button>
                </div>
                
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Avval o'quvchilarni qo'shing
                  </p>
                ) : (
                  <ScrollArea className="h-48 border rounded-lg p-2">
                    <div className="space-y-1">
                      {students.map((student) => (
                        <div 
                          key={student.id}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleStudentSelection(student.student_id)}
                        >
                          <Checkbox 
                            checked={selectedStudents.includes(student.student_id)}
                            onCheckedChange={() => toggleStudentSelection(student.student_id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">ID: {student.student_id}</p>
                          </div>
                          {selectedStudents.includes(student.student_id) && (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
              
              {selectedStudents.length > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  <span className="font-medium text-primary">{selectedStudents.length}</span> ta o'quvchi tanlandi
                </p>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setSendMaterialOpen(false)} className="w-full sm:w-auto">Bekor</Button>
              <Button 
                onClick={handleSendMaterial} 
                disabled={selectedStudents.length === 0}
                className="w-full sm:w-auto"
              >
                <Send className="h-4 w-4 mr-2" />
                Yuborish ({selectedStudents.length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI Generate Dialog */}
        <Dialog open={aiGenerateOpen} onOpenChange={setAiGenerateOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI bilan material yaratish
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  variant={materialType === 'word' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMaterialType('word')}
                  className="flex-1"
                >
                  <Type className="h-4 w-4 mr-1" />
                  So'z
                </Button>
                <Button 
                  variant={materialType === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMaterialType('text')}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Matn
                </Button>
              </div>
              <div>
                <Label>Mavzu yoki yo'riqnoma</Label>
                <Textarea 
                  placeholder="Masalan: Sayohat haqida 3-5 gap yozing..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setAiGenerateOpen(false)} className="w-full sm:w-auto">Bekor</Button>
              <Button onClick={handleAiGenerate} disabled={isGenerating} className="w-full sm:w-auto">
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? 'Yaratilmoqda...' : 'Yaratish'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Teacher;
