
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Scenario {
  id: string;
  title: string;
  emoji: string;
  description: string;
  difficulty: DifficultyLevel;
  initialPrompt: string;
  color: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  translation?: string; // For model messages
  correction?: string; // Grammar correction for user messages
  betterWay?: string; // Improved phrasing for user
  hints?: string[]; // Suggested replies for the user
  audioUrl?: string; // If we implement TTS
}

export interface GeminiParsedResponse {
  reply: string;
  chinese_translation: string;
  grammar_feedback?: string | null;
  better_way_to_say?: string | null;
  encouragement_score: number; // 1-5 points for the user
  suggested_replies: string[]; // 3 potential answers for the student
}

export interface UserStats {
  points: number;
  level: number;
  streak: number;
  badges: string[];
}
