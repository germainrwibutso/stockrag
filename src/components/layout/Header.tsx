import React from 'react';
import { Activity, Loader2, CheckCircle, AlertCircle, Save, BarChart2, Network, Database, Home, BrainCircuit } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const Header = () => {
  const { activeTab, setActiveTab, stockData } = useAppContext();
  const { data, dataSource, isSaving, isLoading, saveStatus, handleSaveToSupabase } = stockData;

  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-zinc-200/50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Market <span className="text-indigo-600 italic font-serif">Intelligence</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[13px] font-medium text-zinc-400 uppercase tracking-widest">
            {data.length.toLocaleString()} Records
          </p>
          <div className="w-1 h-1 rounded-full bg-zinc-300" />
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
            dataSource === 'supabase' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
          }`}>
            {dataSource === 'supabase' ? 'Cloud Sync' : 'Local Cache'}
          </span>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-4 relative z-10">
        <nav className="flex bg-zinc-100/80 p-1.5 rounded-2xl border border-zinc-200/50 backdrop-blur-sm">
          {[
            { id: 'home', label: 'Home', icon: Home },
            { id: 'candlestick', label: 'Candlestick', icon: BarChart2 },
            { id: 'dashboard', label: 'Overview', icon: Activity },
            { id: 'tkg', label: 'Temporal Graph', icon: Network },
            { id: 'semantics-info', label: 'Semantics Info', icon: BrainCircuit },
            { id: 'setup', label: 'Infrastructure', icon: Database },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2.5 ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-zinc-200/50'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-white/50'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-zinc-400'}`} />
              {tab.label}
            </button>
          ))}
        </nav>
        
        {activeTab === 'dashboard' && dataSource === 'local' && (
          <button
            onClick={handleSaveToSupabase}
            disabled={isSaving || isLoading || data.length === 0}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${
              saveStatus === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
              saveStatus === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
              'bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl shadow-zinc-200 active:scale-95'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saveStatus === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : saveStatus === 'error' ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Syncing...' : saveStatus === 'success' ? 'Synced' : saveStatus === 'error' ? 'Error' : 'Push to Cloud'}
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
