import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppProvider, useAppContext } from './context/AppContext';
import Header from './components/layout/Header';
import DashboardPage from './pages/DashboardPage';
import CandlestickPage from './pages/CandlestickPage';
import TemporalGraphPage from './pages/TemporalGraphPage';
import SetupPage from './pages/SetupPage';
import HomePage from './pages/HomePage';
import SemanticsExplanationPage from './pages/SemanticsExplanationPage';

const MainContent = () => {
  const { activeTab } = useAppContext();

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-zinc-900 font-sans p-4 sm:p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <Header />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {activeTab === 'home' && <HomePage />}
            {activeTab === 'dashboard' && <DashboardPage />}
            {activeTab === 'candlestick' && <CandlestickPage />}
            {activeTab === 'tkg' && <TemporalGraphPage />}
            {activeTab === 'semantics-info' && <SemanticsExplanationPage />}
            {activeTab === 'setup' && <SetupPage />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
