
import React, { useState, useEffect, useRef } from 'react';
import { SCENARIOS, LEVELS } from './constants';
import { Role, ChatMessage, Scenario, UserStats, DifficultyLevel } from './types';
import { createChatSession, sendMessageToGemini, speakText } from './services/geminiService';
import SceneCard from './components/SceneCard';
import ChatBubble from './components/ChatBubble';
import { Mic, Send, ChevronLeft, Trophy, Star, Sparkles, X } from 'lucide-react';
import { Chat } from '@google/genai';

// Polyfill for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  // --- State ---
  const [view, setView] = useState<'home' | 'chat'>('home');
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<DifficultyLevel>('Easy');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Hint State
  const [hintsVisible, setHintsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal State
  const [pendingScenario, setPendingScenario] = useState<Scenario | null>(null);
  
  // Stats
  const [stats, setStats] = useState<UserStats>({
    points: 0,
    level: 1,
    streak: 1,
    badges: []
  });

  // Refs
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, hintsVisible]); // Also scroll when hints appear

  // --- Logic ---

  const clearInactivityTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startInactivityTimer = () => {
    clearInactivityTimer();
    // If no answer after 30 seconds, show hints
    timerRef.current = setTimeout(() => {
      setHintsVisible(true);
    }, 30000);
  };

  const handleScenarioSelect = (scenario: Scenario) => {
    setPendingScenario(scenario);
  };

  const startScenario = async (scenario: Scenario, difficulty: DifficultyLevel) => {
    setActiveScenario(scenario);
    setActiveDifficulty(difficulty);
    setPendingScenario(null);
    setView('chat');
    setMessages([]);
    setIsLoading(true);
    setHintsVisible(false);
    clearInactivityTimer();

    let difficultyInstruction = "";
    if (difficulty === 'Easy') {
      difficultyInstruction = "Level: Beginner (A1). Use very short, simple sentences (3-8 words). Use basic vocabulary. Be very slow and encouraging.";
    } else if (difficulty === 'Medium') {
      difficultyInstruction = "Level: Intermediate (A2). Use complete sentences. Introduce 1-2 new words naturally. Correct grammar gently.";
    } else {
      difficultyInstruction = "Level: Advanced (B1). Use natural, flowing conversation with some idioms. Speak at a normal pace. Correct mistakes clearly.";
    }

    // Prepare system instruction based on scenario
    const instruction = `
      You are a friendly, energetic English teacher role-playing a scenario with a young student (Age 7-12).
      Scenario: ${scenario.title}.
      Description: ${scenario.description}.
      Your Role: ${scenario.title === 'Food' ? 'Waiter' : 'Friend'}.
      
      DIFFICULTY SETTING: ${difficulty}
      ${difficultyInstruction}
      
      Rules:
      1. Adhere strictly to the sentence length and vocabulary constraints of the DIFFICULTY SETTING.
      2. Be very encouraging.
      3. Always correct significant grammar mistakes gently in the 'grammar_feedback' field.
      4. If the user uses Chinese, encourage them to use English but answer them in English.
      5. Maintain the persona of the scenario.
      6. Provide the 'chinese_translation' for your reply.
      7. ALWAYS provide 3 'suggested_replies' that the student could say next.
    `;

    try {
      chatSessionRef.current = createChatSession(instruction);
      
      // Initial greeting from AI
      const initialPrompt = `Start the conversation as defined in the system prompt. 
      The context is: "${scenario.initialPrompt}". 
      Adapt this opening line to match the ${difficulty} difficulty level.`;

      const response = await sendMessageToGemini(chatSessionRef.current, initialPrompt);
      
      if (response) {
        const initialMsg: ChatMessage = {
          id: Date.now().toString(),
          role: Role.MODEL,
          text: response.reply,
          translation: response.chinese_translation,
          hints: response.suggested_replies
        };
        setMessages([initialMsg]);
        speakText(response.reply);
        startInactivityTimer(); // Start timer for the first message
      }
    } catch (e) {
      console.error("Failed to start chat", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || inputValue;
    if (!textToSend.trim() || !chatSessionRef.current || isLoading) return;

    // Stop timer and hide hints when user acts
    clearInactivityTimer();
    setHintsVisible(false);
    
    setInputValue('');
    setIsLoading(true);

    // Add User Message immediately
    const userMsgId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: Role.USER,
      text: textToSend
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const data = await sendMessageToGemini(chatSessionRef.current, textToSend);
      
      if (data) {
        // Update User Message with corrections if any
        setMessages(prev => prev.map(m => 
          m.id === userMsgId 
            ? { ...m, correction: data.grammar_feedback || undefined, betterWay: data.better_way_to_say || undefined } 
            : m
        ));

        // Check for "Wrong Answer" or low score (<= 5)
        // If score is low, we show hints immediately for the NEXT message
        const isLowScore = data.encouragement_score <= 5;

        // Add AI Response
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: Role.MODEL,
          text: data.reply,
          translation: data.chinese_translation,
          hints: data.suggested_replies
        };
        setMessages(prev => [...prev, aiMsg]);
        speakText(data.reply);

        // Update Stats
        const newPoints = stats.points + (data.encouragement_score || 2);
        const newLevel = Math.floor(newPoints / 100) + 1;
        setStats(prev => ({
          ...prev,
          points: newPoints,
          level: newLevel
        }));

        if (isLowScore) {
          // Show hints immediately if user struggled
          setHintsVisible(true);
        } else {
          // Otherwise wait for timeout
          startInactivityTimer();
        }
      }
    } catch (e) {
      console.error("Error sending message", e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // Clear timer if user starts speaking
    clearInactivityTimer();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice recognition. Please try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech error", event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
    };

    recognition.start();
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearInactivityTimer();
  }, []);

  // --- UI Renderers ---

  const renderDifficultyModal = () => {
    if (!pendingScenario) return null;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl transform transition-all scale-100 relative overflow-hidden">
          {/* Decorative bg */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50 to-transparent -z-10"></div>
          
          <button 
            onClick={() => setPendingScenario(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>

          <div className="text-center mb-8 mt-2">
            <div className="text-4xl mb-2">{pendingScenario.emoji}</div>
            <h3 className="text-2xl font-bold text-gray-800 font-comic">Choose Difficulty</h3>
            <p className="text-gray-500">How do you want to practice today?</p>
          </div>
          
          <div className="space-y-3">
            <button onClick={() => startScenario(pendingScenario, 'Easy')} className="w-full p-4 rounded-2xl border-2 border-green-100 bg-green-50 hover:bg-green-100 hover:border-green-300 transition-all flex items-center gap-4 group relative overflow-hidden">
               <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">🌱</div>
               <div className="text-left z-10">
                 <div className="font-bold text-green-800 text-lg">Easy</div>
                 <div className="text-xs text-green-600 font-medium">Simple words, slow pace</div>
               </div>
            </button>
            
            <button onClick={() => startScenario(pendingScenario, 'Medium')} className="w-full p-4 rounded-2xl border-2 border-yellow-100 bg-yellow-50 hover:bg-yellow-100 hover:border-yellow-300 transition-all flex items-center gap-4 group relative overflow-hidden">
               <div className="w-12 h-12 rounded-full bg-yellow-200 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">🌟</div>
               <div className="text-left z-10">
                 <div className="font-bold text-yellow-800 text-lg">Medium</div>
                 <div className="text-xs text-yellow-600 font-medium">Normal conversation</div>
               </div>
            </button>
            
            <button onClick={() => startScenario(pendingScenario, 'Hard')} className="w-full p-4 rounded-2xl border-2 border-red-100 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all flex items-center gap-4 group relative overflow-hidden">
               <div className="w-12 h-12 rounded-full bg-red-200 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">🔥</div>
               <div className="text-left z-10">
                 <div className="font-bold text-red-800 text-lg">Hard</div>
                 <div className="text-xs text-red-600 font-medium">Complex & fast</div>
               </div>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderHome = () => (
    <div className="max-w-4xl mx-auto px-6 py-10 relative">
      {renderDifficultyModal()}
      
      <header className="flex flex-col items-center mb-12 text-center">
        <div className="bg-blue-600 text-white p-4 rounded-full mb-4 shadow-lg">
          <Sparkles size={40} />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-800 mb-2 font-comic tracking-tight">
          JuniorTalk AI
        </h1>
        <p className="text-lg text-gray-600">Pick a fun adventure and let's speak English!</p>
      </header>

      {/* Stats Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex justify-around items-center mb-10">
        <div className="text-center">
          <div className="text-sm text-gray-400 font-bold uppercase">Level</div>
          <div className="text-3xl font-black text-blue-600">{stats.level}</div>
          <div className="text-xs text-gray-500">{LEVELS.find(l => stats.points >= l.threshold)?.name}</div>
        </div>
        <div className="h-10 w-px bg-gray-200"></div>
        <div className="text-center">
          <div className="text-sm text-gray-400 font-bold uppercase">Points</div>
          <div className="text-3xl font-black text-yellow-500 flex items-center justify-center gap-1">
             {stats.points} <Star size={20} fill="currentColor" />
          </div>
        </div>
        <div className="h-10 w-px bg-gray-200"></div>
        <div className="text-center">
          <div className="text-sm text-gray-400 font-bold uppercase">Streak</div>
          <div className="text-3xl font-black text-green-500">{stats.streak} 🔥</div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-6 px-2">Choose Your Adventure</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SCENARIOS.map(scene => (
          <SceneCard key={scene.id} scenario={scene} onClick={handleScenarioSelect} />
        ))}
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-screen bg-gray-50 max-w-2xl mx-auto shadow-2xl relative">
      {/* Header */}
      <div className={`p-4 text-white flex items-center justify-between shadow-md z-10 ${activeScenario?.color || 'bg-blue-500'}`}>
        <button 
          onClick={() => {
            clearInactivityTimer();
            setView('home');
          }}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-bold text-lg">{activeScenario?.title}</span>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">
               {activeDifficulty} Mode
             </span>
             <span className="text-xs opacity-90">Points: {stats.points}</span>
          </div>
        </div>
        <div className="w-10"></div> {/* Spacer for center alignment */}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <div className="space-y-2 pb-20">
          {messages.map((msg, index) => {
            const isLastMessage = index === messages.length - 1;
            const showHintsForThisMessage = isLastMessage && hintsVisible && msg.role === Role.MODEL;
            
            return (
              <ChatBubble 
                key={msg.id} 
                message={msg} 
                showHints={showHintsForThisMessage}
                onHintClick={(hint) => handleSendMessage(hint)}
              />
            );
          })}
          {isLoading && (
            <div className="flex justify-start w-full animate-pulse">
              <div className="bg-gray-200 rounded-full h-8 w-16 flex items-center justify-center">
                <span className="text-gray-400 text-2xl pb-2">...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 w-full bg-white p-4 border-t border-gray-100 rounded-t-3xl">
        <div className="flex gap-2 items-end">
           {/* Mic Button */}
           <button
            onClick={toggleListening}
            className={`p-4 rounded-full shadow-lg transition-all duration-300 shrink-0 mb-1
              ${isListening 
                ? 'bg-red-500 text-white animate-pulse scale-110' 
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
          >
            <Mic size={24} />
          </button>

          {/* Text Input */}
          <div className="flex-1 bg-gray-100 rounded-2xl p-1 flex items-center focus-within:ring-2 ring-blue-200 transition-all">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Say something or type here..."
              className="w-full bg-transparent border-none focus:ring-0 px-4 py-3 resize-none max-h-24 outline-none text-gray-700"
              rows={1}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95 mb-1"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">Tap the mic to speak!</p>
      </div>
    </div>
  );

  return view === 'home' ? renderHome() : renderChat();
}
