import { Scenario } from './types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'introduction',
    title: 'Self Introduction',
    emoji: '👋',
    description: 'Practice saying hello and introducing yourself.',
    difficulty: 'Easy',
    initialPrompt: "Hi! I'm your new friend. What is your name?",
    color: 'bg-blue-500'
  },
  {
    id: 'food',
    title: 'Ordering Food',
    emoji: '🍔',
    description: 'Let\'s order some yummy food at a restaurant!',
    difficulty: 'Easy',
    initialPrompt: "Welcome to the Yummy Burger Shop! What would you like to eat?",
    color: 'bg-orange-500'
  },
  {
    id: 'hobby',
    title: 'Hobbies',
    emoji: '⚽',
    description: 'Talk about sports, music, and what you like to do.',
    difficulty: 'Medium',
    initialPrompt: "I love playing soccer on weekends. What do you like to do for fun?",
    color: 'bg-green-500'
  },
  {
    id: 'travel',
    title: 'Travel',
    emoji: '✈️',
    description: 'Discuss asking for directions and visiting places.',
    difficulty: 'Hard',
    initialPrompt: "I want to go to the zoo. Do you know how to get there?",
    color: 'bg-purple-500'
  }
];

export const LEVELS = [
  { threshold: 0, name: 'Beginner', emoji: '🌱' },
  { threshold: 50, name: 'Explorer', emoji: '🧭' },
  { threshold: 150, name: 'Speaker', emoji: '🗣️' },
  { threshold: 300, name: 'Master', emoji: '🎓' },
  { threshold: 500, name: 'Legend', emoji: '👑' },
];