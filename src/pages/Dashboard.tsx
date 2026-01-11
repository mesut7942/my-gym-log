import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Flame, Dumbbell, Trophy, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { format, differenceInDays, startOfWeek, addDays, isToday } from 'date-fns';

interface DashboardStats {
  totalWorkouts: number;
  currentStreak: number;
  lastWorkout: { name: string; date: string } | null;
  weeklyWorkouts: boolean[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    if (!user) return;

    try {
      // Fetch all completed workouts
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id, name, completed_at')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      const totalWorkouts = workouts?.length || 0;
      
      // Calculate streak
      let currentStreak = 0;
      if (workouts && workouts.length > 0) {
        const today = new Date();
        let checkDate = today;
        
        for (const workout of workouts) {
          const workoutDate = new Date(workout.completed_at!);
          const daysDiff = differenceInDays(checkDate, workoutDate);
          
          if (daysDiff <= 1) {
            currentStreak++;
            checkDate = workoutDate;
          } else {
            break;
          }
        }
      }

      // Get last workout
      const lastWorkout = workouts && workouts.length > 0 
        ? { 
            name: workouts[0].name, 
            date: format(new Date(workouts[0].completed_at!), 'MMM d') 
          } 
        : null;

      // Weekly activity (current week)
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weeklyWorkouts = Array(7).fill(false);
      
      if (workouts) {
        workouts.forEach(workout => {
          const workoutDate = new Date(workout.completed_at!);
          for (let i = 0; i < 7; i++) {
            const dayToCheck = addDays(weekStart, i);
            if (format(workoutDate, 'yyyy-MM-dd') === format(dayToCheck, 'yyyy-MM-dd')) {
              weeklyWorkouts[i] = true;
            }
          }
        });
      }

      setStats({
        totalWorkouts,
        currentStreak,
        lastWorkout,
        weeklyWorkouts
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <AppLayout>
      <PageHeader 
        title={`Hey${user?.user_metadata?.username ? `, ${user.user_metadata.username}` : ''}! 👋`}
        subtitle="Ready to crush it today?"
      />

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Quick Start Button */}
        <Button 
          onClick={() => navigate('/workout/new')} 
          size="lg" 
          className="w-full h-14 gradient-primary text-lg font-semibold glow-primary"
        >
          <Plus className="mr-2 h-5 w-5" />
          Start New Workout
        </Button>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={<Dumbbell className="h-5 w-5" />}
            label="Total Workouts"
            value={stats?.totalWorkouts || 0}
            subtitle="All time"
          />
          <StatCard
            icon={<Flame className="h-5 w-5" />}
            label="Current Streak"
            value={`${stats?.currentStreak || 0} days`}
            subtitle="Keep it up!"
          />
        </div>

        {/* Weekly Activity */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">This Week</span>
            </div>
            <div className="flex justify-between">
              {weekDays.map((day, index) => {
                const dayDate = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), index);
                const isCurrentDay = isToday(dayDate);
                
                return (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <span className="text-xs text-muted-foreground">{day}</span>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        stats?.weeklyWorkouts[index]
                          ? 'bg-primary text-primary-foreground'
                          : isCurrentDay
                          ? 'border-2 border-primary bg-primary/10'
                          : 'bg-muted'
                      }`}
                    >
                      {stats?.weeklyWorkouts[index] && (
                        <Dumbbell className="h-3 w-3" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Last Workout */}
        {stats?.lastWorkout && (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Last Workout</p>
                  <p className="font-semibold">{stats.lastWorkout.name}</p>
                  <p className="text-sm text-muted-foreground">{stats.lastWorkout.date}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/history">View All</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/templates')}>
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Trophy className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm font-medium">Templates</span>
            </CardContent>
          </Card>
          <Card className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/exercises')}>
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Dumbbell className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm font-medium">Exercises</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
