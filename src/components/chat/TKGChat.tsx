import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, MessageSquare, Loader2, Send, RefreshCw } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { Observation } from '../../types';

interface TKGChatProps {
  tkgTicker: string;
  tkgData: Observation[];
  playbackIndex: number;
  semanticsData: Record<string, Record<string, string>>;
  activeCategory: string;
  setPlaybackIndex: (index: number) => void;
  setSelectedObs: (obs: Observation) => void;
}

const TKGChat: React.FC<TKGChatProps> = ({ 
  tkgTicker, 
  tkgData, 
  playbackIndex, 
  semanticsData,
  activeCategory,
  setPlaybackIndex,
  setSelectedObs
}) => {
  const { chatMessages, chatInput, setChatInput, isChatLoading, handleChatSubmit, sendMessage } = useChat(
    tkgTicker,
    tkgData,
    playbackIndex,
    semanticsData,
    activeCategory
  );

  const [presetQuestions, setPresetQuestions] = React.useState<string[]>([]);

  const questionPool = [
    `What is the trend of r_open for ${tkgTicker}?`,
    "Are there any anomalies in the visible data?",
    "Explain the relationship between r_high and ret_close.",
    "What happened on the date with the highest volatility?",
    "Summarize the market behavior for this period.",
    "Show me the days with negative returns.",
    "Is there a correlation between low and close returns?",
    "Identify any structural breaks in the time series.",
    "What is the significance of the current semantic labels?",
    "Compare the volatility of the first and last 5 days.",
    "What are the key events driving the price changes?",
    "Describe the distribution of returns in this window.",
    "Are there any recurring patterns in the data?",
    "What is the maximum drawdown in the current view?",
    "Analyze the momentum of the stock."
  ];

  const generateNewQuestions = () => {
    const shuffled = [...questionPool].sort(() => 0.5 - Math.random());
    setPresetQuestions(shuffled.slice(0, 5));
  };

  React.useEffect(() => {
    generateNewQuestions();
  }, [tkgTicker]);

  return (
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
      
      <div className="flex-1 p-6 pb-20 overflow-y-auto flex flex-col gap-4 bg-zinc-50/30">
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

      <div className="px-4 py-3 flex flex-wrap gap-2 bg-white border-t border-zinc-100 shrink-0">
        {presetQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => sendMessage(q)}
            disabled={isChatLoading}
            className="text-xs bg-white hover:bg-zinc-50 text-zinc-600 px-3 py-1.5 rounded-full transition-colors border border-zinc-200 shadow-sm disabled:opacity-50"
          >
            {q}
          </button>
        ))}
        <button
          onClick={generateNewQuestions}
          disabled={isChatLoading}
          className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full transition-colors border border-indigo-100 flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className="w-3 h-3" />
          New
        </button>
      </div>

      <div className="p-4 bg-white shrink-0">
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
  );
};

export default TKGChat;
