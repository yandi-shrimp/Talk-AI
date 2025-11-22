
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { GeminiParsedResponse } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the schema for structured output
const conversationSchema = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description: "The conversational response in simple English suitable for an elementary school student.",
    },
    chinese_translation: {
      type: Type.STRING,
      description: "The Chinese translation of the English reply.",
    },
    grammar_feedback: {
      type: Type.STRING,
      description: "Gentle correction of the user's grammar if there was a mistake. Null if perfect.",
      nullable: true,
    },
    better_way_to_say: {
      type: Type.STRING,
      description: "A more natural or native way to say what the user tried to express. Null if strictly not needed.",
      nullable: true,
    },
    encouragement_score: {
      type: Type.INTEGER,
      description: "Points (1-10) based on effort and accuracy.",
    },
    suggested_replies: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 simple, short, and correct English responses the student could say next to answer your reply.",
    }
  },
  required: ["reply", "chinese_translation", "encouragement_score", "suggested_replies"],
};

export const createChatSession = (systemInstruction: string): Chat => {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: conversationSchema,
      temperature: 0.7,
    },
  });
};

export const sendMessageToGemini = async (
  chat: Chat,
  message: string
): Promise<GeminiParsedResponse | null> => {
  try {
    const response = await chat.sendMessage({ message });
    const text = response.text;
    
    if (!text) return null;

    // Parse the JSON response
    const parsedData = JSON.parse(text) as GeminiParsedResponse;
    return parsedData;
  } catch (error) {
    console.error("Error communicating with Gemini:", error);
    return null;
  }
};

// Helper to get TTS audio (using browser API for simplicity/speed in this demo)
export const speakText = (text: string) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85; // Slightly slower for kids
    
    const voices = window.speechSynthesis.getVoices();
    // Prefer a clear English voice
    const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices.find(v => v.lang === 'en-US');
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    window.speechSynthesis.cancel(); // Stop previous
    window.speechSynthesis.speak(utterance);
  }
};
