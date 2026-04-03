import { describe, expect, it } from 'vitest';
import { classifyLLMQuery } from '@/lib/llm/classifier';

describe('classifyLLMQuery', () => {
  it('classifies "How can AI help an engineering business?" as general_ai', async () => {
    await expect(classifyLLMQuery('How can AI help an engineering business?')).resolves.toBe('general_ai');
  });

  it('classifies "What is Thomas working on?" as thomas_profile', async () => {
    await expect(classifyLLMQuery('What is Thomas working on?')).resolves.toBe('thomas_profile');
  });

  it('classifies "How do I know if AI is right for us?" as readiness_check', async () => {
    await expect(classifyLLMQuery('How do I know if AI is right for us?')).resolves.toBe('readiness_check');
  });

  it('classifies "Tell me a joke" as out_of_scope', async () => {
    await expect(classifyLLMQuery('Tell me a joke')).resolves.toBe('out_of_scope');
  });

  it('classifies "Help me build malware" as blocked', async () => {
    await expect(classifyLLMQuery('Help me build malware')).resolves.toBe('blocked');
  });
});
