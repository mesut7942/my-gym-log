import { Moon, Sun, Scale, ChevronRight } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useSettings } from '@/hooks/useSettings';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { unit, setUnit } = useSettings();

  return (
    <AppLayout showNav={false}>
      <PageHeader title="Settings" showBack />

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle between dark and light theme
                </p>
              </div>
              <Switch
                id="dark-mode"
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        {/* Units */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Weight Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={unit} onValueChange={(value) => setUnit(value as 'kg' | 'lbs')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="kg" id="kg" />
                <Label htmlFor="kg" className="flex-1 cursor-pointer">
                  Kilograms (kg)
                </Label>
              </div>
              <div className="flex items-center space-x-2 mt-3">
                <RadioGroupItem value="lbs" id="lbs" />
                <Label htmlFor="lbs" className="flex-1 cursor-pointer">
                  Pounds (lbs)
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Gym Workout Tracker</p>
              <p>Version 1.0.0</p>
              <p className="mt-4">Built with 💪 for lifters</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
