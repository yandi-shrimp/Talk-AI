
import React, { useState } from 'react';
import { ChatMessage, Role } from '../types';
import { speakText } from '../services/geminiService';
import { Volume2, Info, Globe, Lightbulb } from 'lucide-react';

interface ChatBubbleProps {
  message: ChatMessage;
  showHints?: boolean;
  onHintClick?: (hint: string) => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, showHints = false, onHintClick }) => {
  const isUser = message.role === Role.USER;
  const [showTranslation, setShowTranslation] = useState(false);

  const handlePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    speakText(message.text);
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* The Bubble */}
        <div 
          className={`relative px-6 py-4 rounded-3xl text-lg leading-relaxed shadow-sm group
          ${isUser 
            ? 'bg-blue-500 text-white rounded-tr-none' 
            : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
          }`}
        >
          {message.text}

          {/* Audio Button */}
          {!isUser && (
             <button 
               onClick={handlePlayAudio}
               className="absolute -right-10 top-2 p-2 bg-white rounded-full shadow-sm text-blue-500 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
               aria-label="Play audio"
             >
               <Volume2 size={18} />
             </button>
          )}
        </div>

        {/* Suggested Hints (Gray Text) */}
        {!isUser && showHints && message.hints && message.hints.length > 0 && (
           <div className="mt-3 w-full animate-fade-in">
             <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 ml-1">
               <Lightbulb size={12} />
               <span>Try saying:</span>
             </div>
             <div className="flex flex-col gap-2">
               {message.hints.map((hint, idx) => (
                 <button 
                   key={idx}
                   onClick={() => onHintClick?.(hint)}
                   className="text-left text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 border border-transparent hover:border-blue-100 px-4 py-2 rounded-xl text-base transition-all duration-200"
                 >
                   {hint}
                 </button>
               ))}
             </div>
           </div>
        )}

        {/* User Feedback (Grammar/Better way) */}
        {isUser && (message.correction || message.betterWay) && (
          <div className="mt-2 p-3 bg-yellow-50 rounded-xl border border-yellow-100 text-sm text-gray-700 w-full animate-fade-in">
            {message.correction && (
              <div className="flex items-start gap-2 mb-1">
                <Info className="text-orange-500 mt-0.5 shrink-0" size={14} />
                <span><span className="font-bold text-orange-600">Correction:</span> {message.correction}</span>
              </div>
            )}
            {message.betterWay && (
              <div className="flex items-start gap-2">
                <span className="text-green-500 font-bold shrink-0">Tip:</span>
                <span className="italic">"{message.betterWay}"</span>
              </div>
            )}
          </div>
        )}

        {/* Translation Toggle for AI Messages */}
        {!isUser && message.translation && (
          <div className="mt-2 ml-2">
            <button 
              onClick={() => setShowTranslation(!showTranslation)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
            >
              <Globe size={12} />
              {showTranslation ? 'Hide Translation' : 'Show Translation'}
            </button>
            {showTranslation && (
              <p className="mt-1 text-sm text-gray-500 bg-gray-50 p-2 rounded-lg">
                {message.translation}
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default ChatBubble;
