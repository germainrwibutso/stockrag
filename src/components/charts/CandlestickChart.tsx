import React from 'react';
import Plot from 'react-plotly.js';
import { Loader2 } from 'lucide-react';
import { StockData } from '../../types';

interface CandlestickChartProps {
  data: StockData[];
  selectedTicker: string;
  isLoading: boolean;
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({ data, selectedTicker, isLoading }) => {
  return (
    <div className="h-[600px] w-full bg-zinc-50/50 rounded-[2rem] border border-zinc-200/50 overflow-hidden relative">
      {isLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-zinc-500 font-medium">Updating chart data...</p>
        </div>
      ) : null}
      
      {data.length > 0 ? (
        <Plot
          data={[
            {
              x: data.map(d => d.Date),
              close: data.map(d => d.Close),
              decreasing: { line: { color: '#ef4444', width: 1.5 } },
              high: data.map(d => d.High),
              increasing: { line: { color: '#10b981', width: 1.5 } },
              low: data.map(d => d.Low),
              open: data.map(d => d.Open),
              type: 'candlestick',
              xaxis: 'x',
              yaxis: 'y',
              name: selectedTicker
            }
          ]}
          layout={{
            autosize: true,
            margin: { l: 60, r: 40, b: 60, t: 20 },
            xaxis: {
              autorange: true,
              title: { text: 'Date', font: { family: 'Inter, sans-serif', size: 12, color: '#a1a1aa' } },
              type: 'date',
              rangeslider: { visible: false },
              gridcolor: '#f1f1f4',
              tickfont: { family: 'Inter, sans-serif', size: 10, color: '#a1a1aa' }
            },
            yaxis: {
              autorange: true,
              title: { text: 'Price ($)', font: { family: 'Inter, sans-serif', size: 12, color: '#a1a1aa' } },
              type: 'linear',
              gridcolor: '#f1f1f4',
              tickfont: { family: 'Inter, sans-serif', size: 10, color: '#a1a1aa' }
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { family: 'Inter, sans-serif' },
            hovermode: 'x unified',
            hoverlabel: {
              bgcolor: '#18181b',
              bordercolor: '#18181b',
              font: { family: 'Inter, sans-serif', size: 12, color: '#ffffff' }
            }
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ 
            displayModeBar: true, 
            responsive: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['select2d', 'lasso2d']
          }}
        />
      ) : (
        <div className="h-full flex items-center justify-center text-sm text-zinc-500">
          No data available. Please upload a CSV file.
        </div>
      )}
    </div>
  );
};

export default CandlestickChart;
