
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { GeminiParsedResponse, VoiceGender } from "../types";

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
      description: "Points (1-10) based on effort and accuracy. Be generous.",
    },
    suggested_replies: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 simple, short, and correct English responses the student could say next to answer your reply.",
    },
    is_conversation_finished: {
      type: Type.BOOLEAN,
      description: "True if the conversation scenario has reached a natural conclusion or the user has successfully completed the task. Otherwise false.",
    }
  },
  required: ["reply", "chinese_translation", "encouragement_score", "suggested_replies", "is_conversation_finished"],
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

export const generateAvatar = async (
  scenarioTitle: string,
  description: string,
  gender: string
): Promise<string | null> => {
  try {
    const prompt = `
      Generate a cute, friendly, 3D Pixar-style avatar portrait of a ${gender} English teacher for a children's learning app.
      The character should be designed as a kind and professional teacher figure.
      Theme context: ${scenarioTitle} - ${description}.
      The character should be facing forward, looking directly at the camera, smiling warmly.
      Use a soft, bright, solid color background that matches the mood.
      Style: 3D render, cartoon, high quality, expressive eyes.
    `;

    // Use gemini-2.5-flash-image for image generation
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
    });

    // Iterate parts to find inlineData (the image)
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Failed to generate avatar:", error);
    return null;
  }
};

// Updated TTS helper
export const speakText = (
  text: string, 
  gender: VoiceGender = 'female',
  onStart?: () => void,
  onEnd?: () => void
) => {
  if ('speechSynthesis' in window) {
    // Cancel any currently playing audio
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85; // Slightly slower for kids
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    
    // Logic to select voice based on gender
    let preferredVoice = null;

    if (gender === 'male') {
      preferredVoice = voices.find(v => 
        (v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female')) || 
        v.name === 'Google US English' // Often male-ish or neutral
      ) || voices.find(v => v.lang === 'en-US');
    } else {
      preferredVoice = voices.find(v => 
        v.name.toLowerCase().includes('female') || 
        v.name.includes('Google US English') 
      ) || voices.find(v => v.lang === 'en-US');
    }

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;
    utterance.onerror = onEnd; // Ensure state resets on error

    window.speechSynthesis.speak(utterance);
  } else {
    // Fallback if TTS not supported
    if (onEnd) onEnd();
  }
};
