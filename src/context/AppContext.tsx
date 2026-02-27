import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useStockData } from '../hooks/useStockData';
import { useTKG } from '../hooks/useTKG';

type AppContextType = {
  activeTab: 'home' | 'dashboard' | 'tkg' | 'setup' | 'candlestick' | 'semantics-info';
  setActiveTab: (tab: 'home' | 'dashboard' | 'tkg' | 'setup' | 'candlestick' | 'semantics-info') => void;
  stockData: ReturnType<typeof useStockData>;
  tkg: ReturnType<typeof useTKG>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'tkg' | 'setup' | 'candlestick' | 'semantics-info'>('home');
  const stockData = useStockData();
  const tkg = useTKG(activeTab);

  return (
    <AppContext.Provider value={{ activeTab, setActiveTab, stockData, tkg }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
