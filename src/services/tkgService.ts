import { supabase } from './supabaseClient';
import { Observation } from '../types';

export const fetchLatestObservations = async (): Promise<any[]> => {
  const { data, error } = await supabase.rpc('get_latest_observations');
  if (error) throw error;
  return data || [];
};

export const generateTkg = async (): Promise<void> => {
  const { error } = await supabase.rpc('generate_tkg');
  if (error) throw error;
};

export const fetchTkgChain = async (ticker: string): Promise<{ tkgData: Observation[], semantics: Record<string, Record<string, string>> }> => {
  let allData: any[] = [];
  let from = 0;
  const step = 1000;
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
        semantic_relationships ( label, category )
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

  const semMap: Record<string, Record<string, string>> = {};
  if (allData.length > 0) {
    allData.forEach((d: any) => {
      if (d.semantic_relationships) {
        const relationships = Array.isArray(d.semantic_relationships) ? d.semantic_relationships : [d.semantic_relationships];
        relationships.forEach((rel: any) => {
          if (rel && rel.label) {
            if (!semMap[d.id]) semMap[d.id] = {};
            semMap[d.id][rel.category || 'general'] = rel.label;
          }
        });
      }
    });
  }

  return { tkgData: allData, semantics: semMap };
};

export const saveSemantics = async (semantics: { observation_id: string; label: string; category: string }[]): Promise<void> => {
  const { error } = await supabase
    .from('semantic_relationships')
    .upsert(semantics, { onConflict: 'observation_id,category' });
  if (error) throw error;
};
