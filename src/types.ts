export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  language: string;
  theme: 'dark' | 'light';
  currentExamProfileId?: string;
  stats: {
    totalStudyHours: number;
    tasksCompleted: number;
    challengesWon: number;
    challengesLost: number;
    currentStreak: number;
    bestStreak: number;
    totalPomodoros: number;
    totalBadges: number;
  };
  badges: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface ExamProfile {
  id: string;
  name: string;
  date: string;
  wakeTime: string;
  sleepTime: string;
  sessionLength: number;
  breakDuration: number;
  subjects: Subject[];
  tasks: Task[];
}

export interface Subject {
  id: string;
  name: string;
  priority: 'low' | 'medium' | 'high';
  color: string;
}

export interface Task {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface RoutineBlock {
  id: string;
  type: 'study' | 'break' | 'task' | 'sleep' | 'free';
  subjectId?: string;
  startTime: string;
  endTime: string;
  duration: number;
}

export interface TrackerBlock {
  id: string;
  blockId: string;
  date: string;
  status: 'pending' | 'done' | 'skipped';
  type: string;
  subjectId?: string;
  startTime: string;
  endTime: string;
}

export interface Challenge {
  id: string;
  challengerId: string;
  opponentIds: string[];
  duration: number;
  topics: string[];
  status: 'pending' | 'active' | 'completed' | 'declined';
  code: string;
  createdAt: string;
  startTime?: string;
  results?: Record<string, any>;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface Flashcard {
  id: string;
  subjectId: string;
  question: string;
  answer: string;
  dueDate: string;
  interval: number;
  repetition: number;
  efactor: number;
}

export interface Note {
  id: string;
  subjectId: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  updatedAt: string;
}

export interface LeaderboardEntry {
  id: string;
  uid: string;
  displayName: string;
  photoURL?: string;
  score: number;
  category: 'study_hours' | 'challenges' | 'streaks';
  updatedAt: string;
}
