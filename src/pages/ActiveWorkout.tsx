import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Check, Timer, Dumbbell, Trash2, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
}

interface WorkoutExercise {
  id: string;
  exercise: Exercise;
  sets: SetData[];
}

interface SetData {
  id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  is_completed: boolean;
}

export default function ActiveWorkout() {
  const { id } = useParams();
  const { user } = useAuth();
  const { unit, formatWeight } = useSettings();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [workout, setWorkout] = useState<{ id: string; name: string; started_at: string } | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user && id) {
      fetchWorkout();
      fetchAvailableExercises();
    }
  }, [user, id]);

  useEffect(() => {
    if (!workout) return;

    const startTime = new Date(workout.started_at).getTime();
    
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsedTime(Math.floor((now - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [workout]);

  const fetchWorkout = async () => {
    try {
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select('id, name, started_at')
        .eq('id', id)
        .single();

      if (workoutError) throw workoutError;
      setWorkout(workoutData);

      const { data: exercisesData, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select(`
          id,
          exercise:exercises(id, name, muscle_group),
          sets(id, set_number, weight, reps, rpe, is_completed)
        `)
        .eq('workout_id', id)
        .order('order_index');

      if (exercisesError) throw exercisesError;

      const formattedExercises = exercisesData?.map(we => ({
        id: we.id,
        exercise: we.exercise as unknown as Exercise,
        sets: ((we.sets as unknown as SetData[]) || []).sort((a, b) => a.set_number - b.set_number)
      })) || [];

      setExercises(formattedExercises);
    } catch (error) {
      console.error('Error fetching workout:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableExercises = async () => {
    const { data } = await supabase
      .from('exercises')
      .select('id, name, muscle_group')
      .order('muscle_group')
      .order('name');

    if (data) setAvailableExercises(data);
  };

  const addExercise = async (exercise: Exercise) => {
    if (!id) return;

    try {
      const { data: workoutExercise, error } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id: id,
          exercise_id: exercise.id,
          order_index: exercises.length
        })
        .select()
        .single();

      if (error) throw error;

      // Add first set automatically
      const { data: firstSet } = await supabase
        .from('sets')
        .insert({
          workout_exercise_id: workoutExercise.id,
          set_number: 1
        })
        .select()
        .single();

      setExercises([...exercises, {
        id: workoutExercise.id,
        exercise,
        sets: firstSet ? [firstSet] : []
      }]);

      setIsExerciseDialogOpen(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error adding exercise:', error);
    }
  };

  const addSet = async (workoutExerciseId: string, currentSets: SetData[]) => {
    try {
      const { data, error } = await supabase
        .from('sets')
        .insert({
          workout_exercise_id: workoutExerciseId,
          set_number: currentSets.length + 1
        })
        .select()
        .single();

      if (error) throw error;

      setExercises(exercises.map(we => 
        we.id === workoutExerciseId 
          ? { ...we, sets: [...we.sets, data] }
          : we
      ));
    } catch (error) {
      console.error('Error adding set:', error);
    }
  };

  const updateSet = async (setId: string, field: 'weight' | 'reps' | 'rpe', value: number | null) => {
    try {
      await supabase
        .from('sets')
        .update({ [field]: value })
        .eq('id', setId);

      setExercises(exercises.map(we => ({
        ...we,
        sets: we.sets.map(s => s.id === setId ? { ...s, [field]: value } : s)
      })));
    } catch (error) {
      console.error('Error updating set:', error);
    }
  };

  const toggleSetComplete = async (setId: string, isCompleted: boolean) => {
    try {
      await supabase
        .from('sets')
        .update({ is_completed: !isCompleted })
        .eq('id', setId);

      setExercises(exercises.map(we => ({
        ...we,
        sets: we.sets.map(s => s.id === setId ? { ...s, is_completed: !isCompleted } : s)
      })));
    } catch (error) {
      console.error('Error toggling set:', error);
    }
  };

  const deleteSet = async (workoutExerciseId: string, setId: string) => {
    try {
      await supabase.from('sets').delete().eq('id', setId);

      setExercises(exercises.map(we => 
        we.id === workoutExerciseId 
          ? { ...we, sets: we.sets.filter(s => s.id !== setId) }
          : we
      ));
    } catch (error) {
      console.error('Error deleting set:', error);
    }
  };

  const removeExercise = async (workoutExerciseId: string) => {
    try {
      await supabase.from('workout_exercises').delete().eq('id', workoutExerciseId);
      setExercises(exercises.filter(we => we.id !== workoutExerciseId));
    } catch (error) {
      console.error('Error removing exercise:', error);
    }
  };

  const finishWorkout = async () => {
    if (!id) return;

    try {
      await supabase
        .from('workouts')
        .update({
          completed_at: new Date().toISOString(),
          duration_seconds: elapsedTime
        })
        .eq('id', id);

      toast({
        title: 'Workout Complete! 🎉',
        description: `Great job! You worked out for ${formatTime(elapsedTime)}`,
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error finishing workout:', error);
    }
  };

  const cancelWorkout = async () => {
    if (!id) return;

    if (!confirm('Are you sure you want to cancel this workout? All data will be lost.')) {
      return;
    }

    try {
      await supabase.from('workouts').delete().eq('id', id);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error canceling workout:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredExercises = availableExercises.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.muscle_group.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedExercises = filteredExercises.reduce((acc, exercise) => {
    if (!acc[exercise.muscle_group]) {
      acc[exercise.muscle_group] = [];
    }
    acc[exercise.muscle_group].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader 
        title={workout?.name || 'Workout'} 
        rightAction={
          <div className="flex items-center gap-2 text-primary">
            <Timer className="h-4 w-4" />
            <span className="font-mono font-semibold">{formatTime(elapsedTime)}</span>
          </div>
        }
      />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {exercises.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No exercises yet. Add your first exercise to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          exercises.map((we) => (
            <Card key={we.id} className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{we.exercise.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{we.exercise.muscle_group}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeExercise(we.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
                  <div className="col-span-1">Set</div>
                  <div className="col-span-3 text-center">{unit}</div>
                  <div className="col-span-3 text-center">Reps</div>
                  <div className="col-span-2 text-center">RPE</div>
                  <div className="col-span-3"></div>
                </div>

                {/* Sets */}
                {we.sets.map((set) => (
                  <div 
                    key={set.id} 
                    className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg transition-colors ${
                      set.is_completed ? 'bg-success/10' : 'bg-muted/50'
                    }`}
                  >
                    <div className="col-span-1 text-sm font-medium">{set.set_number}</div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="0"
                        value={set.weight || ''}
                        onChange={(e) => updateSet(set.id, 'weight', e.target.value ? Number(e.target.value) : null)}
                        className="h-8 text-center text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="0"
                        value={set.reps || ''}
                        onChange={(e) => updateSet(set.id, 'reps', e.target.value ? Number(e.target.value) : null)}
                        className="h-8 text-center text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="-"
                        min="1"
                        max="10"
                        step="0.5"
                        value={set.rpe || ''}
                        onChange={(e) => updateSet(set.id, 'rpe', e.target.value ? Number(e.target.value) : null)}
                        className="h-8 text-center text-sm"
                      />
                    </div>
                    <div className="col-span-3 flex justify-end gap-1">
                      <Button
                        variant={set.is_completed ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleSetComplete(set.id, set.is_completed)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteSet(we.id, set.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => addSet(we.id, we.sets)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Set
                </Button>
              </CardContent>
            </Card>
          ))
        )}

        {/* Add Exercise Dialog */}
        <Dialog open={isExerciseDialogOpen} onOpenChange={setIsExerciseDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full" size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Add Exercise
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Add Exercise</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
            <div className="overflow-y-auto flex-1 space-y-4">
              {Object.entries(groupedExercises).map(([group, exs]) => (
                <div key={group}>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    {group}
                  </Label>
                  <div className="mt-2 space-y-1">
                    {exs.map(exercise => (
                      <Button
                        key={exercise.id}
                        variant="ghost"
                        className="w-full justify-start h-auto py-2"
                        onClick={() => addExercise(exercise)}
                      >
                        {exercise.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 glass-effect border-t border-border">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={cancelWorkout}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1 gradient-primary"
            onClick={finishWorkout}
          >
            Finish Workout
          </Button>
        </div>
      </div>
    </div>
  );
}
