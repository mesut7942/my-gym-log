-- Create profiles table for user details and preferences
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT,
  avatar_url TEXT,
  unit_preference TEXT DEFAULT 'kg' CHECK (unit_preference IN ('kg', 'lbs')),
  theme_preference TEXT DEFAULT 'dark' CHECK (theme_preference IN ('dark', 'light')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create exercises table (pre-populated + custom)
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  description TEXT,
  is_custom BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create workout templates table
CREATE TABLE public.workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create template exercises (exercises within a template)
CREATE TABLE public.template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  target_sets INTEGER,
  target_reps INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create workouts table (workout sessions)
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create workout exercises (exercises within a workout)
CREATE TABLE public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create sets table (individual sets within workout exercises)
CREATE TABLE public.sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID REFERENCES public.workout_exercises(id) ON DELETE CASCADE NOT NULL,
  set_number INTEGER NOT NULL,
  weight DECIMAL(10,2),
  reps INTEGER,
  rpe DECIMAL(3,1) CHECK (rpe >= 1 AND rpe <= 10),
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Exercises policies (public can view default exercises, users can manage their custom ones)
CREATE POLICY "Anyone can view default exercises" ON public.exercises FOR SELECT USING (is_custom = false OR user_id IS NULL);
CREATE POLICY "Users can view their custom exercises" ON public.exercises FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert custom exercises" ON public.exercises FOR INSERT WITH CHECK (auth.uid() = user_id AND is_custom = true);
CREATE POLICY "Users can update their custom exercises" ON public.exercises FOR UPDATE USING (auth.uid() = user_id AND is_custom = true);
CREATE POLICY "Users can delete their custom exercises" ON public.exercises FOR DELETE USING (auth.uid() = user_id AND is_custom = true);

-- Workout templates policies
CREATE POLICY "Users can view their templates" ON public.workout_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert templates" ON public.workout_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their templates" ON public.workout_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their templates" ON public.workout_templates FOR DELETE USING (auth.uid() = user_id);

-- Template exercises policies
CREATE POLICY "Users can view their template exercises" ON public.template_exercises FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.workout_templates WHERE id = template_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert template exercises" ON public.template_exercises FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_templates WHERE id = template_id AND user_id = auth.uid()));
CREATE POLICY "Users can update their template exercises" ON public.template_exercises FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.workout_templates WHERE id = template_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete their template exercises" ON public.template_exercises FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.workout_templates WHERE id = template_id AND user_id = auth.uid()));

-- Workouts policies
CREATE POLICY "Users can view their workouts" ON public.workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert workouts" ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their workouts" ON public.workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their workouts" ON public.workouts FOR DELETE USING (auth.uid() = user_id);

-- Workout exercises policies
CREATE POLICY "Users can view their workout exercises" ON public.workout_exercises FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert workout exercises" ON public.workout_exercises FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_id AND user_id = auth.uid()));
CREATE POLICY "Users can update their workout exercises" ON public.workout_exercises FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete their workout exercises" ON public.workout_exercises FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_id AND user_id = auth.uid()));

-- Sets policies
CREATE POLICY "Users can view their sets" ON public.sets FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.workout_exercises we 
    JOIN public.workouts w ON we.workout_id = w.id 
    WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert sets" ON public.sets FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_exercises we 
    JOIN public.workouts w ON we.workout_id = w.id 
    WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
  ));
CREATE POLICY "Users can update their sets" ON public.sets FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.workout_exercises we 
    JOIN public.workouts w ON we.workout_id = w.id 
    WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete their sets" ON public.sets FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.workout_exercises we 
    JOIN public.workouts w ON we.workout_id = w.id 
    WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
  ));

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (new.id, new.raw_user_meta_data ->> 'username');
  RETURN new;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_templates_updated_at
  BEFORE UPDATE ON public.workout_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default exercises
