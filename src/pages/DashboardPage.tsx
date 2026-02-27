import React from 'react';
import { motion } from 'motion/react';
import { DollarSign, TrendingUp, RefreshCw, Activity, UploadCloud } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import StatCard from '../components/ui/StatCard';
import FileUpload from '../components/ui/FileUpload';

const DashboardPage = () => {
  const { stockData } = useAppContext();
  const { 
    data, 
    isLoading, 
    selectedTicker, 
    handleTickerChange, 
    handleFileUpload, 
    tickers, 
    latestData, 
    priceChange 
  } = stockData;
  
  const [isDragging, setIsDragging] = React.useState(false);

  return (
    <div className="space-y-8">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-zinc-500 font-medium">Loading {selectedTicker} data...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Ticker Selector */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex bg-zinc-100/80 p-1.5 rounded-2xl border border-zinc-200/50 backdrop-blur-sm w-fit">
              {tickers.map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => handleTickerChange(ticker)}
                  disabled={isLoading}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                    selectedTicker === ticker
                      ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-zinc-200/50'
                      : 'text-zinc-500 hover:text-zinc-800'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {ticker}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-zinc-200/50 shadow-sm">
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              Real-time Feed Active
            </div>
          </div>

          {/* Stats Grid */}
          {latestData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard 
                title="Latest Close" 
                value={`$${latestData.Close.toFixed(2)}`}
                trend={priceChange}
                icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
                date={latestData.Date}
              />
              <StatCard 
                title="24h High" 
                value={`$${latestData.High.toFixed(2)}`}
                icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
              />
              <StatCard 
                title="24h Low" 
                value={`$${latestData.Low.toFixed(2)}`}
                icon={<TrendingUp className="w-5 h-5 text-rose-600 rotate-180" />}
              />
              <StatCard 
                title="Volume" 
                value={(latestData.Volume / 1000000).toFixed(2) + 'M'}
                icon={<Activity className="w-5 h-5 text-amber-600" />}
              />
            </div>
          )}

          {/* File Upload */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[2.5rem] shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] border border-zinc-200/50"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <UploadCloud className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Data Ingestion</h2>
                <p className="text-sm font-medium text-zinc-400">Upload new market data for analysis</p>
              </div>
            </div>
            
            <FileUpload 
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              handleFileUpload={handleFileUpload}
              isLoading={isLoading}
            />
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
