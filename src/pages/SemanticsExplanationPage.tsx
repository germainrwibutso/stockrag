import React from 'react';
import { motion } from 'motion/react';
import { BrainCircuit, Network, ArrowRight, Info, Cpu, Database, Activity } from 'lucide-react';

const SemanticsExplanationPage = () => {
  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] p-12 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] border border-zinc-200/50 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
            <BrainCircuit className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Semantic Engine Architecture</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-6">
            How <span className="text-indigo-600 italic font-serif">Semantics</span> are Generated
          </h1>
          <p className="text-lg text-zinc-500 leading-relaxed">
            The TKG doesn't just map numbers; it understands market behavior. Our semantic engine translates raw state transitions into human-readable insights using advanced LLMs.
          </p>
        </div>
      </motion.div>

      {/* The "Between Nodes" Explanation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold text-zinc-900">The State Transition Model</h2>
          <p className="text-zinc-500 leading-relaxed">
            Semantics are generated at the <strong>edge level</strong>, representing the transition between two sequential temporal nodes. Our AI analyzes the relationship between the four normalized components of the state vector to describe the market's internal dynamics:
          </p>
          <div className="space-y-4">
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">State Vector Components</h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <li className="flex flex-col">
                  <span className="text-sm font-bold text-indigo-600">r_open</span>
                  <span className="text-[10px] text-zinc-500">Normalized Open/Close ratio</span>
                </li>
                <li className="flex flex-col">
                  <span className="text-sm font-bold text-indigo-600">r_high</span>
                  <span className="text-[10px] text-zinc-500">Normalized High/Close ratio</span>
                </li>
                <li className="flex flex-col">
                  <span className="text-sm font-bold text-indigo-600">r_low</span>
                  <span className="text-[10px] text-zinc-500">Normalized Low/Close ratio</span>
                </li>
                <li className="flex flex-col">
                  <span className="text-sm font-bold text-indigo-600">ret_close</span>
                  <span className="text-[10px] text-zinc-500">Daily Close Return</span>
                </li>
              </ul>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-600">
                <span className="text-xs font-bold">01</span>
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 text-sm">Inter-Component Relationship</h4>
                <p className="text-xs text-zinc-500">The AI identifies how components like <code>r_high</code> and <code>r_low</code> compress or expand relative to <code>ret_close</code>.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-600">
                <span className="text-xs font-bold">02</span>
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 text-sm">Temporal Influence</h4>
                <p className="text-xs text-zinc-500">Labels describe how the previous state's configuration influences the current state's components.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                <Network className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 text-sm">The Relational Edge</h4>
                <p className="text-xs text-zinc-500">The resulting label captures the "influence" of the state vector components on the final market state.</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900 rounded-[2rem] p-8 relative overflow-hidden aspect-video flex items-center justify-center"
        >
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px]" />
          </div>
          
          <div className="relative flex items-center gap-12 z-10">
            {/* Node A */}
            <div className="flex flex-col items-center gap-3 group">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl relative z-10 group-hover:border-indigo-400/50 transition-colors">
                  <Database className="w-8 h-8 text-white" />
                </div>
              </div>
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Day T</span>
            </div>

            {/* Edge with Label */}
            <div className="relative flex-1 flex flex-col items-center">
              <div className="h-0.5 w-32 bg-gradient-to-r from-indigo-500 to-emerald-500 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div className="absolute -top-10 whitespace-nowrap">
                <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-lg shadow-emerald-500/20">
                  Bullish Breakout
                </span>
              </div>
              <span className="mt-4 text-[9px] font-medium text-white/30 uppercase tracking-[0.2em]">Semantic Edge</span>
            </div>

            {/* Node B */}
            <div className="flex flex-col items-center gap-3 group">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl relative z-10 group-hover:border-emerald-400/50 transition-colors">
                  <Activity className="w-8 h-8 text-white" />
                </div>
              </div>
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Day T+1</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Generation Process */}
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-zinc-900 text-center">The Intelligence Pipeline</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Database,
              title: "Data Extraction",
              desc: "We extract Open, High, Low, Close, and Volume data for the transition period, calculating the 'Delta' (price change)."
            },
            {
              icon: Cpu,
              title: "AI Analysis",
              desc: "The data is fed into Gemini 3 Flash with a specialized prompt designed to identify non-linear market patterns."
            },
            {
              icon: BrainCircuit,
              title: "Label Synthesis",
              desc: "The model synthesizes a 1-3 word semantic label that captures the 'essence' of the market move."
            }
          ].map((step, idx) => (
            <div key={idx} className="bg-white p-8 rounded-[2rem] border border-zinc-200/50 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6 text-indigo-600">
                <step.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-3">{step.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-indigo-900 rounded-[3rem] p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Info className="w-6 h-6 text-indigo-300" />
              Technical Constraints
            </h3>
            <ul className="space-y-4 text-indigo-100/80 text-sm">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                Labels are generated for edges where <code>Day N</code> and <code>Day N+1</code> both exist.
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                The first node in any chain has no incoming edge, thus no semantic label.
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                Batch processing (150 nodes per request) is used to maintain temporal context for the LLM.
              </li>
            </ul>
          </div>
          <div className="bg-white/5 rounded-3xl p-8 border border-white/10 backdrop-blur-sm">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-4">Prompt Example</h4>
            <code className="text-[10px] font-mono text-indigo-200 block leading-relaxed">
              "Analyze the transition for AAPL from 2024-01-01 to 2024-01-02. <br/>
              Day 1: Close=185.20, Vol=50M <br/>
              Day 2: Close=189.50, Vol=85M, Delta=+4.30 <br/>
              Result: Bullish Breakout"
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SemanticsExplanationPage;
