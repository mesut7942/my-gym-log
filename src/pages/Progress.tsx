import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Trophy, Calendar, Flame } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, subDays, startOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ProgressData {
  weeklyVolume: { date: string; volume: number }[];
  monthlyWorkouts: { date: string; count: number }[];
  personalRecords: { exercise: string; weight: number; date: string }[];
  frequencyData: Date[];
}

export default function Progress() {
  const { user } = useAuth();
  const { formatWeight, unit } = useSettings();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProgressData();
    }
  }, [user]);

  const fetchProgressData = async () => {
    if (!user) return;

    try {
      // Fetch all completed workouts with their sets
      const { data: workouts } = await supabase
        .from('workouts')
        .select(`
          id,
          completed_at,
          workout_exercises(
            exercise:exercises(name),
            sets(weight, reps)
          )
        `)
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      // Calculate weekly volume (last 8 weeks)
      const weeklyVolume: { date: string; volume: number }[] = [];
      for (let i = 7; i >= 0; i--) {
        const weekStart = subDays(new Date(), i * 7);
        const weekEnd = subDays(new Date(), (i - 1) * 7);
        
        let weekVolume = 0;
        workouts?.forEach(workout => {
          const workoutDate = new Date(workout.completed_at!);
          if (workoutDate >= weekStart && workoutDate < weekEnd) {
            (workout.workout_exercises as any[])?.forEach(we => {
              (we.sets as any[])?.forEach(set => {
                weekVolume += (set.weight || 0) * (set.reps || 0);
              });
            });
          }
        });
        
        if (i < 7) { // Skip current incomplete week
          weeklyVolume.push({
            date: format(weekStart, 'MMM d'),
            volume: Math.round(weekVolume)
          });
        }
      }

      // Calculate monthly workout frequency
      const monthStart = startOfMonth(new Date());
      const today = new Date();
      const daysInRange = eachDayOfInterval({ start: monthStart, end: today });
      
      const monthlyWorkouts = daysInRange.map(day => {
        const count = workouts?.filter(w => 
          isSameDay(new Date(w.completed_at!), day)
        ).length || 0;
        return { date: format(day, 'd'), count };
      });

      // Extract personal records (max weight per exercise)
      const prMap = new Map<string, { weight: number; date: string }>();
      
      workouts?.forEach(workout => {
        (workout.workout_exercises as any[])?.forEach(we => {
          const exerciseName = we.exercise?.name;
          if (!exerciseName) return;
          
          (we.sets as any[])?.forEach(set => {
            const weight = set.weight || 0;
            const existing = prMap.get(exerciseName);
            
            if (!existing || weight > existing.weight) {
              prMap.set(exerciseName, {
                weight,
                date: workout.completed_at!
              });
            }
          });
        });
      });

      const personalRecords = Array.from(prMap.entries())
        .map(([exercise, data]) => ({ exercise, ...data }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 10);

      // Workout frequency (dates with workouts)
      const frequencyData = workouts?.map(w => new Date(w.completed_at!)) || [];

      setData({
        weeklyVolume,
        monthlyWorkouts,
        personalRecords,
        frequencyData
      });
    } catch (error) {
      console.error('Error fetching progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Progress" />
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  const totalVolume = data?.weeklyVolume.reduce((sum, w) => sum + w.volume, 0) || 0;
  const workoutsThisMonth = data?.monthlyWorkouts.reduce((sum, d) => sum + d.count, 0) || 0;

  return (
    <AppLayout>
      <PageHeader title="Progress Reports" subtitle="Track your strength journey" />

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Weekly Volume"
            value={`${(totalVolume / 1000).toFixed(0)}k`}
            subtitle={unit}
          />
          <StatCard
            icon={<Flame className="h-5 w-5" />}
            label="This Month"
            value={workoutsThisMonth}
            subtitle="workouts"
          />
        </div>

        <Tabs defaultValue="volume" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="volume">Volume</TabsTrigger>
            <TabsTrigger value="frequency">Frequency</TabsTrigger>
            <TabsTrigger value="prs">PRs</TabsTrigger>
          </TabsList>

          <TabsContent value="volume" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Weekly Training Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.weeklyVolume && data.weeklyVolume.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.weeklyVolume}>
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toLocaleString()} ${unit}`, 'Volume']}
                        />
                        <Bar 
                          dataKey="volume" 
                          fill="hsl(var(--primary))" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No data yet. Complete some workouts to see your volume!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="frequency" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Workouts This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.monthlyWorkouts && data.monthlyWorkouts.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.monthlyWorkouts}>
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip 
                          formatter={(value: number) => [value, 'Workouts']}
                          labelFormatter={(label) => `Day ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          stroke="hsl(var(--accent))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--accent))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Start working out to track your frequency!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prs" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  Personal Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.personalRecords && data.personalRecords.length > 0 ? (
                  <div className="space-y-3">
                    {data.personalRecords.map((pr, index) => (
                      <div 
                        key={pr.exercise}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold ${
                            index === 0 ? 'text-yellow-500' :
                            index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-amber-700' :
                            'text-muted-foreground'
                          }`}>
                            #{index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{pr.exercise}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(pr.date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-primary">
                          {formatWeight(pr.weight)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No PRs recorded yet. Keep lifting! 💪
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
