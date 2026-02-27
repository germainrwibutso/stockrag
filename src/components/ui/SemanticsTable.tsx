import React, { useMemo } from 'react';
import { Observation } from '../../types';

interface SemanticsTableProps {
  tkgData: Observation[];
  semanticsData: Record<string, Record<string, string>>;
  activeCategory: string;
  onRowClick: (dataIndex: number) => void;
}

const SemanticsTable: React.FC<SemanticsTableProps> = ({ tkgData, semanticsData, activeCategory, onRowClick }) => {
  const filteredTkgData = useMemo(() => {
    return tkgData.filter(d => semanticsData[d.id]?.[activeCategory]);
  }, [tkgData, semanticsData, activeCategory]);

  const sortedFilteredData = useMemo(() => {
    return [...filteredTkgData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredTkgData]);

  return (
    <div className="bg-white rounded-2xl p-6 border border-zinc-200/50 shadow-sm overflow-hidden flex flex-col max-h-[400px]">
      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 shrink-0">Generated Semantics</h3>
      <div className="overflow-y-auto flex-1 pr-2">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-white z-10">
            <tr>
              <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100">Date</th>
              <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100">Semantic Label</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sortedFilteredData.map((d) => (
              <tr 
                key={d.id} 
                className="hover:bg-zinc-50 transition-colors cursor-pointer group"
                onClick={() => {
                  const dataIndex = tkgData.findIndex(item => item.id === d.id);
                  if (dataIndex !== -1) {
                    onRowClick(dataIndex);
                  }
                }}
              >
                <td className="py-3 px-4 text-sm font-medium text-zinc-900 group-hover:text-indigo-600 transition-colors">{d.date}</td>
                <td className="py-3 px-4 text-sm text-zinc-600">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {semanticsData[d.id][activeCategory]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SemanticsTable;