INSERT INTO public.exercises (name, muscle_group, description, is_custom, user_id) VALUES
-- Chest
('Bench Press', 'Chest', 'Classic barbell bench press targeting chest, shoulders, and triceps', false, NULL),
('Incline Bench Press', 'Chest', 'Upper chest focused pressing movement', false, NULL),
('Dumbbell Fly', 'Chest', 'Isolation movement for chest stretch and contraction', false, NULL),
('Push-ups', 'Chest', 'Bodyweight chest and tricep exercise', false, NULL),
('Cable Crossover', 'Chest', 'Cable isolation for inner chest definition', false, NULL),
('Decline Bench Press', 'Chest', 'Lower chest focused pressing movement', false, NULL),
-- Back
('Deadlift', 'Back', 'Full body posterior chain movement', false, NULL),
('Barbell Row', 'Back', 'Horizontal pulling for back thickness', false, NULL),
('Pull-ups', 'Back', 'Bodyweight vertical pulling movement', false, NULL),
('Lat Pulldown', 'Back', 'Machine-based vertical pull for lat development', false, NULL),
('Seated Cable Row', 'Back', 'Cable horizontal pull for mid-back', false, NULL),
('T-Bar Row', 'Back', 'Heavy rowing variation for back thickness', false, NULL),
('Face Pulls', 'Back', 'Rear delt and upper back health exercise', false, NULL),
-- Legs
('Squat', 'Legs', 'King of leg exercises - full lower body compound', false, NULL),
('Leg Press', 'Legs', 'Machine quad-dominant pressing movement', false, NULL),
('Romanian Deadlift', 'Legs', 'Hamstring and glute focused hinge pattern', false, NULL),
('Leg Curl', 'Legs', 'Hamstring isolation movement', false, NULL),
('Leg Extension', 'Legs', 'Quad isolation movement', false, NULL),
('Calf Raises', 'Legs', 'Standing or seated calf development', false, NULL),
('Bulgarian Split Squat', 'Legs', 'Unilateral leg strength and balance', false, NULL),
('Hip Thrust', 'Legs', 'Glute-focused hip extension', false, NULL),
('Lunges', 'Legs', 'Walking or stationary unilateral leg work', false, NULL),
-- Shoulders
('Overhead Press', 'Shoulders', 'Standing or seated vertical pressing', false, NULL),
('Lateral Raise', 'Shoulders', 'Side delt isolation for shoulder width', false, NULL),
('Front Raise', 'Shoulders', 'Front delt isolation movement', false, NULL),
('Rear Delt Fly', 'Shoulders', 'Posterior deltoid isolation', false, NULL),
('Arnold Press', 'Shoulders', 'Rotational dumbbell press variation', false, NULL),
('Shrugs', 'Shoulders', 'Trap development exercise', false, NULL),
-- Arms
('Barbell Curl', 'Arms', 'Classic bicep mass builder', false, NULL),
('Hammer Curl', 'Arms', 'Brachialis and forearm focused curl', false, NULL),
('Tricep Pushdown', 'Arms', 'Cable tricep isolation', false, NULL),
('Skull Crushers', 'Arms', 'Lying tricep extension', false, NULL),
('Preacher Curl', 'Arms', 'Isolated bicep curl with arm support', false, NULL),
('Tricep Dips', 'Arms', 'Bodyweight tricep compound movement', false, NULL),
('Concentration Curl', 'Arms', 'Single arm focused bicep isolation', false, NULL),
('Close-Grip Bench Press', 'Arms', 'Compound tricep builder', false, NULL),
-- Core
('Plank', 'Core', 'Isometric core stability exercise', false, NULL),
('Crunches', 'Core', 'Basic abdominal flexion exercise', false, NULL),
('Hanging Leg Raise', 'Core', 'Advanced lower ab exercise', false, NULL),
('Russian Twist', 'Core', 'Rotational core exercise', false, NULL),
('Ab Wheel Rollout', 'Core', 'Anti-extension core exercise', false, NULL),
('Cable Woodchop', 'Core', 'Rotational power and core stability', false, NULL),
('Dead Bug', 'Core', 'Core stability and coordination', false, NULL),
('Mountain Climbers', 'Core', 'Dynamic core and cardio exercise', false, NULL);