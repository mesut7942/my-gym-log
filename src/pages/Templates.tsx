import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Copy, Trash2, ChevronRight, Dumbbell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: string;
  name: string;
  description: string | null;
  exercise_count: number;
}

export default function Templates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const fetchTemplates = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .select(`
          id,
          name,
          description,
          template_exercises(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTemplates = data?.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        exercise_count: (t.template_exercises as any)?.[0]?.count || 0
      })) || [];

      setTemplates(formattedTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .insert({
          user_id: user.id,
          name: newName.trim(),
          description: newDescription.trim() || null
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates([{ ...data, exercise_count: 0 }, ...templates]);
      setIsCreateDialogOpen(false);
      setNewName('');
      setNewDescription('');

      toast({
        title: 'Template created!',
        description: 'Add exercises to your new template.',
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to create template.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Delete this template?')) return;

    try {
      await supabase.from('workout_templates').delete().eq('id', templateId);
      setTemplates(templates.filter(t => t.id !== templateId));
      toast({ title: 'Template deleted' });
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const startFromTemplate = async (templateId: string, templateName: string) => {
    if (!user) return;

    try {
      // Create new workout
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          name: templateName,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Get template exercises
      const { data: templateExercises } = await supabase
        .from('template_exercises')
        .select('exercise_id, order_index, target_sets, target_reps')
        .eq('template_id', templateId)
        .order('order_index');

      // Copy exercises to workout
      if (templateExercises && templateExercises.length > 0) {
        for (const te of templateExercises) {
          const { data: workoutExercise } = await supabase
            .from('workout_exercises')
            .insert({
              workout_id: workout.id,
              exercise_id: te.exercise_id,
              order_index: te.order_index
            })
            .select()
            .single();

          // Add sets based on target
          const numSets = te.target_sets || 3;
          for (let i = 1; i <= numSets; i++) {
            await supabase.from('sets').insert({
              workout_exercise_id: workoutExercise.id,
              set_number: i
            });
          }
        }
      }

      toast({
        title: 'Workout started!',
        description: `Starting ${templateName} from template.`,
      });

      navigate(`/workout/${workout.id}/active`);
    } catch (error) {
      console.error('Error starting from template:', error);
      toast({
        title: 'Error',
        description: 'Failed to start workout from template.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <AppLayout showNav={false}>
        <PageHeader title="Templates" showBack />
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showNav={false}>
      <PageHeader 
        title="Workout Templates" 
        subtitle="Save your favorite routines"
        showBack
        rightAction={
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Template</DialogTitle>
              </DialogHeader>
              <form onSubmit={createTemplate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Push Day A"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full gradient-primary"
                  disabled={!newName.trim() || creating}
                >
                  {creating ? 'Creating...' : 'Create Template'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="max-w-lg mx-auto p-4">
        {templates.length === 0 ? (
          <EmptyState
            icon={<Copy className="h-8 w-8 text-muted-foreground" />}
            title="No templates yet"
            description="Create workout templates to quickly start your favorite routines."
            action={{
              label: 'Create Template',
              onClick: () => setIsCreateDialogOpen(true)
            }}
          />
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <Card key={template.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => startFromTemplate(template.id, template.name)}
                    >
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {template.exercise_count} exercises
                        {template.description && ` • ${template.description}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => startFromTemplate(template.id, template.name)}
                      >
                        Start
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
