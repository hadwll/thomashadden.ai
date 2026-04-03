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

export const READINESS_QUESTION_SET = {
  version: '1.0',
  totalQuestions: 7,
  estimatedMinutes: 2,
  questions: [
    {
      id: 'q1',
      order: 1,
      text: 'What best describes your business sector?',
      type: 'single_choice',
      options: [
        { id: 'q1-o1', label: 'Engineering or Manufacturing' },
        { id: 'q1-o2', label: 'Construction or Electrical' },
        { id: 'q1-o3', label: 'Professional Services' },
        { id: 'q1-o4', label: 'Retail or Hospitality' },
        { id: 'q1-o5', label: 'Other' }
      ]
    },
    {
      id: 'q2',
      order: 2,
      text: 'How many people work in your business?',
      type: 'single_choice',
      options: [
        { id: 'q2-o1', label: 'Just me' },
        { id: 'q2-o2', label: '2–10 people' },
        { id: 'q2-o3', label: '11–50 people' },
        { id: 'q2-o4', label: '51–200 people' },
        { id: 'q2-o5', label: '200+ people' }
      ]
    },
    {
      id: 'q3',
      order: 3,
      text: "How would you describe your business's current relationship with AI?",
      type: 'single_choice',
      options: [
        { id: 'q3-o1', label: "We haven't looked at it yet" },
        { id: 'q3-o2', label: "We've read about it but haven't tried anything" },
        { id: 'q3-o3', label: "We've tried a few tools informally" },
        { id: 'q3-o4', label: "We're actively using AI in some areas" },
        { id: 'q3-o5', label: 'AI is already core to how we operate' }
      ]
    },
    {
      id: 'q4',
      order: 4,
      text: 'Where does your business most feel the pressure to do things better or faster?',
      type: 'single_choice',
      options: [
        { id: 'q4-o1', label: 'Reporting and data analysis' },
        { id: 'q4-o2', label: 'Repetitive manual processes' },
        { id: 'q4-o3', label: 'Quality control or consistency' },
        { id: 'q4-o4', label: 'Customer communication or service' },
        { id: 'q4-o5', label: "We're not feeling significant pressure right now" }
      ]
    },
    {
      id: 'q5',
      order: 5,
      text: 'How well does your business currently capture and use data?',
      type: 'single_choice',
      options: [
        { id: 'q5-o1', label: "We don't really track data systematically" },
        { id: 'q5-o2', label: 'We use spreadsheets or basic tools' },
        { id: 'q5-o3', label: "We have systems but don't analyse the data much" },
        { id: 'q5-o4', label: 'We regularly analyse data to make decisions' },
        { id: 'q5-o5', label: 'We have dashboards and structured reporting' }
      ]
    },
    {
      id: 'q6',
      order: 6,
      text: 'If a low-risk AI pilot were available for your business, how likely would you be to try it?',
      type: 'single_choice',
      options: [
        { id: 'q6-o1', label: 'Unlikely — we need to see proof first' },
        { id: 'q6-o2', label: 'Possibly — if the case was clear' },
        { id: 'q6-o3', label: 'Open to it with the right guidance' },
        { id: 'q6-o4', label: "Very keen — we've been looking for a starting point" },
        { id: 'q6-o5', label: "We're already doing this" }
      ]
    },
    {
      id: 'q7',
      order: 7,
      text: 'What feels like the biggest barrier to adopting AI in your business right now?',
      type: 'single_choice',
      options: [
        { id: 'q7-o1', label: 'Cost and ROI uncertainty' },
        { id: 'q7-o2', label: "We don't know where to start" },
        { id: 'q7-o3', label: "We don't have the time to figure it out" },
        { id: 'q7-o4', label: "We're not sure we can trust AI outputs" },
        { id: 'q7-o5', label: 'No major barrier — we\'re ready to move' }
      ]
    }
  ]
} as const satisfies ReadinessQuestionSet;
