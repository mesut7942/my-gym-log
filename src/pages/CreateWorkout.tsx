import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function CreateWorkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !name.trim()) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          name: name.trim(),
          notes: notes.trim() || null,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Workout started!',
        description: 'Time to crush it! 💪',
      });

      navigate(`/workout/${data.id}/active`);
    } catch (error) {
      console.error('Error creating workout:', error);
      toast({
        title: 'Error',
        description: 'Failed to create workout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const quickWorkouts = [
    'Push Day',
    'Pull Day',
    'Leg Day',
    'Chest & Triceps',
    'Back & Biceps',
    'Shoulders & Arms',
    'Full Body',
    'Upper Body',
    'Lower Body',
  ];

  return (
    <AppLayout showNav={false}>
      <PageHeader title="New Workout" showBack />

      <div className="max-w-lg mx-auto p-4 space-y-6">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workout Name</Label>
            <Input
              id="name"
              placeholder="e.g., Leg Day, Push Day..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any notes for this workout..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full gradient-primary" 
            size="lg"
            disabled={!name.trim() || loading}
          >
            {loading ? 'Starting...' : 'Start Workout'}
          </Button>
        </form>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Quick Start</p>
          <div className="flex flex-wrap gap-2">
            {quickWorkouts.map((workout) => (
              <Button
                key={workout}
                variant="outline"
                size="sm"
                onClick={() => setName(workout)}
                className={name === workout ? 'border-primary text-primary' : ''}
              >
                {workout}
              </Button>
            ))}
          </div>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-2">💡 Tip</p>
            <p className="text-sm">
              You can also start from a saved template to quickly load your favorite exercises.
            </p>
            <Button 
              variant="link" 
              className="p-0 h-auto text-primary"
              onClick={() => navigate('/templates')}
            >
              View Templates →
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
