import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

type UnitPreference = 'kg' | 'lbs';

interface SettingsContextType {
  unit: UnitPreference;
  setUnit: (unit: UnitPreference) => void;
  convertWeight: (weight: number, toUnit?: UnitPreference) => number;
  formatWeight: (weight: number) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const KG_TO_LBS = 2.20462;

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<UnitPreference>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gym-unit') as UnitPreference;
      return saved || 'kg';
    }
    return 'kg';
  });

  useEffect(() => {
    localStorage.setItem('gym-unit', unit);
  }, [unit]);

  const setUnit = (newUnit: UnitPreference) => {
    setUnitState(newUnit);
  };

  const convertWeight = (weight: number, toUnit?: UnitPreference): number => {
    const targetUnit = toUnit || unit;
    if (targetUnit === 'lbs') {
      return Math.round(weight * KG_TO_LBS * 10) / 10;
    }
    return weight;
  };

  const formatWeight = (weight: number): string => {
    const converted = convertWeight(weight);
    return `${converted} ${unit}`;
  };

  return (
    <SettingsContext.Provider value={{ unit, setUnit, convertWeight, formatWeight }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
