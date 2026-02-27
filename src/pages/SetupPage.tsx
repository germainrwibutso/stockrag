import React from 'react';
import { motion } from 'motion/react';
import { Database } from 'lucide-react';
import CopyButton from '../components/ui/CopyButton';

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
    
    INSERT INTO observations (ticker, date, open, high, low, close, volume, state_vector, ret_close, ret_volume)
    SELECT 
        ticker,
        date,
        open,
        high,
        low,
        close,
        volume,
        jsonb_build_array(
            CASE WHEN close = 0 THEN 0 ELSE (open - close) / close END,
            CASE WHEN close = 0 THEN 0 ELSE (high - close) / close END,
            CASE WHEN close = 0 THEN 0 ELSE (low - close) / close END,
            CASE 
                WHEN LAG(close) OVER (PARTITION BY ticker ORDER BY date) IS NULL THEN 0 
                ELSE (close - LAG(close) OVER (PARTITION BY ticker ORDER BY date)) / LAG(close) OVER (PARTITION BY ticker ORDER BY date)
            END
        ) as state_vector,
        CASE 
            WHEN LAG(close) OVER (PARTITION BY ticker ORDER BY date) IS NULL THEN 0 
            ELSE (close - LAG(close) OVER (PARTITION BY ticker ORDER BY date)) / LAG(close) OVER (PARTITION BY ticker ORDER BY date)
        END as ret_close,
        CASE 
            WHEN LAG(volume) OVER (PARTITION BY ticker ORDER BY date) IS NULL THEN 0 
            ELSE (volume - LAG(volume) OVER (PARTITION BY ticker ORDER BY date))::numeric / LAG(volume) OVER (PARTITION BY ticker ORDER BY date)::numeric
        END as ret_volume
    FROM stock_data
    ORDER BY ticker, date;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to get latest observations
DROP FUNCTION IF EXISTS get_latest_observations();
CREATE OR REPLACE FUNCTION get_latest_observations()
RETURNS TABLE (
  ticker text,
  last_date date,
  count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.ticker,
    MAX(o.date) as last_date,
    COUNT(*) as count
  FROM observations o
  GROUP BY o.ticker
  ORDER BY o.ticker;
END;
$$ LANGUAGE plpgsql;

-- 5. Semantic Relationships Table
CREATE TABLE semantic_relationships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  observation_id uuid REFERENCES observations(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  label text NOT NULL,
  confidence numeric DEFAULT 1.0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(observation_id, category)
);

-- 6. RLS Policies
ALTER TABLE stock_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public inserts" ON stock_data;
CREATE POLICY "Allow public inserts" ON stock_data FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public reads" ON stock_data;
CREATE POLICY "Allow public reads" ON stock_data FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public inserts" ON observations;
CREATE POLICY "Allow public inserts" ON observations FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public reads" ON observations;
CREATE POLICY "Allow public reads" ON observations FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public all" ON semantic_relationships;
CREATE POLICY "Allow public all" ON semantic_relationships FOR ALL TO public USING (true) WITH CHECK (true);`;

const SetupPage = () => {
  return (
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
    </div>
  );
};

export default SetupPage;
