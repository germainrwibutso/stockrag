/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts';
import { UploadCloud, TrendingUp, Activity, BarChart2, DollarSign, Loader2, Save, CheckCircle, AlertCircle, Database, Code, Network, ArrowRight, Copy, ExternalLink, RefreshCw, Send, MessageSquare, Bot, User, Search } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Plot from 'react-plotly.js';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import SemanticsTable from './components/SemanticsTable';

const supabaseUrl = 'https://bejyrfgyzlfrnzaxzqyx.supabase.co';
const supabaseKey = 'sb_publishable_Vb_oRWmU7BToU0QiDTV1Gw_6EnJc4ml';
const supabase = createClient(supabaseUrl, supabaseKey);

type StockData = {
  Date: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
  Ticker: string;
};

const SQL_SETUP_SCRIPT = `-- 1. Normalize structure in Postgres
CREATE TABLE IF NOT EXISTS tickers (
  id serial PRIMARY KEY,
  symbol text UNIQUE NOT NULL
);

INSERT INTO tickers(symbol)
VALUES ('NVDA'), ('AAPL'), ('TSLA')
ON CONFLICT (symbol) DO NOTHING;

CREATE TABLE IF NOT EXISTS stock_data (
  id serial PRIMARY KEY,
  "date" date NOT NULL,
  "open" numeric NOT NULL,
  "high" numeric NOT NULL,
  "low" numeric NOT NULL,
  "close" numeric NOT NULL,
  "volume" bigint NOT NULL,
  "ticker" text NOT NULL,
  "ticker_id" int REFERENCES tickers(id),
  "returns" numeric,
  "range" numeric,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for temporal ordering
CREATE INDEX IF NOT EXISTS idx_stock_ticker_date
ON stock_data(ticker_id, "date");

-- 2. Create observations table for TKG
DROP TABLE IF EXISTS semantic_relationships CASCADE;
DROP TABLE IF EXISTS observations CASCADE;

CREATE TABLE observations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker text NOT NULL,
  date date NOT NULL,
  open numeric,
  high numeric,
  low numeric,
  close numeric,
  volume bigint,
  state_vector jsonb NOT NULL,
  ret_close numeric,
  ret_volume numeric,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for temporal ordering
CREATE INDEX IF NOT EXISTS idx_observations_ticker_date
ON observations(ticker, "date");

-- 3. Function to generate TKG
DROP FUNCTION IF EXISTS generate_tkg();
CREATE OR REPLACE FUNCTION generate_tkg() RETURNS void AS $$
BEGIN
    TRUNCATE TABLE observations CASCADE;
    
    WITH raw_ratios AS (
        SELECT 
            ticker,
            "date",
            "open", "high", "low", "close", "volume",
            "open" / "close" AS r_open,
            "high" / "close" AS r_high,
            "low" / "close" AS r_low,
            COALESCE(("close" - lag("close") OVER (PARTITION BY ticker ORDER BY "date")) / lag("close") OVER (PARTITION BY ticker ORDER BY "date"), 0) AS ret_close,
            COALESCE(("volume" - lag("volume") OVER (PARTITION BY ticker ORDER BY "date")) / NULLIF(lag("volume") OVER (PARTITION BY ticker ORDER BY "date"), 0), 0) AS ret_volume
        FROM stock_data
    ),
    min_max AS (
        SELECT 
            ticker,
            MIN(r_open) as min_r_open, MAX(r_open) as max_r_open,
            MIN(r_high) as min_r_high, MAX(r_high) as max_r_high,
            MIN(r_low) as min_r_low, MAX(r_low) as max_r_low,
            MIN(ret_close) as min_ret_close, MAX(ret_close) as max_ret_close,
            MIN(ret_volume) as min_ret_volume, MAX(ret_volume) as max_ret_volume
        FROM raw_ratios
        GROUP BY ticker
    ),
    scaled AS (
        SELECT 
            r.ticker,
            r."date",
            r."open", r."high", r."low", r."close", r."volume",
            COALESCE((r.r_open - m.min_r_open) / NULLIF(m.max_r_open - m.min_r_open, 0), 0) AS r_open_scaled,
            COALESCE((r.r_high - m.min_r_high) / NULLIF(m.max_r_high - m.min_r_high, 0), 0) AS r_high_scaled,
            COALESCE((r.r_low - m.min_r_low) / NULLIF(m.max_r_low - m.min_r_low, 0), 0) AS r_low_scaled,
            COALESCE((r.ret_close - m.min_ret_close) / NULLIF(m.max_ret_close - m.min_ret_close, 0), 0) AS ret_close_scaled,
            COALESCE((r.ret_volume - m.min_ret_volume) / NULLIF(m.max_ret_volume - m.min_ret_volume, 0), 0) AS ret_volume_scaled,
            r.ret_close,
            r.ret_volume
        FROM raw_ratios r
        JOIN min_max m ON r.ticker = m.ticker
    )
    INSERT INTO observations (ticker, "date", open, high, low, close, volume, state_vector, ret_close, ret_volume)
    SELECT 
        ticker,
        "date",
        "open", "high", "low", "close", "volume",
        jsonb_build_array(r_open_scaled, r_high_scaled, r_low_scaled, ret_close_scaled),
        ret_close,
        ret_volume
    FROM scaled
    ORDER BY ticker, "date";
END;
$$ LANGUAGE plpgsql;

-- 4. Function to get latest observations
DROP FUNCTION IF EXISTS get_latest_observations();
CREATE OR REPLACE FUNCTION get_latest_observations()
RETURNS TABLE(ticker text, date date, open numeric, high numeric, low numeric, close numeric, volume bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (o.ticker) o.ticker, o.date, o.open, o.high, o.low, o.close, o.volume
  FROM observations o
  ORDER BY o.ticker, o.date DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to get deltas
DROP FUNCTION IF EXISTS get_observation_deltas();

-- 6. Trigger for runtime ingestion
DROP FUNCTION IF EXISTS trg_insert_observation() CASCADE;
DROP TRIGGER IF EXISTS trg_stock_data_insert ON stock_data;

-- 7. Semantic Relationships Table
CREATE TABLE semantic_relationships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  observation_id uuid REFERENCES observations(id) ON DELETE CASCADE,
  label text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(observation_id)
);

-- Set up Row Level Security (RLS)
ALTER TABLE stock_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_relationships ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public inserts/reads
DROP POLICY IF EXISTS "Allow public inserts" ON stock_data;
CREATE POLICY "Allow public inserts" ON stock_data FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public reads" ON stock_data;
CREATE POLICY "Allow public reads" ON stock_data FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public inserts" ON tickers;
CREATE POLICY "Allow public inserts" ON tickers FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public reads" ON tickers;
CREATE POLICY "Allow public reads" ON tickers FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public inserts" ON observations;
CREATE POLICY "Allow public inserts" ON observations FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public reads" ON observations;
CREATE POLICY "Allow public reads" ON observations FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public all" ON semantic_relationships;
CREATE POLICY "Allow public all" ON semantic_relationships FOR ALL TO public USING (true) WITH CHECK (true);`;

