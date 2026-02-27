import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { StockData } from '../types';
import { fetchStockData, saveStockData } from '../services/stockDataService';

export const useStockData = () => {
  const [data, setData] = useState<StockData[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'local' | 'supabase'>('local');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const allData = await fetchStockData();
        if (allData.length > 0) {
          setData(allData);
          setDataSource('supabase');
          const tickers = Array.from(new Set(allData.map((d) => d.Ticker))).filter(Boolean) as string[];
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

    loadInitialData();
  }, []);

  const handleSaveToSupabase = async () => {
    if (data.length === 0) return;
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await saveStockData(data);
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
        const sortedData = parsedData.sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
        setData(sortedData);
        setDataSource('local');
        
        const tickers = Array.from(new Set(sortedData.map((d) => d.Ticker))).filter(Boolean);
        if (tickers.length > 0) {
          setSelectedTicker(tickers[0]);
        }
      },
    });
  };

  const tickers = useMemo(() => {
    return Array.from(new Set(data.map((d) => d.Ticker))).filter(Boolean);
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((d) => d.Ticker === selectedTicker);
  }, [data, selectedTicker]);

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

  return {
    data,
    selectedTicker,
    isLoading,
    isSaving,
    saveStatus,
    isInitialLoading,
    dataSource,
    handleSaveToSupabase,
    handleTickerChange,
    handleFileUpload,
    tickers,
    filteredData,
    latestData,
    priceChange
  };
};
