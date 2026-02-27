export type StockData = {
  Date: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
  Ticker: string;
};

export type Observation = {
  id: string;
  ticker: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  state_vector: number[];
  ret_close: number;
  ret_volume: number;
  created_at: string;
  semantic_relationships?: { label: string; category: string }[];
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};
