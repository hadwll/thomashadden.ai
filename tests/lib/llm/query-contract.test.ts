import { describe, expect, it } from 'vitest';
import {
  buildLLMQueryRequest,
  isLLMChunkEvent,
  isLLMDoneEvent,
  isLLMErrorEvent,
  isLLMQuerySource,
  isLLMQueryType,
  isLLMStreamEvent,
  validateLLMQuery
} from '@/lib/llm/query';

describe('validateLLMQuery', () => {
  it('rejects an empty string', () => {
    expect(validateLLMQuery('')).toEqual({
      ok: false,
      reason: expect.any(String)
    });
  });

  it('rejects whitespace-only input', () => {
    expect(validateLLMQuery('   \n\t')).toEqual({
      ok: false,
      reason: expect.any(String)
    });
  });

  it('rejects input longer than 500 characters', () => {
    expect(validateLLMQuery('x'.repeat(501))).toEqual({
      ok: false,
      reason: expect.any(String)
    });
  });

  it('accepts a normal question', () => {
    expect(validateLLMQuery('What is Thomas working on?')).toEqual({ ok: true });
  });
});

describe('buildLLMQueryRequest', () => {
  it('trims leading/trailing whitespace from query', () => {
    const request = buildLLMQueryRequest({
      query: '   What is Thomas working on?   ',
      sessionId: 'session-123',
      source: 'homepage_input'
    });

    expect(request.query).toBe('What is Thomas working on?');
  });

  it('includes sessionId', () => {
    const request = buildLLMQueryRequest({
      query: 'How can AI help an engineering business?',
      sessionId: 'session-123',
      source: 'homepage_chip'
    });

    expect(request.sessionId).toBe('session-123');
  });

  it('includes context.source', () => {
    const request = buildLLMQueryRequest({
      query: 'How can AI help an engineering business?',
      sessionId: 'session-123',
      source: 'readiness_check'
    });

    expect(request.context).toEqual({
      source: 'readiness_check'
    });
  });

  it('defaults stream to false', () => {
    const request = buildLLMQueryRequest({
      query: 'Where does AI fit into industry?',
      sessionId: 'session-123',
      source: 'llm_page'
    });

    expect(request.stream).toBe(false);
  });
});

describe('LLM query runtime type guards', () => {
  it.each(['homepage_chip', 'homepage_input', 'llm_page', 'readiness_check'])(
    'isLLMQuerySource accepts %s',
    (value) => {
      expect(isLLMQuerySource(value)).toBe(true);
    }
  );

  it.each(['', 'homepage', 'HOME', 'contact_form'])('isLLMQuerySource rejects %s', (value) => {
    expect(isLLMQuerySource(value)).toBe(false);
  });

  it.each(['thomas_profile', 'general_ai', 'out_of_scope', 'filtered'])(
    'isLLMQueryType accepts %s',
    (value) => {
      expect(isLLMQueryType(value)).toBe(true);
    }
  );

  it.each(['', 'general', 'profile', 'unsupported'])('isLLMQueryType rejects %s', (value) => {
    expect(isLLMQueryType(value)).toBe(false);
  });
});

describe('LLM SSE event narrowing helpers', () => {
  it('correctly distinguishes a chunk event', () => {
    const event: unknown = {
      chunk: 'AI can help',
      queryId: 'qry_123'
    };

    expect(isLLMChunkEvent(event)).toBe(true);
    expect(isLLMDoneEvent(event)).toBe(false);
    expect(isLLMErrorEvent(event)).toBe(false);
    expect(isLLMStreamEvent(event)).toBe(true);
  });

  it('correctly distinguishes a done event', () => {
    const event: unknown = {
      done: true,
      queryType: 'general_ai',
      sources: [
        {
          title: 'AI in Engineering',
          url: '/projects/ai-in-engineering',
          relevance: 0.92
        }
      ],
      suggestedActions: [
        {
          type: 'readiness_check',
          label: 'Take the AI Readiness Check',
          url: '/readiness'
        }
      ],
      queryId: 'qry_123'
    };

    expect(isLLMChunkEvent(event)).toBe(false);
    expect(isLLMDoneEvent(event)).toBe(true);
    expect(isLLMErrorEvent(event)).toBe(false);
    expect(isLLMStreamEvent(event)).toBe(true);
  });

  it('correctly distinguishes an error event', () => {
    const event: unknown = {
      error: true,
      code: 'SERVICE_UNAVAILABLE',
      message: 'This feature is temporarily unavailable.'
    };

    expect(isLLMChunkEvent(event)).toBe(false);
    expect(isLLMDoneEvent(event)).toBe(false);
    expect(isLLMErrorEvent(event)).toBe(true);
    expect(isLLMStreamEvent(event)).toBe(true);
  });
});
