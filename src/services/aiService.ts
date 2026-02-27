import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const generateSemantics = async (
  ticker: string,
  batchData: any[],
  batchStart: number
): Promise<{ index: number; label: string }[]> => {
  const prompt = `Analyze the following sequence of stock market observations for ${ticker}. 
  For each day (except the first one), provide a short (1-3 words) semantic label that describes the transition from the previous day's state to the current day's state. 
  
  Focus on the relationships between these normalized components:
  - r_open: Normalized Open/Close ratio
  - r_high: Normalized High/Close ratio
  - r_low: Normalized Low/Close ratio
  - ret_close: Daily Close Return
  
  The label should describe how these components interact and influence the resulting state transition.
  Examples: "Open-High Divergence", "Low-Return Support", "High-Low Compression", "Return-Driven Surge", "State Convergence".
  
  Data:
  ${batchData.map((d, i) => {
    const state = d.state_vector || [0, 0, 0, 0];
    return `Day ${batchStart + i + 1} (${d.date}): r_open=${state[0].toFixed(3)}, r_high=${state[1].toFixed(3)}, r_low=${state[2].toFixed(3)}, ret_close=${state[3].toFixed(3)}`;
  }).join('\n')}
  
  Return the results as a JSON array of objects, where each object has "index" (corresponding to the Day number) and "label".`;

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

  if (!response.text) return [];
  return JSON.parse(response.text);
};

export const generateChatResponse = async (
  ticker: string,
  contextData: string,
  userMessage: string
): Promise<string> => {
  const prompt = `You are an AI assistant analyzing a Temporal Knowledge Graph (TKG) of stock market data for ${ticker}.
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

  return response.text || 'No response generated.';
};
