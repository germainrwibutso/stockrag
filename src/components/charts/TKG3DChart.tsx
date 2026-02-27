import React from 'react';
import Plot from 'react-plotly.js';
import { Observation } from '../../types';

interface TKG3DChartProps {
  tkgData: Observation[];
  playbackIndex: number;
  searchResults: number[];
  semanticsData: Record<string, string>;
  selectedObs: Observation | null;
  setSelectedObs: (obs: Observation) => void;
  showNodes: boolean;
  showEdges: boolean;
  showSurface: boolean;
  showCandles: boolean;
  tkgTicker: string;
}

const TKG3DChart: React.FC<TKG3DChartProps> = ({
  tkgData,
  playbackIndex,
  searchResults,
  semanticsData,
  selectedObs,
  setSelectedObs,
  showNodes,
  showEdges,
  showSurface,
  showCandles,
  tkgTicker
}) => {
  const visibleData = React.useMemo(() => tkgData.slice(playbackIndex, playbackIndex + 30), [tkgData, playbackIndex]);
  
  const xIndices = React.useMemo(() => visibleData.map((_, i) => i), [visibleData]);
  const xLabels = React.useMemo(() => visibleData.map(d => d.date), [visibleData]);

  // Calculate tick intervals to avoid overlapping labels
  const tickStep = React.useMemo(() => Math.max(1, Math.ceil(visibleData.length / 8)), [visibleData]);
  const tickVals = React.useMemo(() => xIndices.filter((_, i) => i % tickStep === 0), [xIndices, tickStep]);
  const tickText = React.useMemo(() => xLabels.filter((_, i) => i % tickStep === 0), [xLabels, tickStep]);

  const layout = React.useMemo(() => ({
    uirevision: tkgTicker,
    margin: { l: 0, r: 0, b: 0, t: 0 },
    scene: {
      xaxis: {
        title: 'Temporal Axis (Days)',
        tickvals: tickVals,
        ticktext: tickText,
        gridcolor: '#e4e4e7',
        zerolinecolor: '#e4e4e7',
        showbackground: false,
        titlefont: { family: 'Inter, sans-serif', size: 11, color: '#71717a' },
        tickfont: { family: 'Inter, sans-serif', size: 10, color: '#a1a1aa' }
      },
      yaxis: {
        title: 'r_open / r_low',
        range: [-1.5, 1.5],
        gridcolor: '#e4e4e7',
        zerolinecolor: '#e4e4e7',
        showbackground: false,
        titlefont: { family: 'Inter, sans-serif', size: 11, color: '#71717a' },
        tickfont: { family: 'Inter, sans-serif', size: 10, color: '#a1a1aa' }
      },
      zaxis: {
        title: 'ret_close / r_high',
        range: [-1.2, 1.2],
        gridcolor: '#e4e4e7',
        zerolinecolor: '#e4e4e7',
        showbackground: false,
        titlefont: { family: 'Inter, sans-serif', size: 11, color: '#71717a' },
        tickfont: { family: 'Inter, sans-serif', size: 10, color: '#a1a1aa' }
      },
      aspectmode: 'manual',
      aspectratio: { x: 3, y: 1, z: 1 },
      dragmode: 'orbit'
    },
    showlegend: false,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    hoverlabel: {
      bgcolor: '#18181b',
      bordercolor: '#18181b',
      font: { family: 'Inter, sans-serif', size: 12, color: '#ffffff' }
    }
  }), [tkgTicker, tickVals, tickText]);

  if (tkgData.length === 0) {
    return (
      <div className="h-[600px] w-full rounded-[2rem] overflow-hidden relative border border-zinc-200/50 bg-white">
        <div className="h-full flex items-center justify-center text-sm text-zinc-500">
          No temporal chain data available for {tkgTicker || 'this ticker'}.
        </div>
      </div>
    );
  }

  const s_open: number[] = [];
  const s_high: number[] = [];
  const s_low: number[] = [];
  const s_ret: number[] = [];

  const ringX: any[] = [];
  const ringY: any[] = [];
  const ringZ: any[] = [];
  const ringText: any[] = [];
  const ringColor: number[] = [];

  const surfX: any[][] = [];
  const surfY: number[][] = [];
  const surfZ: number[][] = [];
  const surfColor: number[][] = [];
  const surfText: string[][] = [];

  const searchResultIndicesInView = searchResults
    .map(i => i - playbackIndex)
    .filter(i => i >= 0 && i < 30);
  
  visibleData.forEach((d, i) => {
    const date = d.date;
    const state = d.state_vector || [0, 0, 0, 0];
    const r_open = state[0];
    const r_high = state[1];
    const r_low = state[2];
    const ret_close = state[3];

    s_open.push(r_open);
    s_high.push(r_high);
    s_low.push(r_low);
    s_ret.push(ret_close);

    // Point 1: r_open (+Y)
    ringX.push(i); ringY.push(r_open); ringZ.push(0); 
    ringText.push(`Date: ${date}<br>r_open: ${r_open.toFixed(3)}`);
    ringColor.push(0);
    
    // Point 2: ret_close (+Z)
    ringX.push(i); ringY.push(0); ringZ.push(ret_close); 
    ringText.push(`Date: ${date}<br>ret_close: ${ret_close.toFixed(3)}`);
    ringColor.push(3);
    
    // Point 3: r_low (-Y)
    ringX.push(i); ringY.push(-r_low); ringZ.push(0); 
    ringText.push(`Date: ${date}<br>r_low: ${r_low.toFixed(3)}`);
    ringColor.push(2);
    
    // Point 4: r_high (-Z)
    ringX.push(i); ringY.push(0); ringZ.push(-r_high); 
    ringText.push(`Date: ${date}<br>r_high: ${r_high.toFixed(3)}`);
    ringColor.push(1);
    
    // Close the ring (back to r_open)
    ringX.push(i); ringY.push(r_open); ringZ.push(0); 
    ringText.push(`Date: ${date}<br>r_open: ${r_open.toFixed(3)}`);
    ringColor.push(0);
    
    // Break the line for the next day's ring
    ringX.push(null); ringY.push(null); ringZ.push(null); 
    ringText.push(null);
    ringColor.push(0);

    // Surface data
    surfX.push([i, i, i, i, i]);
    surfY.push([r_open, 0, -r_low, 0, r_open]);
    surfZ.push([0, ret_close, 0, -r_high, 0]);
    surfColor.push([0, 3, 2, 1, 0]);
    surfText.push([
      `Date: ${date}<br>r_open: ${r_open.toFixed(3)}`,
      `Date: ${date}<br>ret_close: ${ret_close.toFixed(3)}`,
      `Date: ${date}<br>r_low: ${r_low.toFixed(3)}`,
      `Date: ${date}<br>r_high: ${r_high.toFixed(3)}`,
      `Date: ${date}<br>r_open: ${r_open.toFixed(3)}`
    ]);
  });

  const categoryColorscale = [
    [0, '#3b82f6'],     // r_open: Blue
    [0.3333, '#10b981'], // r_high: Green
    [0.6666, '#f59e0b'], // r_low: Orange
    [1, '#ef4444']      // ret_close: Red
  ];

  const plotData: any[] = [];

  if (showCandles && visibleData.length > 0) {
    const prices = visibleData.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Map price to [-1.0, 1.0] range to fit nicely within the chart
    const normalize = (val: number) => ((val - minPrice) / priceRange) * 2.0 - 1.0;

    const candleGreenX: (number | null)[] = [];
    const candleGreenY: (number | null)[] = [];
    const candleGreenZ: (number | null)[] = [];
    
    const candleRedX: (number | null)[] = [];
    const candleRedY: (number | null)[] = [];
    const candleRedZ: (number | null)[] = [];

    const wickGreenX: (number | null)[] = [];
    const wickGreenY: (number | null)[] = [];
    const wickGreenZ: (number | null)[] = [];

    const wickRedX: (number | null)[] = [];
    const wickRedY: (number | null)[] = [];
    const wickRedZ: (number | null)[] = [];

    visibleData.forEach((d, i) => {
      const isGreen = d.close >= d.open;
      const nOpen = normalize(d.open);
      const nClose = normalize(d.close);
      const nHigh = normalize(d.high);
      const nLow = normalize(d.low);
      
      const targetX = isGreen ? candleGreenX : candleRedX;
      const targetY = isGreen ? candleGreenY : candleRedY;
      const targetZ = isGreen ? candleGreenZ : candleRedZ;
      
      const wickTargetX = isGreen ? wickGreenX : wickRedX;
      const wickTargetY = isGreen ? wickGreenY : wickRedY;
      const wickTargetZ = isGreen ? wickGreenZ : wickRedZ;

      // Fixed depth at center of chart (Y = 0)
      const depth = 0;

      // Body (Thick Line)
      targetX.push(i, i, null);
      targetY.push(depth, depth, null);
      targetZ.push(nOpen, nClose, null);

      // Wick (Thin Line)
      wickTargetX.push(i, i, null);
      wickTargetY.push(depth, depth, null);
      wickTargetZ.push(nHigh, nLow, null);
    });

    plotData.push(
      {
        x: wickGreenX, y: wickGreenY, z: wickGreenZ,
        type: 'scatter3d', mode: 'lines', name: 'Bullish Wick',
        line: { color: '#10b981', width: 2 }, hoverinfo: 'skip', showlegend: false
      },
      {
        x: wickRedX, y: wickRedY, z: wickRedZ,
        type: 'scatter3d', mode: 'lines', name: 'Bearish Wick',
        line: { color: '#ef4444', width: 2 }, hoverinfo: 'skip', showlegend: false
      },
      {
        x: candleGreenX, y: candleGreenY, z: candleGreenZ,
        type: 'scatter3d', mode: 'lines', name: 'Bullish Candle',
        line: { color: '#10b981', width: 10 }, hoverinfo: 'skip', showlegend: false
      },
      {
        x: candleRedX, y: candleRedY, z: candleRedZ,
        type: 'scatter3d', mode: 'lines', name: 'Bearish Candle',
        line: { color: '#ef4444', width: 10 }, hoverinfo: 'skip', showlegend: false
      }
    );
  }

  if (showSurface) {
    plotData.push({
      x: surfX,
      y: surfY,
      z: surfZ,
      type: 'surface',
      name: 'State Surface',
      surfacecolor: surfColor,
      colorscale: categoryColorscale,
      cmin: 0,
      cmax: 3,
      opacity: 0.4,
      lighting: {
        ambient: 0.6,
        diffuse: 0.8,
        specular: 0.2,
        roughness: 0.5,
        fresnel: 0.2
      },
      text: surfText,
      hoverinfo: 'text',
      showscale: false,
    });
  }

  if (showNodes || showEdges) {
    plotData.push({
      x: ringX,
      y: ringY,
      z: ringZ,
      type: 'scatter3d',
      mode: (showNodes && showEdges) ? 'lines+markers' : (showNodes ? 'markers' : 'lines'),
      name: 'Daily State',
      line: { 
        color: ringColor, 
        colorscale: categoryColorscale,
        cmin: 0,
        cmax: 3,
        width: 3 
      },
      marker: { 
        size: 3.5, 
        color: ringColor, 
        colorscale: categoryColorscale,
        cmin: 0,
        cmax: 3,
        opacity: 1
      },
      text: ringText,
      hoverinfo: 'text'
    });
  }

  if (showEdges) {
    plotData.push(
      {
        x: xIndices,
        y: s_open,
        z: xIndices.map(() => 0),
        type: 'scatter3d',
        mode: 'lines',
        name: 'r_open Trend',
        line: { color: '#3b82f6', width: 4 },
        hoverinfo: 'skip'
      },
      {
        x: xIndices,
        y: xIndices.map(() => 0),
        z: s_high.map(v => -v),
        type: 'scatter3d',
        mode: 'lines',
        name: 'r_high Trend',
        line: { color: '#10b981', width: 4 },
        hoverinfo: 'skip'
      },
      {
        x: xIndices,
        y: s_low.map(v => -v),
        z: xIndices.map(() => 0),
        type: 'scatter3d',
        mode: 'lines',
        name: 'r_low Trend',
        line: { color: '#f59e0b', width: 4 },
        hoverinfo: 'skip'
      },
      {
        x: xIndices,
        y: xIndices.map(() => 0),
        z: s_ret,
        type: 'scatter3d',
        mode: 'lines',
        name: 'ret_close Trend',
        line: { color: '#ef4444', width: 4 },
        hoverinfo: 'skip'
      }
    );

    // Add semantic labels on edges
    const semX: number[] = [];
    const semY: number[] = [];
    const semZ: number[] = [];
    const semLabels: string[] = [];

    visibleData.forEach((d, i) => {
      const actualIndex = playbackIndex + i;
      if (actualIndex > 0 && semanticsData[d.id]) {
        const prevD = visibleData[i - 1];
        if (prevD) {
          const currState = d.state_vector || [0, 0, 0, 0];
          const prevState = prevD.state_vector || [0, 0, 0, 0];
          
          // Midpoint calculation for better relationship visualization
          // Y-axis components: r_open (+), r_low (-)
          // Z-axis components: ret_close (+), r_high (-)
          const midY = ((currState[0] - currState[2]) + (prevState[0] - prevState[2])) / 2;
          const midZ = ((currState[3] - currState[1]) + (prevState[3] - prevState[1])) / 2;

          semX.push(i - 0.5);
          semY.push(midY);
          semZ.push(midZ);
          semLabels.push(semanticsData[d.id]);
        }
      }
    });

    if (semLabels.length > 0) {
      plotData.push({
        x: semX,
        y: semY,
        z: semZ,
        type: 'scatter3d',
        mode: 'text',
        name: 'Semantics',
        text: semLabels,
        textposition: 'middle center',
        textfont: {
          family: 'Inter, sans-serif',
          size: 11,
          color: '#4f46e5'
        },
        hoverinfo: 'text'
      });
    }

    // Highlight selected observation with a pulsing halo
    if (selectedObs) {
      const selIndex = visibleData.findIndex(d => d.id === selectedObs.id);
      if (selIndex !== -1) {
        const state = selectedObs.state_vector || [0, 0, 0, 0];
        // We highlight all 4 points of the ring for the selected day
        const selY = [state[0], 0, -state[2], 0];
        const selZ = [0, state[3], 0, -state[1]];

        plotData.push({
          x: [selIndex, selIndex, selIndex, selIndex],
          y: selY,
          z: selZ,
          type: 'scatter3d',
          mode: 'markers',
          name: 'Selected Halo',
          marker: {
            size: 12,
            color: 'rgba(79, 70, 229, 0.15)',
            line: { color: 'rgba(79, 70, 229, 0.5)', width: 1.5 },
            opacity: 0.6
          },
          hoverinfo: 'none',
          showlegend: false
        });

        // Inner solid highlight
        plotData.push({
          x: [selIndex, selIndex, selIndex, selIndex],
          y: selY,
          z: selZ,
          type: 'scatter3d',
          mode: 'markers',
          name: 'Selected Core',
          marker: {
            size: 5,
            color: '#ffffff',
            line: { color: '#4f46e5', width: 1.5 },
            opacity: 1
          },
          hoverinfo: 'none',
          showlegend: false
        });
      }
    }

    // Highlight search results
    if (searchResultIndicesInView.length > 0) {
      plotData.push({
        x: searchResultIndicesInView,
        y: searchResultIndicesInView.map(() => 0),
        z: searchResultIndicesInView.map(i => visibleData[i].state_vector ? visibleData[i].state_vector[1] : 0),
        type: 'scatter3d',
        mode: 'markers',
        name: 'Search Result',
        marker: {
          size: 10,
          color: '#ec4899',
          symbol: 'circle-open',
          line: { color: '#ec4899', width: 2 }
        },
        hoverinfo: 'none'
      });
    }
  }
  return (
    <div className="h-[600px] w-full rounded-[2rem] overflow-hidden relative border border-zinc-200/50 bg-white">
      <Plot
        data={plotData}
        layout={layout}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
        config={{ displayModeBar: true, displaylogo: false }}
        onClick={(event: any) => {
          if (event.points && event.points[0]) {
            const point = event.points[0];
            // The x index corresponds to the index in visibleData
            const index = Math.round(point.x);
            if (visibleData[index]) {
              setSelectedObs(visibleData[index]);
            }
          }
        }}
      />
    </div>
  );
};

export default TKG3DChart;
