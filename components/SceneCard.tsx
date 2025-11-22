import React from 'react';
import { Scenario } from '../types';

interface SceneCardProps {
  scenario: Scenario;
  onClick: (scenario: Scenario) => void;
}

const SceneCard: React.FC<SceneCardProps> = ({ scenario, onClick }) => {
  return (
    <button
      onClick={() => onClick(scenario)}
      className={`w-full text-left relative overflow-hidden rounded-3xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 group bg-white`}
    >
      <div className={`h-3 ${scenario.color} w-full`}></div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <span className="text-5xl drop-shadow-sm group-hover:scale-110 transition-transform duration-300 block">
            {scenario.emoji}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
            scenario.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
            scenario.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {scenario.difficulty}
          </span>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2 font-comic">{scenario.title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{scenario.description}</p>
      </div>
    </button>
  );
};

export default SceneCard;