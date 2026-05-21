export interface WordTask {
  id: number;
  fullWord: string;
  prefix: string;
  missing: string;
  hint: string;
}

export interface Passage {
  id: string;
  title: string;
  category: string;
  rawTextWithPlaceholders: string;
  wordTasks: WordTask[];
  explanation: string;
}

export interface UserProgress {
  passageId: string;
  // Map of wordTask id to the user's input (character-level array, or string)
  answers: { [key: number]: string };
  isSubmitted: boolean;
  score: number;
  timeSpentSeconds: number;
}

export interface AIFeedback {
  score: number;
  overallComments: string;
  wordExplanations: { [key: number]: string };
}
