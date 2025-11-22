
import React from 'react';
import { Scenario, VoiceGender } from '../types';

interface AvatarProps {
  scenario: Scenario | null;
  isSpeaking: boolean;
  isLoading: boolean;
  gender: VoiceGender;
  imageUrl?: string | null;
}

const Avatar: React.FC<AvatarProps> = ({ scenario, isSpeaking, isLoading, gender, imageUrl }) => {
  const emoji = scenario?.emoji || '🤖';
  const bgColor = scenario?.color || 'bg-blue-500';

  return (
    <div className="flex flex-col items-center justify-center py-6 relative z-0">
      {/* Outer Ring / Aura */}
      <div className={`relative rounded-full p-1 transition-all duration-500
        ${isSpeaking ? 'scale-105' : 'scale-100'}
      `}>
        {/* Pulsing effect when speaking */}
        {isSpeaking && (
          <span className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping"></span>
        )}
        
        {/* Main Avatar Container */}
        <div className={`
          relative w-36 h-36 rounded-full flex items-center justify-center shadow-2xl border-4 border-white
          ${bgColor} bg-opacity-20 backdrop-blur-sm overflow-hidden
          transition-all duration-300
        `}>
          
          {imageUrl ? (
            // Generated Image
            <img 
              src={imageUrl} 
              alt="AI Character" 
              className={`w-full h-full object-cover transition-transform duration-700 ${isSpeaking ? 'scale-110' : 'scale-100'}`}
            />
          ) : (
            // Fallback Emoji
            <>
              <div className="absolute bottom-0 w-28 h-14 bg-white/30 rounded-t-full translate-y-1"></div>
              <div className={`text-7xl z-10 drop-shadow-md transition-transform duration-200 ${isSpeaking ? 'animate-bounce-slight' : ''}`}>
                {emoji}
              </div>
            </>
          )}

          {/* Thinking Indicator (Small bubbles) */}
          {isLoading && (
            <div className="absolute -top-2 -right-2 flex space-x-1 bg-white px-3 py-2 rounded-full shadow-lg animate-pulse z-20">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
            </div>
          )}

          {/* Speaking Mouth/Audio Visualizer (Simple overlay) */}
          {isSpeaking && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-end justify-center gap-0.5 h-4 z-20">
              <div className="w-1 bg-white/90 rounded-full animate-wave h-full"></div>
              <div className="w-1 bg-white/90 rounded-full animate-wave delay-75 h-2/3"></div>
              <div className="w-1 bg-white/90 rounded-full animate-wave delay-150 h-full"></div>
              <div className="w-1 bg-white/90 rounded-full animate-wave delay-100 h-1/2"></div>
            </div>
          )}
        </div>

        {/* Name Tag */}
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white shadow-md px-4 py-1 rounded-full whitespace-nowrap border border-gray-100 flex items-center gap-1 z-20">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-sm font-bold text-gray-700">
               {scenario?.title || 'AI Tutor'}
            </span>
        </div>
      </div>
      
      <style>{`
        @keyframes wave {
          0%, 100% { height: 30%; }
          50% { height: 100%; }
        }
        .animate-wave {
          animation: wave 0.6s infinite ease-in-out;
        }
        @keyframes bounce-slight {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-slight {
          animation: bounce-slight 0.4s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Avatar;
