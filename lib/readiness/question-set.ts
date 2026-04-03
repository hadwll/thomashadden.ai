export type ReadinessQuestionOption = {
  id: string;
  label: string;
};

export type ReadinessQuestion = {
  id: string;
  order: number;
  text: string;
  type: 'single_choice';
  options: ReadinessQuestionOption[];
};

export type ReadinessQuestionSet = {
  version: '1.0';
  totalQuestions: 7;
  estimatedMinutes: 2;
  questions: ReadinessQuestion[];
};

type ReadinessQuestionOptionSeed = ReadinessQuestionOption & {
  scoreValue: number;
};

type ReadinessQuestionSeed = Omit<ReadinessQuestion, 'options'> & {
  options: ReadinessQuestionOptionSeed[];
};

const READINESS_QUESTION_SEED: readonly ReadinessQuestionSeed[] = [
  {
    id: 'q1',
    order: 1,
    text: 'What best describes your business sector?',
    type: 'single_choice',
    options: [
      { id: 'q1-o1', label: 'Engineering or Manufacturing', scoreValue: 4 },
      { id: 'q1-o2', label: 'Construction or Electrical', scoreValue: 3 },
      { id: 'q1-o3', label: 'Professional Services', scoreValue: 2 },
      { id: 'q1-o4', label: 'Retail or Hospitality', scoreValue: 1 },
      { id: 'q1-o5', label: 'Other', scoreValue: 1 }
    ]
  },
  {
    id: 'q2',
    order: 2,
    text: 'How many people work in your business?',
    type: 'single_choice',
    options: [
      { id: 'q2-o1', label: 'Just me', scoreValue: 1 },
      { id: 'q2-o2', label: '2–10 people', scoreValue: 2 },
      { id: 'q2-o3', label: '11–50 people', scoreValue: 4 },
      { id: 'q2-o4', label: '51–200 people', scoreValue: 3 },
      { id: 'q2-o5', label: '200+ people', scoreValue: 2 }
    ]
  },
  {
    id: 'q3',
    order: 3,
    text: "How would you describe your business's current relationship with AI?",
    type: 'single_choice',
    options: [
      { id: 'q3-o1', label: "We haven't looked at it yet", scoreValue: 1 },
      { id: 'q3-o2', label: "We've read about it but haven't tried anything", scoreValue: 2 },
      { id: 'q3-o3', label: "We've tried a few tools informally", scoreValue: 3 },
      { id: 'q3-o4', label: "We're actively using AI in some areas", scoreValue: 4 },
      { id: 'q3-o5', label: 'AI is already core to how we operate', scoreValue: 4 }
    ]
  },
  {
    id: 'q4',
    order: 4,
    text: 'Where does your business most feel the pressure to do things better or faster?',
    type: 'single_choice',
    options: [
      { id: 'q4-o1', label: 'Reporting and data analysis', scoreValue: 4 },
      { id: 'q4-o2', label: 'Repetitive manual processes', scoreValue: 4 },
      { id: 'q4-o3', label: 'Quality control or consistency', scoreValue: 3 },
      { id: 'q4-o4', label: 'Customer communication or service', scoreValue: 2 },
      { id: 'q4-o5', label: "We're not feeling significant pressure right now", scoreValue: 1 }
    ]
  },
  {
    id: 'q5',
    order: 5,
    text: 'How well does your business currently capture and use data?',
    type: 'single_choice',
    options: [
      { id: 'q5-o1', label: "We don't really track data systematically", scoreValue: 1 },
      { id: 'q5-o2', label: 'We use spreadsheets or basic tools', scoreValue: 2 },
      { id: 'q5-o3', label: "We have systems but don't analyse the data much", scoreValue: 3 },
      { id: 'q5-o4', label: 'We regularly analyse data to make decisions', scoreValue: 4 },
      { id: 'q5-o5', label: 'We have dashboards and structured reporting', scoreValue: 4 }
    ]
  },
  {
    id: 'q6',
    order: 6,
    text: 'If a low-risk AI pilot were available for your business, how likely would you be to try it?',
    type: 'single_choice',
    options: [
      { id: 'q6-o1', label: 'Unlikely — we need to see proof first', scoreValue: 1 },
      { id: 'q6-o2', label: 'Possibly — if the case was clear', scoreValue: 2 },
      { id: 'q6-o3', label: 'Open to it with the right guidance', scoreValue: 3 },
      { id: 'q6-o4', label: "Very keen — we've been looking for a starting point", scoreValue: 4 },
      { id: 'q6-o5', label: "We're already doing this", scoreValue: 4 }
    ]
  },
  {
    id: 'q7',
    order: 7,
    text: 'What feels like the biggest barrier to adopting AI in your business right now?',
    type: 'single_choice',
    options: [
      { id: 'q7-o1', label: 'Cost and ROI uncertainty', scoreValue: 1 },
      { id: 'q7-o2', label: "We don't know where to start", scoreValue: 3 },
      { id: 'q7-o3', label: "We don't have the time to figure it out", scoreValue: 3 },
      { id: 'q7-o4', label: "We're not sure we can trust AI outputs", scoreValue: 2 },
      { id: 'q7-o5', label: 'No major barrier — we\'re ready to move', scoreValue: 4 }
    ]
  }
] as const;

const READINESS_QUESTION_BY_ID = new Map(
  READINESS_QUESTION_SEED.map((question) => [question.id, question] as const)
);

const READINESS_OPTION_SCORE_BY_ID = new Map<string, number>(
  READINESS_QUESTION_SEED.flatMap((question) =>
    question.options.map((option) => [option.id, option.scoreValue] as const)
  )
);

function stripScoreValues(question: ReadinessQuestionSeed): ReadinessQuestion {
  return {
    id: question.id,
    order: question.order,
    text: question.text,
    type: question.type,
    options: question.options.map(({ scoreValue: _scoreValue, ...option }) => option)
  };
}

export const READINESS_QUESTION_SET = {
  version: '1.0',
  totalQuestions: 7,
  estimatedMinutes: 2,
  questions: READINESS_QUESTION_SEED.map(stripScoreValues)
} as const satisfies ReadinessQuestionSet;

export function getReadinessQuestionById(questionId: string): ReadinessQuestion | null {
  const question = READINESS_QUESTION_BY_ID.get(questionId);
  return question ? stripScoreValues(question) : null;
}

export function getReadinessQuestionSeedById(questionId: string): ReadinessQuestionSeed | null {
  return READINESS_QUESTION_BY_ID.get(questionId) ?? null;
}

export function getReadinessOptionScore(questionId: string, optionId: string): number | null {
  const question = READINESS_QUESTION_BY_ID.get(questionId);
  if (!question) {
    return null;
  }

  const option = question.options.find((candidate) => candidate.id === optionId);
  return option ? option.scoreValue : null;
}

export function isReadinessQuestionOptionValid(questionId: string, optionId: string): boolean {
  return getReadinessOptionScore(questionId, optionId) !== null;
}
