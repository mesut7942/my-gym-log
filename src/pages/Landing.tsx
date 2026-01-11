import { Link } from 'react-router-dom';
import { Dumbbell, BarChart3, History, Zap, Target, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Dumbbell,
    title: 'Track Workouts',
    description: 'Log every set, rep, and weight with ease'
  },
  {
    icon: BarChart3,
    title: 'See Progress',
    description: 'Visualize your strength gains over time'
  },
  {
    icon: History,
    title: 'Workout History',
    description: 'Review past sessions and stay consistent'
  },
  {
    icon: Target,
    title: 'Set Goals',
    description: 'Track personal records and hit new PRs'
  },
  {
    icon: Zap,
    title: 'Quick Logging',
    description: 'Fast, intuitive interface for gym use'
  },
  {
    icon: Trophy,
    title: 'Achievements',
    description: 'Celebrate milestones and stay motivated'
  }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        <div className="relative max-w-lg mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center justify-center p-3 mb-6 rounded-2xl bg-primary/10 glow-primary">
            <Dumbbell className="h-10 w-10 text-primary" />
          </div>
          
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Your Ultimate{' '}
            <span className="text-gradient">Gym Tracker</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
            Track workouts, crush PRs, and visualize your fitness journey with our powerful, mobile-first workout tracker.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gradient-primary text-primary-foreground">
              <Link to="/auth">Get Started Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/auth?mode=login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-lg mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-center mb-8">
          Everything You Need
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border/50 hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="p-2 w-fit rounded-lg bg-primary/10 mb-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-lg mx-auto px-6 py-12">
        <Card className="gradient-card border-primary/20">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Ready to Get Stronger?</h2>
            <p className="text-muted-foreground mb-4">
              Join thousands of lifters tracking their gains
            </p>
            <Button asChild size="lg" className="w-full gradient-primary">
              <Link to="/auth">Start Tracking Now</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="max-w-lg mx-auto px-6 py-8 text-center border-t border-border">
        <p className="text-sm text-muted-foreground">
          © 2025 Gym Workout Tracker. Built with 💪
        </p>
      </footer>
    </div>
  );
}
