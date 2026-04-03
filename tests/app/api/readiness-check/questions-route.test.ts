import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/readiness-check/questions/route';

const EXPECTED_FIRST_QUESTION_TEXT = 'What best describes your business sector?';
const EXPECTED_LAST_QUESTION_TEXT = 'What feels like the biggest barrier to adopting AI in your business right now?';
const EXPECTED_FIRST_QUESTION_OPTION_LABELS = [
  'Engineering or Manufacturing',
  'Construction or Electrical',
  'Professional Services',
  'Retail or Hospitality',
  'Other'
];

async function invokeGet() {
  const request = new Request('http://localhost:3000/api/readiness-check/questions', {
    method: 'GET'
  });

  const response = await GET(request);
  const payload = await response.json();

  return { response, payload };
}

function expectQuestionShape(question: unknown, expectedOrder: number) {
  const maybeQuestion = question as {
    id?: unknown;
    order?: unknown;
    text?: unknown;
    type?: unknown;
    options?: unknown;
  };

  expect(typeof maybeQuestion.id).toBe('string');
  expect(String(maybeQuestion.id).trim()).not.toBe('');
  expect(typeof maybeQuestion.order).toBe('number');
  expect(maybeQuestion.order).toBe(expectedOrder);
  expect(typeof maybeQuestion.text).toBe('string');
  expect(String(maybeQuestion.text).trim()).not.toBe('');
  expect(maybeQuestion.type).toBe('single_choice');
  expect(Array.isArray(maybeQuestion.options)).toBe(true);
  expect((maybeQuestion.options as unknown[]).length).toBeGreaterThan(0);
  expect(Object.prototype.hasOwnProperty.call(maybeQuestion, 'score')).toBe(false);
  expect(Object.prototype.hasOwnProperty.call(maybeQuestion, 'scoreValue')).toBe(false);
  expect(Object.prototype.hasOwnProperty.call(maybeQuestion, 'score_value')).toBe(false);

  for (const option of maybeQuestion.options as unknown[]) {
    const maybeOption = option as {
      id?: unknown;
      label?: unknown;
      score?: unknown;
      scoreValue?: unknown;
      score_value?: unknown;
    };

    expect(typeof maybeOption.id).toBe('string');
    expect(String(maybeOption.id).trim()).not.toBe('');
    expect(typeof maybeOption.label).toBe('string');
    expect(String(maybeOption.label).trim()).not.toBe('');
    expect(Object.prototype.hasOwnProperty.call(maybeOption, 'score')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(maybeOption, 'scoreValue')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(maybeOption, 'score_value')).toBe(false);
  }
}

describe('GET /api/readiness-check/questions contract', () => {
  it('returns the public 7-question readiness envelope without score values', async () => {
    const { response, payload } = await invokeGet();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toMatchObject({
      version: '1.0',
      totalQuestions: 7,
      estimatedMinutes: 2
    });

    const questions = payload.data.questions as unknown[];

    expect(Array.isArray(questions)).toBe(true);
    expect(questions).toHaveLength(7);
    expect(questions.map((question: any) => question.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);

    questions.forEach((question, index) => expectQuestionShape(question, index + 1));

    expect((questions[0] as { text?: unknown }).text).toBe(EXPECTED_FIRST_QUESTION_TEXT);
    expect((questions[6] as { text?: unknown }).text).toBe(EXPECTED_LAST_QUESTION_TEXT);

    const firstQuestion = questions[0] as { options?: Array<{ label?: unknown }> };
    expect(firstQuestion.options?.map((option) => option.label)).toEqual(EXPECTED_FIRST_QUESTION_OPTION_LABELS);
  });
});
