import React from 'react';
import { motion } from 'motion/react';
import { Network, RefreshCw, Loader2, CheckCircle, AlertCircle, Search, Code, Bot, Calendar } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import TKG3DChart from '../components/charts/TKG3DChart';
import TKGChat from '../components/chat/TKGChat';
import SemanticsTable from '../components/ui/SemanticsTable';

const TemporalGraphPage = () => {
  const { tkg } = useAppContext();
  const {
    tkgData,
    tkgTicker,
    setTkgTicker,
    tkgLoading,
    isGeneratingTkg,
    tkgGenerateStatus,
    semanticsData,
    activeSemanticCategory,
    setActiveSemanticCategory,
    isGeneratingSemantics,
    selectedObs,
    setSelectedObs,
    playbackIndex,
    setPlaybackIndex,
    isPlaying,
    setIsPlaying,
    semanticSearch,
    setSemanticSearch,
    searchResults,
    latestObservations,
    showNodes,
    setShowNodes,
    showEdges,
    setShowEdges,
    showSurface,
    setShowSurface,
    showCandles,
    setShowCandles,
    handleGenerateTkg,
    handleGenerateSemantics,
    startDate,
    setStartDate,
    endDate,
    setEndDate
  } = tkg;

  const semanticCategories = [
    { id: 'general', label: 'General', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    { id: 'r_open', label: 'r_open', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { id: 'r_high', label: 'r_high', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { id: 'r_low', label: 'r_low', color: 'bg-amber-50 text-amber-600 border-amber-200' },
    { id: 'ret_close', label: 'ret_close', color: 'bg-rose-50 text-rose-600 border-rose-200' },
  ];

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
                <Network className="w-5 h-5 text-indigo-600" />
              </div>
              Temporal Knowledge Graph
            </h2>
            <p className="text-sm font-medium text-zinc-400 mt-1">
              Sequential observation chain analysis for market state transitions.
            </p>
          </div>
          <button
            onClick={handleGenerateTkg}
            disabled={isGeneratingTkg || tkgLoading}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${
              tkgGenerateStatus === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
              tkgGenerateStatus === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
              'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isGeneratingTkg ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : tkgGenerateStatus === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : tkgGenerateStatus === 'error' ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isGeneratingTkg ? 'Computing...' : tkgGenerateStatus === 'success' ? 'Ready' : tkgGenerateStatus === 'error' ? 'Error' : 'Rebuild Graph'}
          </button>
        </div>
        
        <div className="relative min-h-[600px]">
          {tkgLoading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-[2rem]">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
              <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Synchronizing Nodes...</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* TKG Visualization and Details */}
            <div className="lg:col-span-2 space-y-8">
              <div className="w-full">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Semantic Filters</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {semanticCategories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setActiveSemanticCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                              activeSemanticCategory === cat.id
                                ? `${cat.color} shadow-sm ring-2 ring-offset-1 ring-current/20`
                                : 'bg-white text-zinc-400 border-zinc-200 hover:border-zinc-300'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="relative w-full max-w-xs">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <Search className="w-4 h-4 text-zinc-400" />
                        </div>
                        <input
                          type="text"
                          placeholder={`Search ${activeSemanticCategory} semantics...`}
                          value={semanticSearch}
                          onChange={(e) => setSemanticSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200/50 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                        />
                      </div>
                      
                      {/* Date Range Picker */}
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Calendar className="w-4 h-4 text-zinc-400" />
                          </div>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="pl-10 pr-3 py-2 bg-white border border-zinc-200/50 rounded-xl text-xs font-medium text-zinc-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm w-32"
                          />
                        </div>
                        <span className="text-zinc-300 font-medium">-</span>
                        <div className="relative">
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 bg-white border border-zinc-200/50 rounded-xl text-xs font-medium text-zinc-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm w-32"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest hidden xl:block">AI Tools</span>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {semanticCategories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => handleGenerateSemantics(cat.id)}
                            disabled={isGeneratingSemantics || tkgData.length < 2}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all duration-300 border ${
                              isGeneratingSemantics ? 'opacity-50 cursor-not-allowed' : ''
                            } ${
                              cat.id === 'r_high' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' :
                              cat.id === 'r_open' ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' :
                              cat.id === 'r_low' ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100' :
                              cat.id === 'ret_close' ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' :
                              'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                            } shadow-sm`}
                          >
                            {isGeneratingSemantics ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Code className="w-3 h-3" />
                            )}
                            {cat.label} semantic generation
                          </button>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-end gap-3">
                        {isGeneratingSemantics && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg animate-pulse">
                            <Bot className="w-3 h-3 text-indigo-600" />
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">AI Processing</span>
                          </div>
                        )}

                        {tkgData.length > 1 && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200/50 rounded-lg">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                              {activeSemanticCategory} Coverage
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-indigo-600">
                                {tkgData.filter((d, i) => i > 0 && semanticsData[d.id]?.[activeSemanticCategory]).length}
                              </span>
                              <span className="text-xs font-medium text-zinc-400">/</span>
                              <span className="text-xs font-bold text-zinc-700">{Math.max(0, tkgData.length - 1)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-zinc-200/50 shadow-sm">
                    {[
                      { id: 'nodes', label: 'Nodes', active: showNodes, toggle: () => setShowNodes(!showNodes) },
                      { id: 'edges', label: 'Edges', active: showEdges, toggle: () => setShowEdges(!showEdges) },
                      { id: 'surface', label: 'Surface', active: showSurface, toggle: () => setShowSurface(!showSurface) },
                      { id: 'candles', label: 'Candles', active: showCandles, toggle: () => setShowCandles(!showCandles) },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={btn.toggle}
                        className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                          btn.active ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {latestObservations.length > 0 && (
                    <div className="flex bg-white p-1 rounded-xl border border-zinc-200/50 shadow-sm">
                      {latestObservations.map((obs) => (
                        <button
                          key={obs.ticker}
                          onClick={() => {
                            setTkgTicker(obs.ticker);
                          }}
                          className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                            tkgTicker === obs.ticker
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'text-zinc-400 hover:text-zinc-600'
                          }`}
                        >
                          {obs.ticker}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Full-width Slider Row */}
              <div className="w-full bg-white p-4 rounded-2xl border border-zinc-200/50 shadow-sm flex items-center gap-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0"
                >
                  {isPlaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="w-5 h-5 border-l-[10px] border-l-current border-y-[6px] border-y-transparent ml-1" />}
                </button>
                
                <div className="flex-1 flex items-center gap-4">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest w-24 text-right shrink-0">
                    {tkgData.length > 0 ? tkgData[0]?.date : '---'}
                  </span>
                  
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="range"
                      min="0"
                      max={Math.max(0, tkgData.length - 30)}
                      value={playbackIndex}
                      onChange={(e) => {
                        setPlaybackIndex(Number(e.target.value));
                        setIsPlaying(false);
                      }}
                      className="w-full h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest w-24 shrink-0">
                    {tkgData.length > 0 ? tkgData[tkgData.length - 1]?.date : '---'}
                  </span>
                </div>
                
                <div className="px-4 py-1.5 bg-indigo-50 rounded-lg shrink-0">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                    Viewing: {tkgData.length > 0 ? tkgData[playbackIndex]?.date : '---'}
                  </span>
                </div>
              </div>
              
              <TKG3DChart 
                tkgData={tkgData}
                playbackIndex={playbackIndex}
                searchResults={searchResults}
                semanticsData={semanticsData}
                selectedObs={selectedObs}
                setSelectedObs={setSelectedObs}
                showNodes={showNodes}
                showEdges={showEdges}
                showSurface={showSurface}
                showCandles={showCandles}
                tkgTicker={tkgTicker}
                activeSemanticCategory={activeSemanticCategory}
              />
              
              {/* Graph Legend */}
              <div className="bg-white rounded-2xl p-6 border border-zinc-200/50 shadow-sm">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Graph Legend</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mt-0.5 shrink-0 shadow-sm shadow-blue-500/20"></div>
                    <div>
                      <span className="block text-xs font-bold text-zinc-900">r_open</span>
                      <span className="text-[11px] text-zinc-500 leading-tight block mt-0.5">Normalized Open/Close ratio</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 mt-0.5 shrink-0 shadow-sm shadow-emerald-500/20"></div>
                    <div>
                      <span className="block text-xs font-bold text-zinc-900">r_high</span>
                      <span className="text-[11px] text-zinc-500 leading-tight block mt-0.5">Normalized High/Close ratio</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-amber-500 mt-0.5 shrink-0 shadow-sm shadow-amber-500/20"></div>
                    <div>
                      <span className="block text-xs font-bold text-zinc-900">r_low</span>
                      <span className="text-[11px] text-zinc-500 leading-tight block mt-0.5">Normalized Low/Close ratio</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-rose-500 mt-0.5 shrink-0 shadow-sm shadow-rose-500/20"></div>
                    <div>
                      <span className="block text-xs font-bold text-zinc-900">ret_close</span>
                      <span className="text-[11px] text-zinc-500 leading-tight block mt-0.5">Daily Close Return</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="block text-xs font-bold text-zinc-900 mb-1">X-Axis (Horizontal)</span>
                    <span className="text-[11px] text-zinc-500 leading-tight">Temporal progression (Days). Moves left to right.</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-zinc-900 mb-1">Y-Axis (Depth)</span>
                    <span className="text-[11px] text-zinc-500 leading-tight">Spread between r_open and r_low.</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-zinc-900 mb-1">Z-Axis (Vertical)</span>
                    <span className="text-[11px] text-zinc-500 leading-tight">Spread between r_high and ret_close.</span>
                  </div>
                </div>
              </div>

              {/* Semantic Table */}
              {Object.keys(semanticsData).length > 0 && (
                <SemanticsTable 
                  tkgData={tkgData}
                  semanticsData={semanticsData}
                  activeCategory={activeSemanticCategory}
                  onRowClick={(dataIndex) => {
                    let newPlaybackIndex = Math.max(0, dataIndex - 15);
                    newPlaybackIndex = Math.min(newPlaybackIndex, Math.max(0, tkgData.length - 30));
                    setPlaybackIndex(newPlaybackIndex);
                    setSelectedObs(tkgData[dataIndex]);
                  }}
                />
              )}

            </div>

            <div className="w-full">
              {/* Selected Observation Details */}
              {selectedObs && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200/50 mb-8"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">State Details</h3>
                    <button 
                      onClick={() => setSelectedObs(null)}
                      className="text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      <AlertCircle className="w-5 h-5 rotate-45" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-500">Date</span>
                      <span className="text-lg font-bold text-zinc-900">{selectedObs.date}</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-500">Open / Close</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-zinc-900">${selectedObs.open.toFixed(2)}</span>
                        <span className="text-zinc-400">→</span>
                        <span className="text-lg font-bold text-zinc-900">${selectedObs.close.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-500">High / Low</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-emerald-600">${selectedObs.high.toFixed(2)}</span>
                        <span className="text-zinc-400">/</span>
                        <span className="text-lg font-bold text-rose-600">${selectedObs.low.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-500">Volume</span>
                      <span className="text-lg font-bold text-zinc-900">{(selectedObs.volume / 1000000).toFixed(2)}M</span>
                    </div>
                  </div>

                  {semanticsData[selectedObs.id]?.[activeSemanticCategory] && (
                    <div className="mt-6 bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl">
                      <span className="block text-xs font-bold text-indigo-600 uppercase mb-2">AI Insight ({activeSemanticCategory})</span>
                      <span className="text-sm font-medium text-indigo-900 leading-relaxed">{semanticsData[selectedObs.id][activeSemanticCategory]}</span>
                    </div>
                  )}
                </motion.div>
              )}
              
              {/* Chat Section */}
              <TKGChat 
                tkgTicker={tkgTicker}
                tkgData={tkgData}
                playbackIndex={playbackIndex}
                semanticsData={semanticsData}
                activeCategory={activeSemanticCategory}
                setPlaybackIndex={setPlaybackIndex}
                setSelectedObs={setSelectedObs}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TemporalGraphPage;
