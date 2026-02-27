import React from 'react';
import { motion } from 'motion/react';
import { BarChart2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import CandlestickChart from '../components/charts/CandlestickChart';

const CandlestickPage = () => {
  const { stockData } = useAppContext();
  const { filteredData, selectedTicker, isLoading, tickers, handleTickerChange } = stockData;

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[2.5rem] shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] border border-zinc-200/50"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-indigo-600" />
              </div>
              Candlestick Analysis
            </h2>
            <p className="text-sm font-medium text-zinc-400 mt-1">Detailed OHLC price movement visualization for {selectedTicker || 'selected ticker'}</p>
          </div>
          
          {tickers.length > 0 && (
            <div className="flex bg-zinc-100/80 p-1.5 rounded-2xl border border-zinc-200/50 backdrop-blur-sm w-fit">
              {tickers.map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => handleTickerChange(ticker)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                    selectedTicker === ticker
                      ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-zinc-200/50'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {ticker}
                </button>
              ))}
            </div>
          )}
        </div>

        <CandlestickChart 
          data={filteredData}
          selectedTicker={selectedTicker}
          isLoading={isLoading}
        />
      </motion.div>
    </div>
  );
};

export default CandlestickPage;
