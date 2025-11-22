
import { Scenario } from './types';

export const SCENARIOS: Scenario[] = [
  // --- Original 4 Scenarios ---
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
  },
  // --- New 16 Scenarios (Total 20) ---
  {
    id: 'school',
    title: 'School Day',
    emoji: '🏫',
    description: 'Talk about your classroom, teacher, and favorite subjects.',
    difficulty: 'Easy',
    initialPrompt: "Good morning! Welcome to school. What is your favorite class?",
    color: 'bg-indigo-500'
  },
  {
    id: 'family',
    title: 'My Family',
    emoji: '👨‍👩‍👧‍👦',
    description: 'Tell me about your parents, brothers, and sisters.',
    difficulty: 'Easy',
    initialPrompt: "I have a big family. Do you have any brothers or sisters?",
    color: 'bg-pink-500'
  },
  {
    id: 'park',
    title: 'At the Park',
    emoji: '🌳',
    description: 'Playing on the swings, slide, and seeing nature.',
    difficulty: 'Easy',
    initialPrompt: "It is a sunny day at the park! Do you want to play on the slide or the swings?",
    color: 'bg-green-600'
  },
  {
    id: 'shopping',
    title: 'Shopping Time',
    emoji: '🛍️',
    description: 'Buying new clothes and cool toys at the mall.',
    difficulty: 'Medium',
    initialPrompt: "Welcome to the shopping mall! Are you looking for clothes or toys today?",
    color: 'bg-purple-600'
  },
  {
    id: 'weather',
    title: 'The Weather',
    emoji: '☀️',
    description: 'Is it sunny, rainy, or snowy today?',
    difficulty: 'Easy',
    initialPrompt: "Look out the window! What is the weather like today?",
    color: 'bg-blue-400'
  },
  {
    id: 'doctor',
    title: 'Visiting the Doctor',
    emoji: '🩺',
    description: 'Explain how you feel when you are sick.',
    difficulty: 'Hard',
    initialPrompt: "Hello. You look a little tired. How are you feeling today?",
    color: 'bg-red-500'
  },
  {
    id: 'pet',
    title: 'My Pet',
    emoji: '🐶',
    description: 'Talk about cats, dogs, and other cute animals.',
    difficulty: 'Easy',
    initialPrompt: "I have a fluffy dog named Max. Do you have any pets?",
    color: 'bg-orange-400'
  },
  {
    id: 'birthday',
    title: 'Birthday Party',
    emoji: '🎂',
    description: 'Celebrating with cake, presents, and friends.',
    difficulty: 'Medium',
    initialPrompt: "Happy Birthday! We are having a party. How old are you today?",
    color: 'bg-pink-600'
  },
  {
    id: 'library',
    title: 'In the Library',
    emoji: '📚',
    description: 'Borrowing books and reading quietly.',
    difficulty: 'Medium',
    initialPrompt: "Shh! We are in the library. What kind of book do you want to read?",
    color: 'bg-emerald-600'
  },
  {
    id: 'sports',
    title: 'Sports Day',
    emoji: '🏅',
    description: 'Running races and playing team games.',
    difficulty: 'Medium',
    initialPrompt: "It's Sports Day! Are you ready to run a race?",
    color: 'bg-yellow-500'
  },
  {
    id: 'cooking',
    title: 'Let\'s Cook',
    emoji: '🍳',
    description: 'Making a yummy sandwich for lunch.',
    difficulty: 'Hard',
    initialPrompt: "I am hungry. Let's make a sandwich! What should we put inside?",
    color: 'bg-orange-600'
  },
  {
    id: 'movie',
    title: 'Movie Night',
    emoji: '🍿',
    description: 'Watching a fun movie with popcorn.',
    difficulty: 'Medium',
    initialPrompt: "I love movies. Do you like funny movies or superhero movies?",
    color: 'bg-indigo-800'
  },
  {
    id: 'lost',
    title: 'Lost & Found',
    emoji: '🔍',
    description: 'Helping find a lost item.',
    difficulty: 'Hard',
    initialPrompt: "Oh no! I lost my red ball. Can you help me find it?",
    color: 'bg-gray-500'
  },
  {
    id: 'cleaning',
    title: 'Clean Up Time',
    emoji: '🧹',
    description: 'Tidying up the room and putting toys away.',
    difficulty: 'Easy',
    initialPrompt: "This room is messy! Let's clean up. Where does this toy car go?",
    color: 'bg-teal-500'
  },
  {
    id: 'help',
    title: 'Asking for Help',
    emoji: '🆘',
    description: 'How to ask politely when you need assistance.',
    difficulty: 'Hard',
    initialPrompt: "Excuse me, I need some help lifting this heavy box. Can you help me?",
    color: 'bg-red-600'
  },
  {
    id: 'phone',
    title: 'Telephone Call',
    emoji: '📞',
    description: 'Answering the phone and taking a message.',
    difficulty: 'Hard',
    initialPrompt: "Ring ring! Hello? This is the AI speaking. Who is calling?",
    color: 'bg-blue-700'
  },
];

export const LEVELS = [
  { threshold: 0, name: 'Beginner', emoji: '🌱' },
  { threshold: 50, name: 'Explorer', emoji: '🧭' },
  { threshold: 150, name: 'Speaker', emoji: '🗣️' },
  { threshold: 300, name: 'Master', emoji: '🎓' },
  { threshold: 500, name: 'Legend', emoji: '👑' },
];