export default function App() {
  const [data, setData] = useState<StockData[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tkg' | 'setup' | 'candlestick'>('candlestick');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'local' | 'supabase'>('local');

  const [latestObservations, setLatestObservations] = useState<any[]>([]);
  const [isGeneratingTkg, setIsGeneratingTkg] = useState(false);
  const [tkgGenerateStatus, setTkgGenerateStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [tkgLoading, setTkgLoading] = useState(false);
  
  const [tkgTicker, setTkgTicker] = useState<string>('');
  const [tkgPage, setTkgPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [tkgData, setTkgData] = useState<any[]>([]);
  
  const [showNodes, setShowNodes] = useState(true);
  const [showEdges, setShowEdges] = useState(true);
  const [showSurface, setShowSurface] = useState(true);
  const [semanticSearch, setSemanticSearch] = useState('');
  
  const [isGeneratingSemantics, setIsGeneratingSemantics] = useState(false);
  const [semanticsData, setSemanticsData] = useState<Record<string, string>>({});
  const [selectedObs, setSelectedObs] = useState<any | null>(null);
  
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const visibleData = tkgData.slice(playbackIndex, playbackIndex + 30);
      const contextData = visibleData.map(d => {
        const state = d.state_vector || [0, 0, 0, 0];
        return `Date: ${d.date}, r_open: ${state[0].toFixed(3)}, r_high: ${state[1].toFixed(3)}, r_low: ${state[2].toFixed(3)}, ret_close: ${state[3].toFixed(3)}, Semantic Label: ${semanticsData[d.id] || 'None'}`;
      }).join('\n');

      const prompt = `You are an AI assistant analyzing a Temporal Knowledge Graph (TKG) of stock market data for ${tkgTicker}.
      The user is currently viewing a 30-day window of normalized state vectors.
      The state vector components are:
      - r_open: (Open / Close) normalized between 0 and 1
      - r_high: (High / Close) normalized between 0 and 1
      - r_low: (Low / Close) normalized between 0 and 1
      - ret_close: Daily close return normalized between 0 and 1
      
      Here is the data for the currently visible 30-day window:
      ${contextData}
      
      User question: ${userMessage}
      
      IMPORTANT: When referring to specific dates, ALWAYS format them as a markdown link using the exact date as both the text and the href, like this: [2018-02-13](#2018-02-13). This will allow the user to click the date and see it on the graph.
      
      Please provide a concise and insightful answer based on the provided TKG data.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setChatMessages(prev => [...prev, { role: 'assistant', content: response.text || 'No response generated.' }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error while processing your request.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const fetchTkgChain = async (ticker: string) => {
    try {
      let allData: any[] = [];
      let from = 0;
      const step = 1000; // Supabase's default/max limit per request
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('observations')
          .select(`
            id,
            date,
            open,
            high,
            low,
            close,
            volume,
            state_vector,
            semantic_relationships ( label )
          `)
          .eq('ticker', ticker)
          .order('date', { ascending: true })
          .range(from, from + step - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
      }

      if (allData.length > 0) {
        setTkgData(allData);
        setPlaybackIndex(0);
        setSelectedObs(null);

        const semMap: Record<string, string> = {};
        allData.forEach((d: any) => {
          if (d.semantic_relationships && d.semantic_relationships.length > 0) {
            semMap[d.id] = d.semantic_relationships[0].label;
          }
        });
        
        setSemanticsData(semMap);
      } else {
        setTkgData([]);
        setSemanticsData({});
      }
    } catch (err) {
      console.error('Error fetching TKG chain:', err);
    }
  };

  useEffect(() => {
    if (tkgTicker) {
      fetchTkgChain(tkgTicker);
    }
  }, [tkgTicker]);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackIndex(prev => {
          if (prev + 30 >= tkgData.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, tkgData.length]);

  const fetchTkgData = async () => {
    setTkgLoading(true);
    try {
      const { data: obsData, error: obsError } = await supabase.rpc('get_latest_observations');
      if (obsError) throw obsError;
      setLatestObservations(obsData || []);

      if (obsData && obsData.length > 0) {
        const firstTicker = obsData[0].ticker;
        setTkgTicker(firstTicker);
        setTkgPage(0);
      }
    } catch (err) {
      console.error('Error fetching TKG data:', err);
    } finally {
      setTkgLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tkg') {
      fetchTkgData();
    }
  }, [activeTab]);

  const handleGenerateSemantics = async () => {
    if (tkgData.length < 2) return;
    setIsGeneratingSemantics(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      // Find the first missing semantic
      const firstMissingIndex = tkgData.findIndex((d, i) => i > 0 && !semanticsData[d.id]);
      if (firstMissingIndex === -1) {
        setIsGeneratingSemantics(false);
        return; // All done
      }

      const batchStart = Math.max(0, firstMissingIndex - 1);
      const batchEnd = Math.min(tkgData.length, batchStart + 51); // 50 edges = 51 nodes
      const batchData = tkgData.slice(batchStart, batchEnd);
      
      const prompt = `Analyze the following sequence of stock market observations for ${tkgTicker}. 
      For each day (except the first one), provide a short (1-3 words) semantic label that describes the transition from the previous day's state to the current day's state. 
      Consider Open, Close, Volume, and the change (Delta).
      Examples of labels: "Bullish Breakout", "Bearish Reversal", "Consolidation", "Volume Spike", "Gap Up", "Gap Down", "Steady Growth", "Sharp Drop".
      
      Data:
      ${batchData.map((d, i) => {
        const delta = i > 0 && batchData[i-1] ? d.close - batchData[i-1].close : 0;
        return `Day ${batchStart + i + 1} (${d.date}): Open=${d.open}, Close=${d.close}, Volume=${(d.volume/1000000).toFixed(2)}M, Delta=${delta.toFixed(2)}`;
      }).join('\n')}
      
      Return the results as a JSON array of objects, where each object has "index" (corresponding to the Day number) and "label".
      Example: [{"index": ${batchStart + 1}, "label": "Bullish Breakout"}, ...]`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                index: { type: Type.INTEGER },
                label: { type: Type.STRING }
              },
              required: ["index", "label"]
            }
          }
        }
      });

      if (!response.text) {
        console.warn('Received empty response from API for semantics generation.');
        return;
      }
      const results = JSON.parse(response.text);
      
      // Save to Supabase
      const insertData = results.map((res: any) => {
        const obs = tkgData[res.index - 1]; // Adjust for 1-based index from prompt
        if (!obs) return null;
        return {
          observation_id: obs.id,
          label: res.label,
        };
      }).filter(Boolean);

      if (insertData.length > 0) {
        // Upsert new semantics to handle both new and existing entries
        const { error } = await supabase
          .from('semantic_relationships')
          .upsert(insertData, { onConflict: 'observation_id' });
        
        if (error) throw error;
        
        // Refresh local state with the newly generated semantics using a functional update
        setSemanticsData(prevSemantics => ({
          ...prevSemantics,
          ...Object.fromEntries(insertData.map((d: any) => [d.observation_id, d.label]))
        }));
      }
    } catch (err) {
      console.error('Error generating semantics:', err);
      alert('Failed to generate semantics. Make sure you have run the latest setup script to create the semantic_relationships table.');
    } finally {
      setIsGeneratingSemantics(false);
    }
  };

  const handleGenerateTkg = async () => {
    setIsGeneratingTkg(true);
    setTkgGenerateStatus('idle');
    try {
      const { error } = await supabase.rpc('generate_tkg');
      if (error) throw error;
      
      await fetchTkgData();
      setTkgGenerateStatus('success');
    } catch (err: any) {
      console.error('Error generating TKG:', err);
      alert(`Failed to generate TKG: ${err.message || 'Unknown error'}. Make sure you have run the latest setup script.`);
      setTkgGenerateStatus('error');
    } finally {
      setIsGeneratingTkg(false);
      setTimeout(() => setTkgGenerateStatus('idle'), 3000);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        let allData: any[] = [];
        let hasMore = true;
        let page = 0;
        const pageSize = 1000;

        while (hasMore) {
          const { data: supabaseData, error } = await supabase
            .from('stock_data')
            .select('date, open, high, low, close, volume, ticker')
            .order('date', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) {
            console.error('Error fetching from Supabase:', error);
            setIsInitialLoading(false);
            return;
          }

          if (supabaseData && supabaseData.length > 0) {
            const mappedData = supabaseData.map((d: any) => ({
              Date: d.date,
              Open: d.open,
              High: d.high,
              Low: d.low,
              Close: d.close,
              Volume: d.volume,
              Ticker: d.ticker
            }));
            allData = [...allData, ...mappedData];
            if (supabaseData.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        }

        if (allData.length > 0) {
          setData(allData as StockData[]);
          setDataSource('supabase');
          const tickers = Array.from(new Set(allData.map((d: any) => d.Ticker))).filter(Boolean) as string[];
          if (tickers.length > 0) {
            setSelectedTicker(tickers[0]);
          }
        }
      } catch (err) {
        console.error('Unexpected error fetching from Supabase:', err);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchInitialData();
  }, []);



  const handleSaveToSupabase = async () => {
    if (data.length === 0) return;
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const CHUNK_SIZE = 1000;
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
          .from('stock_data')
          .insert(chunk.map(d => ({
            date: d.Date,
            open: d.Open,
            high: d.High,
            low: d.Low,
            close: d.Close,
            volume: d.Volume,
            ticker: d.Ticker
          })));
        if (error) throw error;
      }
      setSaveStatus('success');
    } catch (err) {
      console.error('Error saving to Supabase:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleTickerChange = (ticker: string) => {
    if (ticker === selectedTicker) return;
    setIsLoading(true);
    setSelectedTicker(ticker);
    // Simulate network request delay
    setTimeout(() => {
      setIsLoading(false);
    }, 600);
  };

  const handleFileUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = results.data as StockData[];
        // Sort by date ascending
        const sortedData = parsedData.sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
        setData(sortedData);
        setDataSource('local');
        
        // Find unique tickers
        const tickers = Array.from(new Set(sortedData.map((d) => d.Ticker))).filter(Boolean);
        if (tickers.length > 0) {
          setSelectedTicker(tickers[0]);
        }
      },
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const tickers = useMemo(() => {
    return Array.from(new Set(data.map((d) => d.Ticker))).filter(Boolean);
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((d) => d.Ticker === selectedTicker);
  }, [data, selectedTicker]);

  const shouldAnimate = useMemo(() => {
    return filteredData.length < 500;
  }, [filteredData]);

  const latestData = useMemo(() => {
    if (filteredData.length === 0) return null;
    return filteredData[filteredData.length - 1];
  }, [filteredData]);

  const priceChange = useMemo(() => {
    if (filteredData.length < 2) return 0;
    const latest = filteredData[filteredData.length - 1].Close;
    const previous = filteredData[filteredData.length - 2].Close;
    return ((latest - previous) / previous) * 100;
  }, [filteredData]);

  const visibleData = useMemo(() => {
    if (tkgData.length === 0) return [];
    const end = Math.min(playbackIndex + 30, tkgData.length);
    return tkgData.slice(playbackIndex, end);
  }, [tkgData, playbackIndex]);

  const searchResults = useMemo(() => {
    if (!semanticSearch) return [];
    return tkgData.reduce((acc, d, i) => {
      if (semanticsData[d.id] && semanticsData[d.id].toLowerCase().includes(semanticSearch.toLowerCase())) {
        acc.push(i);
      }
      return acc;
    }, [] as number[]);
  }, [semanticSearch, semanticsData, tkgData]);

  useEffect(() => {
    if (searchResults.length > 0) {
      const firstMatchIndex = searchResults[0];
      let newPlaybackIndex = Math.max(0, firstMatchIndex - 15);
      newPlaybackIndex = Math.min(newPlaybackIndex, Math.max(0, tkgData.length - 30));
      setPlaybackIndex(newPlaybackIndex);
      setSelectedObs(tkgData[firstMatchIndex]);
    } else {
      setSelectedObs(null);
    }
  }, [searchResults, tkgData]);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 font-sans text-zinc-900">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-zinc-500 font-medium">Checking database...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 font-sans text-zinc-900">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-semibold mb-2 tracking-tight">Stock Data Dashboard</h1>
          <p className="text-zinc-500 mb-8 text-sm">
            Upload the cleaned stock price CSV from Kaggle to view the dashboard.
            <br />
            <a 
              href="https://www.kaggle.com/datasets/myatbhoneaung/cleaned-stock-price-data-tsla-aapl-nvda?select=cleaned_stock_prices_tsla_aapl_nvda.csv"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline mt-2 inline-block"
            >
              Download dataset here
            </a>
          </p>

          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-xl p-8 transition-colors ${
              isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50'
            }`}
          >
            <UploadCloud className="w-10 h-10 text-zinc-400 mx-auto mb-4" />
            <p className="text-sm font-medium text-zinc-700 mb-1">Drag and drop your CSV here</p>
            <p className="text-xs text-zinc-500 mb-4">or click to browse files</p>
            <label className="bg-white border border-zinc-200 text-zinc-700 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-zinc-50 transition-colors shadow-sm">
              Select File
              <input type="file" accept=".csv" className="hidden" onChange={onFileInput} />
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-zinc-900 font-sans p-4 sm:p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
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
                { id: 'candlestick', label: 'Candlestick', icon: BarChart2 },
                { id: 'dashboard', label: 'Overview', icon: Activity },
                { id: 'tkg', label: 'Temporal Graph', icon: Network },
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

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {activeTab === 'candlestick' ? (
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

                  <div className="h-[600px] w-full bg-zinc-50/50 rounded-[2rem] border border-zinc-200/50 overflow-hidden relative">
                    {isLoading ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                        <p className="text-zinc-500 font-medium">Updating chart data...</p>
                      </div>
                    ) : null}
                    
                    {filteredData.length > 0 ? (
                      <Plot
                        data={[
                          {
                            x: filteredData.map(d => d.Date),
                            close: filteredData.map(d => d.Close),
                            decreasing: { line: { color: '#ef4444', width: 1.5 } },
                            high: filteredData.map(d => d.High),
                            increasing: { line: { color: '#10b981', width: 1.5 } },
                            low: filteredData.map(d => d.Low),
                            open: filteredData.map(d => d.Open),
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
                </motion.div>
              </div>
            ) : activeTab === 'tkg' ? (
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
                        <div className="flex items-center gap-4">
                          <div className="relative w-full max-w-xs">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <Search className="w-4 h-4 text-zinc-400" />
                            </div>
                            <input
                              type="text"
                              placeholder="Search semantics..."
                              value={semanticSearch}
                              onChange={(e) => setSemanticSearch(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200/50 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                            />
                          </div>
                          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Analysis Tools</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleGenerateSemantics}
                            disabled={isGeneratingSemantics || tkgData.length < 2 || tkgData.filter((d, i) => i > 0 && semanticsData[d.id]).length === Math.max(0, tkgData.length - 1)}
                            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                              Object.keys(semanticsData).length > 0 
                                ? 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100' 
                                : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'
                            } disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
                          >
                            {isGeneratingSemantics ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Code className="w-3.5 h-3.5" />
                            )}
                            {isGeneratingSemantics ? 'Analyzing Batch...' : Object.keys(semanticsData).length > 0 ? 'Generate Next Batch' : 'Generate Semantics'}
                          </button>
                          
                          {isGeneratingSemantics && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg animate-pulse">
                              <Bot className="w-3 h-3 text-indigo-600" />
                              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">AI Processing</span>
                            </div>
                          )}

                          {tkgData.length > 1 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200/50 rounded-lg">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Coverage</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-indigo-600">{tkgData.filter((d, i) => i > 0 && semanticsData[d.id]).length}</span>
                                <span className="text-xs font-medium text-zinc-400">/</span>
                                <span className="text-xs font-bold text-zinc-700">{Math.max(0, tkgData.length - 1)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-zinc-200/50 shadow-sm">
                          {[
                            { id: 'nodes', label: 'Nodes', active: showNodes, toggle: () => setShowNodes(!showNodes) },
                            { id: 'edges', label: 'Edges', active: showEdges, toggle: () => setShowEdges(!showEdges) },
                            { id: 'surface', label: 'Surface', active: showSurface, toggle: () => setShowSurface(!showSurface) },
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
                                  setTkgPage(0);
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
                        {isPlaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
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
                    
                    <div className="h-[600px] w-full rounded-[2rem] overflow-hidden relative border border-zinc-200/50 bg-white">
                      {tkgData.length > 0 ? (
                        (() => {
                          const xIndices: number[] = [];
                          const xLabels: string[] = [];
                          
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

                          const visibleData = tkgData.slice(playbackIndex, playbackIndex + 30);
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

                            xIndices.push(i);
                            xLabels.push(date);
                            
                            s_open.push(r_open);
                            s_high.push(r_high);
                            s_low.push(r_low);
                            s_ret.push(ret_close);

                            // Point 1: r_open (+Y)
                            ringX.push(i); ringY.push(r_open); ringZ.push(0); 
                            ringText.push(`Date: ${date}<br>r_open: ${r_open.toFixed(3)}`);
                            ringColor.push(0);
                            
                            // Point 2: r_high (+Z)
                            ringX.push(i); ringY.push(0); ringZ.push(r_high); 
                            ringText.push(`Date: ${date}<br>r_high: ${r_high.toFixed(3)}`);
                            ringColor.push(1);
                            
                            // Point 3: r_low (-Y)
                            ringX.push(i); ringY.push(-r_low); ringZ.push(0); 
                            ringText.push(`Date: ${date}<br>r_low: ${r_low.toFixed(3)}`);
                            ringColor.push(2);
                            
                            // Point 4: ret_close (-Z)
                            ringX.push(i); ringY.push(0); ringZ.push(-ret_close); 
                            ringText.push(`Date: ${date}<br>ret_close: ${ret_close.toFixed(3)}`);
                            ringColor.push(3);
                            
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
                            surfZ.push([0, r_high, 0, -ret_close, 0]);
                            surfColor.push([0, 1, 2, 3, 0]);
                            surfText.push([
                              `Date: ${date}<br>r_open: ${r_open.toFixed(3)}`,
                              `Date: ${date}<br>r_high: ${r_high.toFixed(3)}`,
                              `Date: ${date}<br>r_low: ${r_low.toFixed(3)}`,
                              `Date: ${date}<br>ret_close: ${ret_close.toFixed(3)}`,
                              `Date: ${date}<br>r_open: ${r_open.toFixed(3)}`
                            ]);
                          });

                          // Calculate tick intervals to avoid overlapping labels
                          const tickStep = Math.max(1, Math.ceil(visibleData.length / 8));
                          const tickVals = xIndices.filter((_, i) => i % tickStep === 0);
                          const tickText = xLabels.filter((_, i) => i % tickStep === 0);

                          const categoryColorscale = [
                            [0, '#3b82f6'],     // r_open: Blue
                            [0.3333, '#10b981'], // r_high: Green
                            [0.6666, '#f59e0b'], // r_low: Orange
                            [1, '#ef4444']      // ret_close: Red
                          ];

                          const plotData: any[] = [];

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
                              opacity: 0.8,
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
                                size: 5, 
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
                                z: s_high,
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
                                z: s_ret.map(v => -v),
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
                                semX.push(i - 0.5);
                                semY.push(0);
                                semZ.push(0);
                                semLabels.push(semanticsData[d.id]);
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
                                textposition: 'top center',
                                textfont: {
                                  family: 'Inter, sans-serif',
                                  size: 10,
                                  color: '#4f46e5'
                                },
                                hoverinfo: 'text'
                              });
                            }

                            // Highlight selected observation
                            if (selectedObs) {
                              const selIndex = visibleData.findIndex(d => d.id === selectedObs.id);
                              if (selIndex !== -1) {
                                // Highlight the "r_high" state point as the primary selection indicator
                                plotData.push({
                                  x: [selIndex],
                                  y: [0],
                                  z: [selectedObs.state_vector ? selectedObs.state_vector[1] : 0],
                                  type: 'scatter3d',
                                  mode: 'markers',
                                  name: 'Selected',
                                  marker: {
                                    size: 12,
                                    color: '#ffffff',
                                    line: { color: '#4f46e5', width: 3 },
                                    opacity: 1
                                  },
                                  hoverinfo: 'none'
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
                                  size: 14,
                                  color: '#ec4899',
                                  symbol: 'circle-open',
                                  line: { color: '#ec4899', width: 3 }
                                },
                                hoverinfo: 'none'
                              });
                            }
                          }

                          return (
                            <Plot
                              data={plotData}
                              layout={{
                                uirevision: 'true',
                                autosize: true,
                                margin: { l: 0, r: 0, b: 0, t: 0 },
                                scene: {
                                  xaxis: {
                                    title: 'Temporal Axis (Days)',
                                    tickvals: tickVals,
                                    ticktext: tickText,
                                    gridcolor: '#f1f1f4',
                                    backgroundcolor: '#ffffff',
                                    showbackground: true,
                                    titlefont: { family: 'Inter, sans-serif', size: 12, color: '#a1a1aa' },
                                    tickfont: { family: 'Inter, sans-serif', size: 10, color: '#a1a1aa' }
                                  },
                                  yaxis: {
                                    title: 'r_open / r_low',
                                    range: [-1.2, 1.2],
                                    gridcolor: '#f1f1f4',
                                    backgroundcolor: '#ffffff',
                                    showbackground: true,
                                    titlefont: { family: 'Inter, sans-serif', size: 12, color: '#a1a1aa' },
                                    tickfont: { family: 'Inter, sans-serif', size: 10, color: '#a1a1aa' }
                                  },
                                  zaxis: {
                                    title: 'r_high / ret_close',
                                    range: [-1.2, 1.2],
                                    gridcolor: '#f1f1f4',
                                    backgroundcolor: '#ffffff',
                                    showbackground: true,
                                    titlefont: { family: 'Inter, sans-serif', size: 12, color: '#a1a1aa' },
                                    tickfont: { family: 'Inter, sans-serif', size: 10, color: '#a1a1aa' }
                                  },
                                  aspectmode: 'manual',
                                  aspectratio: { x: 3, y: 1, z: 1 },
                                  camera: {
                                    eye: { x: 1.2, y: 1.5, z: 1.5 }
                                  }
                                },
                                showlegend: false,
                                paper_bgcolor: 'rgba(0,0,0,0)',
                                plot_bgcolor: 'rgba(0,0,0,0)',
                                hoverlabel: {
                                  bgcolor: '#18181b',
                                  bordercolor: '#18181b',
                                  font: { family: 'Inter, sans-serif', size: 12, color: '#ffffff' }
                                }
                              }}
                              useResizeHandler={true}
                              style={{ width: '100%', height: '100%' }}
                              config={{ displayModeBar: false }}
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
                          );
                        })()
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                          No temporal chain data available for {tkgTicker || 'this ticker'}.
                        </div>
                      )}
                    </div>
                    
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
                        className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200/50"
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

                        {semanticsData[selectedObs.id] && (
                          <div className="mt-6 bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl">
                            <span className="block text-xs font-bold text-indigo-600 uppercase mb-2">AI Insight</span>
                            <span className="text-sm font-medium text-indigo-900 leading-relaxed">{semanticsData[selectedObs.id]}</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Chat Section */}
                <div className="lg:col-span-1">
                  <div className="sticky top-8 h-[calc(100vh-8rem)] min-h-[600px] max-h-[800px] bg-white rounded-[2rem] border border-zinc-200/50 flex flex-col overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-zinc-100 flex items-center gap-3 bg-zinc-50/50 shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900">TKG Assistant</h3>
                        <p className="text-xs font-medium text-zinc-500">Ask about the current state</p>
                      </div>
                    </div>
                    
                    <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 bg-zinc-50/30">
                      {chatMessages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                          <MessageSquare className="w-8 h-8 text-zinc-300 mb-3" />
                          <p className="text-sm font-medium text-zinc-500">
                            Ask me anything about the {tkgTicker} market data currently visible in the graph.
                          </p>
                        </div>
                      ) : (
                        chatMessages.map((msg, idx) => (
                          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              msg.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-indigo-100 text-indigo-600'
                            }`}>
                              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                            <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm ${
                              msg.role === 'user' 
                                ? 'bg-zinc-900 text-white rounded-tr-sm' 
                                : 'bg-white border border-zinc-200/50 text-zinc-700 rounded-tl-sm shadow-sm'
                            }`}>
                              {msg.role === 'user' ? (
                                msg.content
                              ) : (
                                <div className="prose prose-sm prose-zinc max-w-none">
                                  <ReactMarkdown
                                    components={{
                                      a: ({ node, href, children, ...props }) => {
                                        if (href && href.startsWith('#')) {
                                          const dateStr = href.slice(1);
                                          return (
                                            <button
                                              className="text-indigo-600 hover:text-indigo-800 hover:underline font-semibold transition-colors"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                const idx = tkgData.findIndex(d => d.date === dateStr);
                                                if (idx !== -1) {
                                                  // Center the window on this index
                                                  let newPlaybackIndex = Math.max(0, idx - 15);
                                                  newPlaybackIndex = Math.min(newPlaybackIndex, Math.max(0, tkgData.length - 30));
                                                  setPlaybackIndex(newPlaybackIndex);
                                                  setSelectedObs(tkgData[idx]);
                                                }
                                              }}
                                            >
                                              {children}
                                            </button>
                                          );
                                        }
                                        return <a href={href} {...props}>{children}</a>;
                                      }
                                    }}
                                  >
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {isChatLoading && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div className="px-4 py-3 rounded-2xl bg-white border border-zinc-200/50 text-zinc-500 rounded-tl-sm shadow-sm flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs font-medium">Analyzing TKG...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-white border-t border-zinc-100 shrink-0">
                      <form onSubmit={handleChatSubmit} className="relative flex items-center">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Ask about the graph..."
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          disabled={isChatLoading}
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim() || isChatLoading}
                          className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      ) : activeTab === 'setup' ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[2.5rem] shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] border border-zinc-200/50"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Database className="w-5 h-5 text-indigo-600" />
                  </div>
                  Infrastructure Setup
                </h2>
                <p className="text-sm font-medium text-zinc-400 mt-1">
                  Provision the required Postgres schema for temporal data analysis.
                </p>
              </div>
              <CopyButton text={SQL_SETUP_SCRIPT} />
            </div>
            
            <div className="bg-zinc-900 rounded-3xl p-8 overflow-x-auto shadow-2xl">
              <pre className="text-[13px] text-zinc-300 font-mono leading-relaxed">
{SQL_SETUP_SCRIPT}
              </pre>
            </div>
          </motion.div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
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
                  icon={<BarChart2 className="w-5 h-5 text-blue-600" />}
                />
              </div>
            )}

            {/* Charts */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] border border-zinc-200/50"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-zinc-900">Market Performance</h2>
                  <p className="text-sm font-medium text-zinc-400 mt-1">Closing price and daily liquidity analysis</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-600" />
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight">Price</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-200" />
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight">Volume</span>
                  </div>
                </div>
              </div>
              <div className="h-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={filteredData} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f1f4" />
                    <XAxis 
                      dataKey="Date" 
                      tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      stroke="#a1a1aa"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={40}
                      dy={15}
                    />
                    <YAxis 
                      yAxisId="price"
                      domain={['auto', 'auto']} 
                      tickFormatter={(val) => `$${val}`}
                      stroke="#a1a1aa"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                      tickCount={6}
                      dx={-10}
                    />
                    <YAxis 
                      yAxisId="volume"
                      orientation="right"
                      domain={[0, 'dataMax * 4']}
                      hide={true}
                    />
                    <Tooltip 
                      cursor={{ stroke: '#e4e4e7', strokeWidth: 1 }}
                      contentStyle={{ 
                        borderRadius: '20px', 
                        border: '1px solid rgba(228, 228, 231, 0.5)', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)',
                        padding: '12px 16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(4px)'
                      }}
                      labelStyle={{ fontWeight: 700, color: '#18181b', marginBottom: '4px', fontSize: '13px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 500, padding: '2px 0' }}
                      labelFormatter={(val) => new Date(val).toLocaleDateString(undefined, { dateStyle: 'full' })}
                      formatter={(value: number, name: string) => {
                        if (name === 'Volume') return [`${(value / 1000000).toFixed(2)}M`, 'Volume'];
                        return [`$${value.toFixed(2)}`, 'Close'];
                      }}
                    />
                    <Bar 
                      yAxisId="volume"
                      dataKey="Volume" 
                      fill="#e0e7ff" 
                      radius={[6, 6, 0, 0]} 
                      isAnimationActive={shouldAnimate}
                      animationDuration={1500}
                    />
                    <Line 
                      yAxisId="price"
                      type="monotone" 
                      dataKey="Close" 
                      stroke="#4f46e5" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 8, fill: '#4f46e5', stroke: '#fff', strokeWidth: 3 }}
                      isAnimationActive={shouldAnimate}
                      animationDuration={1500}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  </div>
</div>
);
}

function StatCard({ title, value, trend, icon, date }: { title: string, value: string, trend?: number, icon: React.ReactNode, date?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-3xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] border border-zinc-200/60 flex flex-col group hover:shadow-md transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-5">
        <span className="text-[13px] font-semibold uppercase tracking-wider text-zinc-400">{title}</span>
        <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      </div>
      <div className="mt-auto">
        <div className="text-3xl font-bold tracking-tight text-zinc-900 mb-2">{value}</div>
        {(trend !== undefined || date) && (
          <div className="flex items-center gap-2">
            {trend !== undefined && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(2)}%
              </span>
            )}
            {date && (
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-tight">
                {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all text-xs font-medium border border-zinc-700"
    >
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy SQL'}
    </button>
  );
}

