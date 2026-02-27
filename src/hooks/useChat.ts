import { useState } from 'react';
import { ChatMessage } from '../types';
import { generateChatResponse } from '../services/aiService';

export const useChat = (
  tkgTicker: string,
  tkgData: any[],
  playbackIndex: number,
  semanticsData: Record<string, Record<string, string>>,
  activeCategory: string
) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isChatLoading) return;

    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsChatLoading(true);

    try {
      const visibleData = tkgData.slice(playbackIndex, playbackIndex + 30);
      const contextData = visibleData.map((d: any) => {
        const state = d.state_vector || [0, 0, 0, 0];
        const sems = semanticsData[d.id] || {};
        const semStr = Object.entries(sems).map(([cat, label]) => `${cat}: ${label}`).join(', ') || 'None';
        return `Date: ${d.date}, r_open: ${state[0].toFixed(3)}, r_high: ${state[1].toFixed(3)}, r_low: ${state[2].toFixed(3)}, ret_close: ${state[3].toFixed(3)}, Semantics: ${semStr}`;
      }).join('\n');

      const response = await generateChatResponse(tkgTicker, contextData, message);
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error while processing your request.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(chatInput);
  };

  return {
    chatMessages,
    chatInput,
    setChatInput,
    isChatLoading,
    handleChatSubmit,
    sendMessage
  };
};
