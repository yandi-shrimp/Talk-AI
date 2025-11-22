
import React, { useState, useEffect, useRef } from 'react';
import { SCENARIOS, LEVELS } from './constants';
import { Role, ChatMessage, Scenario, UserStats, DifficultyLevel, VoiceGender } from './types';
import { createChatSession, sendMessageToGemini, speakText, generateAvatar } from './services/geminiService';
import SceneCard from './components/SceneCard';
import ChatBubble from './components/ChatBubble';
import Avatar from './components/Avatar';
import { Mic, Send, ChevronLeft, Trophy, Star, Sparkles, X, Home, RotateCcw, ChevronDown, Map, Settings, Volume2, User } from 'lucide-react';
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
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Settings State
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('female');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Points State
  const [sessionPoints, setSessionPoints] = useState(0);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
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
  }, [messages, hintsVisible]);

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
    setSessionPoints(0);
    setShowCompletionModal(false);
    setIsLoading(true);
    setHintsVisible(false);
    clearInactivityTimer();
    setIsAiSpeaking(false);
    setAvatarUrl(null); // Reset avatar image

    // 1. Generate Avatar in background
    generateAvatar(scenario.title, scenario.description, voiceGender)
      .then(url => {
        if (url) setAvatarUrl(url);
      });

    // 2. Prepare Chat
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
      8. Set 'is_conversation_finished' to true if the conversation has reached a natural conclusion (e.g. the user successfully ordered food, or introduced themselves) OR if the conversation has gone on for more than 8 turns.
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
        speakText(
          response.reply, 
          voiceGender,
          () => setIsAiSpeaking(true),
          () => setIsAiSpeaking(false)
        );
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
    // Stop any current speech
    window.speechSynthesis.cancel();
    setIsAiSpeaking(false);

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
        const earnedPoints = data.encouragement_score || 2;
        
        // Update User Message with corrections AND SCORE
        setMessages(prev => prev.map(m => 
          m.id === userMsgId 
            ? { 
                ...m, 
                correction: data.grammar_feedback || undefined, 
                betterWay: data.better_way_to_say || undefined,
                score: earnedPoints
              } 
            : m
        ));

        // Check for "Wrong Answer" or low score (<= 5)
        const isLowScore = earnedPoints <= 5;

        // Add AI Response
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: Role.MODEL,
          text: data.reply,
          translation: data.chinese_translation,
          hints: data.suggested_replies
        };
        setMessages(prev => [...prev, aiMsg]);
        
        speakText(
          data.reply, 
          voiceGender,
          () => setIsAiSpeaking(true),
          () => setIsAiSpeaking(false)
        );

        // Update Session and Global Stats
        setSessionPoints(prev => prev + earnedPoints);
        
        const currentTotalPoints = stats.points + earnedPoints;
        let finalTotalPoints = currentTotalPoints;
        
        if (data.is_conversation_finished) {
          const completionBonus = 50;
          finalTotalPoints += completionBonus;
          setSessionPoints(prev => prev + completionBonus); // Add bonus to session view
          setShowCompletionModal(true);
          clearInactivityTimer();
        } else {
           if (isLowScore) {
            setHintsVisible(true);
          } else {
            startInactivityTimer();
          }
        }

        const newLevel = Math.floor(finalTotalPoints / 100) + 1;
        setStats(prev => ({
          ...prev,
          points: finalTotalPoints,
          level: newLevel
        }));

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
    // Stop AI speech if user interrupts
    window.speechSynthesis.cancel();
    setIsAiSpeaking(false);

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

  const renderSettingsModal = () => {
    if (!showSettingsModal) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in">
        <div className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl relative">
           <button 
            onClick={() => setShowSettingsModal(false)}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600"
           >
             <X size={24} />
           </button>

           <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
             <Settings className="text-blue-500" /> Settings
           </h3>

           <div className="mb-6">
             <label className="block text-gray-500 text-sm font-bold uppercase tracking-wide mb-3">
               Voice Preference
             </label>
             <div className="grid grid-cols-2 gap-3">
               <button 
                 onClick={() => {
                   setVoiceGender('female');
                   window.speechSynthesis.cancel();
                   speakText("Hello! I am your English teacher.", 'female');
                 }}
                 className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all
                 ${voiceGender === 'female' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-100 hover:border-pink-200'}`}
               >
                 <User size={28} />
                 <span className="font-bold">Female</span>
               </button>

               <button 
                 onClick={() => {
                   setVoiceGender('male');
                   window.speechSynthesis.cancel();
                   speakText("Hello! I am your English friend.", 'male');
                 }}
                 className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all
                 ${voiceGender === 'male' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-blue-200'}`}
               >
                 <User size={28} />
                 <span className="font-bold">Male</span>
               </button>
             </div>
           </div>

           <button 
             onClick={() => setShowSettingsModal(false)}
             className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
           >
             Done
           </button>
        </div>
      </div>
    );
  };

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

  const renderCompletionModal = () => {
    if (!showCompletionModal) return null;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
         <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-yellow-50/50 to-transparent -z-10"></div>
            
            <div className="inline-flex items-center justify-center p-4 bg-yellow-100 text-yellow-500 rounded-full mb-6 shadow-inner">
              <Trophy size={48} />
            </div>
            
            <h2 className="text-3xl font-black text-gray-800 mb-2 font-comic">Awesome Job!</h2>
            <p className="text-gray-500 mb-8">You completed the conversation!</p>
            
            <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 mb-8">
              <div className="text-sm text-yellow-600 font-bold uppercase tracking-wider mb-1">Total Points Earned</div>
              <div className="text-4xl font-black text-yellow-500 flex items-center justify-center gap-2">
                 +{sessionPoints} <Star fill="currentColor" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                   if (activeScenario) startScenario(activeScenario, activeDifficulty);
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors"
              >
                <RotateCcw size={20} className="mb-1"/>
                Again
              </button>
              <button 
                onClick={() => setView('home')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors shadow-lg shadow-blue-200"
              >
                <Home size={20} className="mb-1"/>
                Menu
              </button>
            </div>
         </div>
      </div>
    );
  };

  const renderHome = () => {
    const featuredScenarios = SCENARIOS.slice(0, 4);
    const otherScenarios = SCENARIOS.slice(4);

    return (
      <div className="max-w-4xl mx-auto px-6 py-10 relative">
        {renderDifficultyModal()}
        {renderSettingsModal()}
        
        {/* Header Bar with Settings */}
        <div className="flex justify-between items-start mb-6">
           <div className="w-10"></div> {/* Spacer */}
           <div className="bg-blue-600 text-white p-4 rounded-full shadow-lg flex items-center justify-center">
              <Sparkles size={32} />
           </div>
           <button 
             onClick={() => setShowSettingsModal(true)}
             className="p-3 bg-white rounded-full shadow-md hover:bg-gray-50 text-gray-600 transition-all"
           >
             <Settings size={24} />
           </button>
        </div>

        <header className="flex flex-col items-center mb-12 text-center">
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

        <h2 className="text-2xl font-bold text-gray-800 mb-6 px-2">Featured Adventures</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {featuredScenarios.map(scene => (
            <SceneCard key={scene.id} scenario={scene} onClick={handleScenarioSelect} />
          ))}
        </div>

        {/* Dropdown for More Scenarios */}
        <div className="bg-white rounded-3xl shadow-lg p-1 border border-gray-100">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Map size={20} className="text-blue-500" />
            </div>
            <select
              onChange={(e) => {
                const selected = SCENARIOS.find(s => s.id === e.target.value);
                if (selected) {
                  handleScenarioSelect(selected);
                  e.target.value = ""; // Reset to default
                }
              }}
              defaultValue=""
              className="block w-full pl-12 pr-12 py-4 text-lg font-bold text-gray-700 bg-transparent rounded-2xl cursor-pointer focus:outline-none focus:bg-gray-50 hover:bg-gray-50 transition-colors appearance-none"
            >
              <option value="" disabled>✨ Tap to explore more adventures...</option>
              {otherScenarios.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.emoji} {scene.title}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <ChevronDown size={20} className="text-gray-400" />
            </div>
          </div>
        </div>
        <div className="h-20"></div>
      </div>
    );
  };

  const renderChat = () => (
    <div className="flex flex-col h-screen bg-gray-50 max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
      {renderCompletionModal()}
      
      {/* Header */}
      <div className={`p-4 text-white flex items-center justify-between shadow-md z-10 relative ${activeScenario?.color || 'bg-blue-500'}`}>
        <button 
          onClick={() => {
            clearInactivityTimer();
            window.speechSynthesis.cancel();
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
             <span className="text-xs opacity-90 flex items-center gap-1">
                Points: {sessionPoints} <Star size={10} fill="currentColor"/>
             </span>
          </div>
        </div>
        <div className="w-10"></div> {/* Spacer for center alignment */}
      </div>

      {/* AI Avatar Display */}
      <div className="bg-white border-b border-gray-100 shadow-sm pb-2">
        <Avatar 
          scenario={activeScenario}
          isSpeaking={isAiSpeaking}
          isLoading={isLoading}
          gender={voiceGender}
          imageUrl={avatarUrl}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <div className="space-y-4 pb-24">
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
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 w-full bg-white p-4 border-t border-gray-100 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
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
              className="w-full bg-transparent border-none focus:ring-0 px-4 py-3 resize-none max-h-24 outline-none text-gray-700 placeholder-gray-400"
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
