import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, ChevronRight, Dumbbell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

interface Workout {
  id: string;
  name: string;
  completed_at: string | null;
  duration_seconds: number | null;
  exercise_count: number;
}

export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWorkouts();
    }
  }, [user]);

  const fetchWorkouts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          name,
          completed_at,
          duration_seconds,
          workout_exercises(count)
        `)
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const formattedWorkouts = data?.map(workout => ({
        id: workout.id,
        name: workout.name,
        completed_at: workout.completed_at,
        duration_seconds: workout.duration_seconds,
        exercise_count: (workout.workout_exercises as any)?.[0]?.count || 0
      })) || [];

      setWorkouts(formattedWorkouts);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Workout History" />
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Workout History" subtitle={`${workouts.length} workouts logged`} />

      <div className="max-w-lg mx-auto p-4">
        {workouts.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-8 w-8 text-muted-foreground" />}
            title="No workouts yet"
            description="Start your first workout session to see your history here."
            action={{
              label: 'Start Workout',
              onClick: () => navigate('/workout/new')
            }}
          />
        ) : (
          <div className="space-y-3">
            {workouts.map((workout) => (
              <Card 
                key={workout.id} 
                className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/workout/${workout.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{workout.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {workout.completed_at 
                            ? format(new Date(workout.completed_at), 'MMM d, yyyy')
                            : '-'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(workout.duration_seconds)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Dumbbell className="h-3 w-3" />
                          {workout.exercise_count} exercises
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
