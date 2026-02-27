import { supabase } from './supabaseClient';
import { StockData } from '../types';

export const fetchStockData = async (): Promise<StockData[]> => {
  let allData: StockData[] = [];
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
      throw error;
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
  return allData;
};

export const saveStockData = async (data: StockData[]): Promise<void> => {
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
};
