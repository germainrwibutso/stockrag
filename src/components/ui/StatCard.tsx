import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  trend?: number;
  icon: React.ReactNode;
  date?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, icon, date }) => (
  <div className="bg-white p-6 rounded-3xl border border-zinc-200/50 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300 group">
    <div className="flex items-start justify-between mb-4">
      <div className="p-3 bg-zinc-50 rounded-2xl group-hover:bg-indigo-50 group-hover:scale-110 transition-all duration-300">
        {icon}
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
          trend >= 0 
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
            : 'bg-rose-50 text-rose-600 border border-rose-100'
        }`}>
          {trend >= 0 ? '+' : ''}{trend.toFixed(2)}%
        </span>
      )}
    </div>
    <div>
      <p className="text-sm font-medium text-zinc-400 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">{value}</h3>
      {date && <p className="text-xs text-zinc-400 mt-2 font-medium">Last updated: {date}</p>}
    </div>
  </div>
);

export default StatCard;
