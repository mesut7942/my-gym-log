import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Dumbbell, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  description: string | null;
  is_custom: boolean;
}

const muscleGroups = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

export default function Exercises() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // New exercise form
  const [newName, setNewName] = useState('');
  const [newMuscleGroup, setNewMuscleGroup] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('muscle_group')
        .order('name');

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const createExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim() || !newMuscleGroup) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          name: newName.trim(),
          muscle_group: newMuscleGroup,
          description: newDescription.trim() || null,
          is_custom: true,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setExercises([...exercises, data]);
      setIsCreateDialogOpen(false);
      setNewName('');
      setNewMuscleGroup('');
      setNewDescription('');

      toast({
        title: 'Exercise created!',
        description: `${data.name} has been added to your library.`,
      });
    } catch (error) {
      console.error('Error creating exercise:', error);
      toast({
        title: 'Error',
        description: 'Failed to create exercise. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = !selectedGroup || exercise.muscle_group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const groupedExercises = filteredExercises.reduce((acc, exercise) => {
    if (!acc[exercise.muscle_group]) {
      acc[exercise.muscle_group] = [];
    }
    acc[exercise.muscle_group].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Exercises" />
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader 
        title="Exercise Library" 
        subtitle={`${exercises.length} exercises`}
        rightAction={
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Custom Exercise</DialogTitle>
              </DialogHeader>
              <form onSubmit={createExercise} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Exercise Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Goblet Squat"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="muscleGroup">Muscle Group</Label>
                  <Select value={newMuscleGroup} onValueChange={setNewMuscleGroup} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select muscle group" />
                    </SelectTrigger>
                    <SelectContent>
                      {muscleGroups.map(group => (
                        <SelectItem key={group} value={group}>{group}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the exercise..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full gradient-primary"
                  disabled={!newName.trim() || !newMuscleGroup || creating}
                >
                  {creating ? 'Creating...' : 'Create Exercise'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Muscle Group Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <Button
            variant={selectedGroup === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedGroup(null)}
          >
            All
          </Button>
          {muscleGroups.map(group => (
            <Button
              key={group}
              variant={selectedGroup === group ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedGroup(group)}
            >
              {group}
            </Button>
          ))}
        </div>

        {/* Exercise List */}
        <div className="space-y-6">
          {Object.entries(groupedExercises).map(([group, exs]) => (
            <div key={group}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                {group} ({exs.length})
              </h3>
              <div className="space-y-2">
                {exs.map(exercise => (
                  <Card 
                    key={exercise.id} 
                    className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/exercises/${exercise.id}`)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Dumbbell className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{exercise.name}</p>
                          {exercise.is_custom && (
                            <Badge variant="secondary" className="text-xs mt-1">Custom</Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredExercises.length === 0 && (
          <div className="text-center py-12">
            <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No exercises found</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
