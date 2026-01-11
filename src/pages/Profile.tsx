import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Dumbbell, Calendar, Weight, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format, differenceInDays } from 'date-fns';

interface ProfileStats {
  totalWorkouts: number;
  totalWeightLifted: number;
  memberSince: string;
  exercisesUsed: number;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const { formatWeight } = useSettings();
  const navigate = useNavigate();

  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfileStats();
    }
  }, [user]);

  const fetchProfileStats = async () => {
    if (!user) return;

    try {
      // Fetch workouts with their sets
      const { data: workouts } = await supabase
        .from('workouts')
        .select(`
          id,
          completed_at,
          workout_exercises(
            sets(weight, reps)
          )
        `)
        .eq('user_id', user.id)
        .not('completed_at', 'is', null);

      let totalWeight = 0;
      const exerciseIds = new Set<string>();

      workouts?.forEach(workout => {
        (workout.workout_exercises as any[])?.forEach(we => {
          (we.sets as any[])?.forEach(set => {
            totalWeight += (set.weight || 0) * (set.reps || 0);
          });
        });
      });

      // Get unique exercises used
      const { data: workoutExercises } = await supabase
        .from('workout_exercises')
        .select('exercise_id, workout:workouts(user_id)')
        .eq('workout.user_id', user.id);

      workoutExercises?.forEach(we => exerciseIds.add(we.exercise_id));

      const memberSince = user.created_at 
        ? format(new Date(user.created_at), 'MMM yyyy')
        : 'Unknown';

      setStats({
        totalWorkouts: workouts?.length || 0,
        totalWeightLifted: totalWeight,
        memberSince,
        exercisesUsed: exerciseIds.size
      });
    } catch (error) {
      console.error('Error fetching profile stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = () => {
    const username = user?.user_metadata?.username;
    const email = user?.email;
    if (username) return username.slice(0, 2).toUpperCase();
    if (email) return email.slice(0, 2).toUpperCase();
    return 'U';
  };

  const getMemberDays = () => {
    if (!user?.created_at) return 0;
    return differenceInDays(new Date(), new Date(user.created_at));
  };

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Profile" />
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader 
        title="Profile" 
        rightAction={
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <Settings className="h-5 w-5" />
          </Button>
        }
      />

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6 text-center">
            <Avatar className="h-20 w-20 mx-auto mb-4 bg-primary/10">
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-accent text-primary-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold mb-1">
              {user?.user_metadata?.username || 'Athlete'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {user?.email}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Member for {getMemberDays()} days
            </p>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={<Dumbbell className="h-5 w-5" />}
            label="Total Workouts"
            value={stats?.totalWorkouts || 0}
          />
          <StatCard
            icon={<Weight className="h-5 w-5" />}
            label="Weight Lifted"
            value={stats?.totalWeightLifted 
              ? `${(stats.totalWeightLifted / 1000).toFixed(1)}k`
              : '0'}
            subtitle="All time"
          />
          <StatCard
            icon={<Calendar className="h-5 w-5" />}
            label="Member Since"
            value={stats?.memberSince || '-'}
          />
          <StatCard
            icon={<User className="h-5 w-5" />}
            label="Exercises Used"
            value={stats?.exercisesUsed || 0}
          />
        </div>

        {/* Actions */}
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => navigate('/settings')}
            >
              <Settings className="h-4 w-4 mr-3" />
              Settings
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
