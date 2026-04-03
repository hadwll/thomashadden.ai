import { describe, expect, it } from 'vitest';
import { chunkMarkdownDocument } from '@/lib/rag/chunking';

function approxTokenCount(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

describe('chunkMarkdownDocument', () => {
  it('splits markdown by headings and preserves metadata fields', () => {
    const markdown = [
      '## Background',
      'Thomas builds practical AI systems for engineering teams.',
      '',
      '## Projects',
      'He leads applied automation projects and measurable deployments.'
    ].join('\n');

    const chunks = chunkMarkdownDocument({
      sourceFile: 'about.md',
      markdown,
      pageSlug: '/about',
      maxChunkTokens: 100
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({
      sourceFile: 'about.md',
      sectionHeading: 'Background',
      chunkIndex: 0,
      pageSlug: '/about'
    });
    expect(chunks[1]).toMatchObject({
      sourceFile: 'about.md',
      sectionHeading: 'Projects',
      chunkIndex: 1,
      pageSlug: '/about'
    });
    expect(chunks[0].contentText).toContain('practical AI systems');
    expect(chunks[1].contentText).toContain('automation projects');
  });

  it('returns a single chunk when section tokens are below max threshold', () => {
    const markdown = ['## Overview', 'one two three four five six'].join('\n');

    const chunks = chunkMarkdownDocument({
      sourceFile: 'home.md',
      markdown,
      targetChunkTokens: 16,
      maxChunkTokens: 20,
      overlapTokens: 2,
      minChunkTokens: 1
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].sectionHeading).toBe('Overview');
    expect(chunks[0].chunkIndex).toBe(0);
  });

  it('splits long sections into multiple overlapping chunks above the max token threshold', () => {
    const markdown = [
      '## Deep Dive',
      'w1 w2 w3 w4 w5 w6 w7 w8 w9 w10 w11 w12 w13 w14'
    ].join('\n');

    const chunks = chunkMarkdownDocument({
      sourceFile: 'projects.md',
      markdown,
      targetChunkTokens: 5,
      maxChunkTokens: 6,
      overlapTokens: 2,
      minChunkTokens: 1
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.sectionHeading === 'Deep Dive')).toBe(true);

    for (const chunk of chunks) {
      expect(chunk.tokenCount).toBeLessThanOrEqual(6);
      expect(chunk.tokenCount).toBeGreaterThan(0);
    }

    for (let index = 1; index < chunks.length; index += 1) {
      const previousWords = chunks[index - 1].contentText.trim().split(/\s+/);
      const currentWords = chunks[index].contentText.trim().split(/\s+/);

      expect(previousWords.slice(-2)).toEqual(currentWords.slice(0, 2));
    }
  });

  it('does not emit near-empty chunks below the configured minimum threshold', () => {
    const markdown = [
      '## Useful Section',
      'alpha beta gamma delta epsilon zeta',
      '',
      '## Tiny',
      'tiny'
    ].join('\n');

    const chunks = chunkMarkdownDocument({
      sourceFile: 'research.md',
      markdown,
      targetChunkTokens: 4,
      maxChunkTokens: 5,
      overlapTokens: 1,
      minChunkTokens: 3
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((chunk) => chunk.tokenCount >= 3)).toBe(true);
    expect(chunks.some((chunk) => chunk.sectionHeading === 'Tiny')).toBe(false);
  });

  it('assigns stable, incremental chunkIndex values from 0 within each source file', () => {
    const markdown = [
      '## Section One',
      'a1 a2 a3 a4 a5 a6 a7 a8 a9 a10',
      '',
      '## Section Two',
      'b1 b2 b3 b4 b5 b6 b7 b8 b9 b10'
    ].join('\n');

    const chunks = chunkMarkdownDocument({
      sourceFile: 'insights.md',
      markdown,
      targetChunkTokens: 4,
      maxChunkTokens: 5,
      overlapTokens: 1,
      minChunkTokens: 1
    });

    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual(chunks.map((_, index) => index));
  });

  it('generates non-empty unique chunkId values for all emitted chunks', () => {
    const markdown = [
      '## Signals',
      's1 s2 s3 s4 s5 s6 s7 s8 s9 s10 s11 s12 s13'
    ].join('\n');

    const chunks = chunkMarkdownDocument({
      sourceFile: 'research.md',
      markdown,
      targetChunkTokens: 4,
      maxChunkTokens: 5,
      overlapTokens: 1,
      minChunkTokens: 1
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.chunkId.trim().length > 0)).toBe(true);
    expect(new Set(chunks.map((chunk) => chunk.chunkId)).size).toBe(chunks.length);
  });

  it('populates tokenCount using a deterministic token approximation per chunk text', () => {
    const markdown = [
      '## Summary',
      'token one token two token three token four token five'
    ].join('\n');

    const chunks = chunkMarkdownDocument({
      sourceFile: 'home.md',
      markdown,
      targetChunkTokens: 12,
      maxChunkTokens: 20,
      overlapTokens: 2,
      minChunkTokens: 1
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.map((chunk) => chunk.tokenCount)).toEqual(
      chunks.map((chunk) => approxTokenCount(chunk.contentText))
    );
  });
});
