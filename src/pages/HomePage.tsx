import React from 'react';
import { motion } from 'motion/react';
import { Network, ArrowRight, Activity, BrainCircuit, TrendingUp, Zap, ShieldAlert, BarChart3, Globe, Cpu } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const HomePage = () => {
  const { setActiveTab } = useAppContext();

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white rounded-[2.5rem] p-12 overflow-hidden shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] border border-zinc-200/50"
      >
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-50/50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50/50 rounded-full -ml-32 -mb-32 blur-3xl opacity-50 pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Next Gen Market Analysis</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 mb-6 leading-tight">
            Temporal <span className="text-indigo-600 italic font-serif">Knowledge</span> Graph
          </h1>
          
          <p className="text-xl text-zinc-500 mb-10 leading-relaxed max-w-2xl">
            Unlock the hidden structure of market data. Transform sequential observations into a navigable 3D state space to identify regimes, anomalies, and predictive patterns.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setActiveTab('tkg')}
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3 group"
            >
              Launch TKG Engine
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-8 py-4 bg-white text-zinc-700 border border-zinc-200 rounded-2xl font-bold text-lg hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-300"
            >
              View Dashboard
            </button>
          </div>
        </div>

        {/* Abstract Visual Representation */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] opacity-10 pointer-events-none hidden lg:block">
           <Network className="w-full h-full text-indigo-600" />
        </div>
      </motion.div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: Network,
            title: "State Space Topology",
            desc: "Visualize market dynamics as a continuous trajectory in 3D space. Identify recurring loops and structural breaks."
          },
          {
            icon: BrainCircuit,
            title: "Semantic Enrichment",
            desc: "AI-powered analysis labels each state transition with semantic context, explaining 'why' the market moved."
          },
          {
            icon: Activity,
            title: "Anomaly Detection",
            desc: "Automatically highlight deviations from expected trajectories to spot potential risks or opportunities."
          }
        ].map((feature, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx }}
            className="bg-white p-8 rounded-[2rem] border border-zinc-200/50 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-6 text-indigo-600">
              <feature.icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-3">{feature.title}</h3>
            <p className="text-zinc-500 leading-relaxed text-sm">
              {feature.desc}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Use Cases Section */}
      <div className="space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">Potential Use Cases</h2>
          <p className="text-zinc-500">Discover how Temporal Knowledge Graphs are revolutionizing financial intelligence across different domains.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: TrendingUp,
              title: "Regime Identification",
              desc: "Detect shifts between trending, mean-reverting, and chaotic market states by analyzing the geometric properties of the TKG trajectory.",
              color: "bg-blue-50 text-blue-600 border-blue-100"
            },
            {
              icon: Zap,
              title: "Flash Crash Forensics",
              desc: "Reconstruct high-frequency volatility events in 3D to identify the exact sequence of liquidity failures and state transitions.",
              color: "bg-amber-50 text-amber-600 border-amber-100"
            },
            {
              icon: ShieldAlert,
              title: "Risk Management",
              desc: "Map current market paths against historical 'Black Swan' events to quantify the probability of entering high-risk state clusters.",
              color: "bg-rose-50 text-rose-600 border-rose-100"
            },
            {
              icon: BarChart3,
              title: "Alpha Generation",
              desc: "Identify non-linear lead-lag relationships between asset classes that are invisible in traditional 2D time-series analysis.",
              color: "bg-emerald-50 text-emerald-600 border-emerald-100"
            },
            {
              icon: Globe,
              title: "Macro Sentiment Analysis",
              desc: "Overlay global news events onto the TKG to see how geopolitical shocks physically warp the market's state space.",
              color: "bg-indigo-50 text-indigo-600 border-indigo-100"
            },
            {
              icon: Cpu,
              title: "Algo-Trading Optimization",
              desc: "Use TKG state labels to dynamically adjust algorithmic parameters based on the current 'topological neighborhood' of the market.",
              color: "bg-purple-50 text-purple-600 border-purple-100"
            }
          ].map((useCase, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * idx }}
              className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm hover:border-indigo-200 transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${useCase.color}`}>
                <useCase.icon className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 mb-2 group-hover:text-indigo-600 transition-colors">{useCase.title}</h4>
              <p className="text-zinc-500 text-xs leading-relaxed">
                {useCase.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
