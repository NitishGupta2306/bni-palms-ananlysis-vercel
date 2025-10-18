import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationStats {
  totalMembers?: number;
  biggestChapter?: { chapterName: string; memberCount: number };
}

interface NavigationContextType {
  stats: NavigationStats;
  setStats: (stats: NavigationStats) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<NavigationStats>({});

  return (
    <NavigationContext.Provider value={{ stats, setStats }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigationStats = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigationStats must be used within a NavigationProvider');
  }
  return context;
};
