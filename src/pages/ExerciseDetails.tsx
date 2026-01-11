import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Dumbbell, Trophy, TrendingUp, Calendar, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  description: string | null;
  is_custom: boolean;
  user_id: string | null;
}

interface ExerciseHistory {
  date: string;
  maxWeight: number;
  totalVolume: number;
}

export default function ExerciseDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { formatWeight, unit } = useSettings();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<ExerciseHistory[]>([]);
  const [stats, setStats] = useState({ maxWeight: 0, totalSets: 0, timesPerformed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchExercise();
      if (user) fetchHistory();
    }
  }, [id, user]);

  const fetchExercise = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setExercise(data);
    } catch (error) {
      console.error('Error fetching exercise:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!user) return;

    try {
      const { data: workoutExercises, error } = await supabase
        .from('workout_exercises')
        .select(`
          id,
          workout:workouts(completed_at, user_id),
          sets(weight, reps)
        `)
        .eq('exercise_id', id);

      if (error) throw error;

      // Filter to only user's workouts and completed ones
      const userWorkouts = workoutExercises?.filter(we => {
        const workout = we.workout as any;
        return workout?.user_id === user.id && workout?.completed_at;
      }) || [];

      // Calculate stats
      let maxWeight = 0;
      let totalSets = 0;
      const historyMap = new Map<string, { maxWeight: number; totalVolume: number }>();

      userWorkouts.forEach(we => {
        const workout = we.workout as any;
        const dateKey = format(new Date(workout.completed_at), 'yyyy-MM-dd');
        const sets = we.sets as any[] || [];

        let dayMaxWeight = 0;
        let dayVolume = 0;

        sets.forEach(set => {
          const weight = set.weight || 0;
          const reps = set.reps || 0;
          
          if (weight > maxWeight) maxWeight = weight;
          if (weight > dayMaxWeight) dayMaxWeight = weight;
          dayVolume += weight * reps;
          totalSets++;
        });

        const existing = historyMap.get(dateKey) || { maxWeight: 0, totalVolume: 0 };
        historyMap.set(dateKey, {
          maxWeight: Math.max(existing.maxWeight, dayMaxWeight),
          totalVolume: existing.totalVolume + dayVolume
        });
      });

      setStats({
        maxWeight,
        totalSets,
        timesPerformed: userWorkouts.length
      });

      // Convert to array and sort by date
      const historyArray = Array.from(historyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-10); // Last 10 sessions

      setHistory(historyArray);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const deleteExercise = async () => {
    if (!exercise || !exercise.is_custom) return;

    if (!confirm('Are you sure you want to delete this exercise? This cannot be undone.')) {
      return;
    }

    try {
      await supabase.from('exercises').delete().eq('id', exercise.id);
      toast({
        title: 'Exercise deleted',
        description: `${exercise.name} has been removed.`,
      });
      navigate('/exercises');
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete exercise.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <AppLayout showNav={false}>
        <PageHeader title="Exercise" showBack />
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (!exercise) {
    return (
      <AppLayout showNav={false}>
        <PageHeader title="Exercise" showBack />
        <div className="max-w-lg mx-auto p-4 text-center py-12">
          <p className="text-muted-foreground">Exercise not found</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showNav={false}>
      <PageHeader 
        title={exercise.name} 
        showBack
        rightAction={
          exercise.is_custom && (
            <Button variant="ghost" size="icon" onClick={deleteExercise}>
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
          )
        }
      />

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Header Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{exercise.name}</h2>
                  {exercise.is_custom && (
                    <Badge variant="secondary">Custom</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{exercise.muscle_group}</p>
              </div>
            </div>
            {exercise.description && (
              <p className="text-sm text-muted-foreground mt-4">
                {exercise.description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        {user && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                icon={<Trophy className="h-4 w-4" />}
                label="PR"
                value={stats.maxWeight > 0 ? formatWeight(stats.maxWeight) : '-'}
              />
              <StatCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Total Sets"
                value={stats.totalSets}
              />
              <StatCard
                icon={<Calendar className="h-4 w-4" />}
                label="Sessions"
                value={stats.timesPerformed}
              />
            </div>

            {/* Progress Chart */}
            {history.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Weight Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history}>
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => format(new Date(value), 'MMM d')}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          domain={['dataMin - 5', 'dataMax + 5']}
                        />
                        <Tooltip 
                          labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                          formatter={(value: number) => [`${value} ${unit}`, 'Max Weight']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="maxWeight" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent History */}
            {history.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Sessions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {history.slice().reverse().slice(0, 5).map((session, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <span className="text-sm">
                        {format(new Date(session.date), 'MMM d, yyyy')}
                      </span>
                      <div className="text-sm text-right">
                        <span className="font-medium">{formatWeight(session.maxWeight)}</span>
                        <span className="text-muted-foreground ml-2">
                          Vol: {session.totalVolume.toLocaleString()} {unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {history.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No history yet. Start a workout to track this exercise!
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
