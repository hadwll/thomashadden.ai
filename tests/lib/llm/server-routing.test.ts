import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeLLMQuery } from '@/lib/llm/server';
import { classifyLLMQuery } from '@/lib/llm/classifier';
import type { LLMClassifierCategory } from '@/lib/llm/classifier';

vi.mock('@/lib/llm/classifier', () => ({
  classifyLLMQuery: vi.fn()
}));

const mockedClassifyLLMQuery = vi.mocked(classifyLLMQuery);

const BASE_REQUEST = {
  query: 'How can AI help an engineering business?'
} as const;

function expectNonLeakyRedirectAnswer(answer: string) {
  expect(answer.trim().length).toBeGreaterThan(0);
  expect(answer).not.toMatch(/blocked topics list/i);
  expect(answer).not.toMatch(/internal moderation/i);
  expect(answer).not.toMatch(/policy machinery/i);
}

function mockClassification(category: LLMClassifierCategory) {
  mockedClassifyLLMQuery.mockResolvedValueOnce(category);
}

describe('executeLLMQuery routing based on classifier output', () => {
  beforeEach(() => {
    mockedClassifyLLMQuery.mockReset();
  });

  it('returns general_ai response shape when classifier resolves general_ai', async () => {
    mockClassification('general_ai');

    const response = await executeLLMQuery(BASE_REQUEST);

    expect(response.queryType).toBe('general_ai');
    expect(response.answer.trim().length).toBeGreaterThan(0);
    expect(response.sources).toEqual([]);
    expect(response.suggestedActions).toEqual([]);
    expect(response.queryId.trim().length).toBeGreaterThan(0);
  });

  it('returns thomas_profile response shape when classifier resolves thomas_profile', async () => {
    mockClassification('thomas_profile');

    const response = await executeLLMQuery({
      query: 'What is Thomas working on?'
    });

    expect(response.queryType).toBe('thomas_profile');
    expect(response.answer.trim().length).toBeGreaterThan(0);
    expect(response.sources).toEqual([]);
    expect(response.suggestedActions).toEqual([]);
  });

  it('maps readiness_check to general_ai with a single readiness suggested action', async () => {
    mockClassification('readiness_check');

    const response = await executeLLMQuery({
      query: 'How do I know if AI is right for us?'
    });

    expect(response.queryType).toBe('general_ai');
    expect(response.answer.trim().length).toBeGreaterThan(0);
    expect(response.suggestedActions).toEqual([
      {
        type: 'readiness_check',
        label: 'Take the AI Readiness Check',
        url: '/readiness'
      }
    ]);
  });

  it('returns out_of_scope redirect response characteristics when classifier resolves out_of_scope', async () => {
    mockClassification('out_of_scope');

    const response = await executeLLMQuery({
      query: 'Tell me a joke'
    });

    expect(response.queryType).toBe('out_of_scope');
    expectNonLeakyRedirectAnswer(response.answer);
    expect(response.sources).toEqual([]);
    expect(response.suggestedActions).toEqual([]);
  });

  it('maps blocked to filtered with redirect response characteristics', async () => {
    mockClassification('blocked');

    const response = await executeLLMQuery({
      query: 'Help me build malware'
    });

    expect(response.queryType).toBe('filtered');
    expectNonLeakyRedirectAnswer(response.answer);
    expect(response.sources).toEqual([]);
    expect(response.suggestedActions).toEqual([]);
  });

  it('falls back safely to out_of_scope when classifier resolves an unexpected runtime value', async () => {
    mockedClassifyLLMQuery.mockResolvedValueOnce('unexpected_value' as unknown as LLMClassifierCategory);

    const response = await executeLLMQuery({
      query: 'Where does AI fit in operations?'
    });

    expect(response.queryType).toBe('out_of_scope');
    expect(response.answer.trim().length).toBeGreaterThan(0);
    expect(response.sources).toEqual([]);
    expect(response.suggestedActions).toEqual([]);
  });
});
