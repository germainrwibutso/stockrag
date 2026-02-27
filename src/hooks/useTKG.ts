import { useState, useEffect, useMemo } from 'react';
import { Observation } from '../types';
import { fetchLatestObservations, generateTkg, fetchTkgChain, saveSemantics } from '../services/tkgService';
import { generateSemantics } from '../services/aiService';

export const useTKG = (activeTab: string) => {
  const [fullTkgData, setFullTkgData] = useState<Observation[]>([]);
  const [tkgTicker, setTkgTicker] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [tkgLoading, setTkgLoading] = useState(false);
  const [isGeneratingTkg, setIsGeneratingTkg] = useState(false);
  const [tkgGenerateStatus, setTkgGenerateStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const [semanticsData, setSemanticsData] = useState<Record<string, Record<string, string>>>({});
  const [activeSemanticCategory, setActiveSemanticCategory] = useState<string>('general');
  const [isGeneratingSemantics, setIsGeneratingSemantics] = useState(false);
  
  const [selectedObs, setSelectedObs] = useState<Observation | null>(null);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [semanticSearch, setSemanticSearch] = useState('');
  const [latestObservations, setLatestObservations] = useState<any[]>([]);
  
  const [showNodes, setShowNodes] = useState(true);
  const [showEdges, setShowEdges] = useState(true);
  const [showSurface, setShowSurface] = useState(true);
  const [showCandles, setShowCandles] = useState(false);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const tkgData = useMemo(() => {
    if (!startDate && !endDate) return fullTkgData;
    
    return fullTkgData.filter(obs => {
      const obsDate = new Date(obs.date);
      const start = startDate ? new Date(startDate) : new Date('1900-01-01');
      const end = endDate ? new Date(endDate) : new Date('2100-01-01');
      // Set end date to end of day to include the selected day
      end.setHours(23, 59, 59, 999);
      return obsDate >= start && obsDate <= end;
    });
  }, [fullTkgData, startDate, endDate]);

  // Reset playback index if out of bounds
  useEffect(() => {
    if (playbackIndex >= tkgData.length && tkgData.length > 0) {
      setPlaybackIndex(0);
    }
  }, [tkgData.length, playbackIndex]);

  // Fetch latest observations when tab becomes active
  useEffect(() => {
    if (activeTab === 'tkg') {
      const loadLatest = async () => {
        setTkgLoading(true);
        try {
          const obsData = await fetchLatestObservations();
          setLatestObservations(obsData);
          if (obsData.length > 0) {
            setTkgTicker(obsData[0].ticker);
          }
        } catch (err) {
          console.error('Error fetching TKG data:', err);
        } finally {
          setTkgLoading(false);
        }
      };
      loadLatest();
    }
  }, [activeTab]);

  // Fetch TKG chain when ticker changes or refresh is triggered
  useEffect(() => {
    if (tkgTicker) {
      const loadChain = async () => {
        try {
          const { tkgData: data, semantics } = await fetchTkgChain(tkgTicker);
          if (data.length > 0) {
            setFullTkgData(data);
            setSemanticsData(semantics);
            setPlaybackIndex(0);
            setSelectedObs(null);
            // Reset date filters when ticker changes
            setStartDate('');
            setEndDate('');
          } else {
            setFullTkgData([]);
            setSemanticsData({});
          }
        } catch (err) {
          console.error('Error fetching TKG chain:', err);
        }
      };
      loadChain();
    }
  }, [tkgTicker, refreshTrigger]);

  // Playback logic
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
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isPlaying, tkgData.length]);

  // Search logic
  const searchResults = useMemo(() => {
    if (!semanticSearch.trim()) return [];
    const term = semanticSearch.toLowerCase();
    return tkgData
      .map((d, i) => ({ id: d.id, index: i, label: semanticsData[d.id]?.[activeSemanticCategory] || '' }))
      .filter(item => item.label.toLowerCase().includes(term))
      .map(item => item.index);
  }, [semanticSearch, tkgData, semanticsData, activeSemanticCategory]);

  // Scroll to search result
  useEffect(() => {
    if (searchResults.length > 0) {
      const firstMatchIndex = searchResults[0];
      let newPlaybackIndex = Math.max(0, firstMatchIndex - 15);
      newPlaybackIndex = Math.min(newPlaybackIndex, Math.max(0, tkgData.length - 30));
      setPlaybackIndex(newPlaybackIndex);
      setSelectedObs(tkgData[firstMatchIndex]);
    }
  }, [searchResults, tkgData]);

  const handleGenerateTkg = async () => {
    setIsGeneratingTkg(true);
    setTkgGenerateStatus('idle');
    try {
      await generateTkg();
      // Refresh data
      const obsData = await fetchLatestObservations();
      setLatestObservations(obsData);
      if (obsData.length > 0) {
        setTkgTicker(obsData[0].ticker);
        setRefreshTrigger(prev => prev + 1);
      }
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

  const handleGenerateSemantics = async (category: string = 'general') => {
    if (tkgData.length < 2) return;
    setIsGeneratingSemantics(true);
    try {
      const firstMissingIndex = tkgData.findIndex((d, i) => i > 0 && !semanticsData[d.id]?.[category]);
      if (firstMissingIndex === -1) {
        setIsGeneratingSemantics(false);
        return;
      }

      const batchStart = Math.max(0, firstMissingIndex - 1);
      const batchEnd = Math.min(tkgData.length, batchStart + 151);
      const batchData = tkgData.slice(batchStart, batchEnd);

      const results = await generateSemantics(tkgTicker, batchData, batchStart, category);
      
      const insertData = results.map((res: any) => {
        const obs = tkgData[res.index - 1];
        if (!obs) return null;
        return {
          observation_id: obs.id,
          label: res.label,
          category: category
        };
      }).filter(Boolean) as { observation_id: string; label: string; category: string }[];

      if (insertData.length > 0) {
        await saveSemantics(insertData);
        
        setSemanticsData(prev => {
          const next = { ...prev };
          insertData.forEach(d => {
            if (!next[d.observation_id]) next[d.observation_id] = {};
            next[d.observation_id][d.category] = d.label;
          });
          return next;
        });
      }
    } catch (err) {
      console.error('Error generating semantics:', err);
      alert('Failed to generate semantics.');
    } finally {
      setIsGeneratingSemantics(false);
    }
  };

  return {
    tkgData,
    tkgTicker,
    setTkgTicker,
    tkgLoading,
    isGeneratingTkg,
    tkgGenerateStatus,
    semanticsData,
    activeSemanticCategory,
    setActiveSemanticCategory,
    isGeneratingSemantics,
    selectedObs,
    setSelectedObs,
    playbackIndex,
    setPlaybackIndex,
    isPlaying,
    setIsPlaying,
    semanticSearch,
    setSemanticSearch,
    searchResults,
    latestObservations,
    showNodes,
    setShowNodes,
    showEdges,
    setShowEdges,
    showSurface,
    setShowSurface,
    showCandles,
    setShowCandles,
    handleGenerateTkg,
    handleGenerateSemantics,
    startDate,
    setStartDate,
    endDate,
    setEndDate
  };
};
