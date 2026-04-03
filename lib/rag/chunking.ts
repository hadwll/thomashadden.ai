import { createHash } from 'node:crypto';

export type RAGChunk = {
  chunkId: string;
  sourceFile: string;
  sectionHeading: string | null;
  chunkIndex: number;
  tokenCount: number;
  contentText: string;
  pageSlug: string | null;
};

type MarkdownSection = {
  heading: string | null;
  body: string;
};

function approximateTokenCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function normalizeSectionBody(lines: string[]): string {
  return lines.join('\n').trim();
}

function splitIntoSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: MarkdownSection[] = [];

  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  const flushSection = () => {
    const body = normalizeSectionBody(currentLines);
    if (body.length > 0) {
      sections.push({
        heading: currentHeading,
        body
      });
    }
  };

  for (const line of lines) {
    const headingMatch = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (headingMatch) {
      flushSection();
      currentHeading = headingMatch[2].trim();
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  flushSection();
  return sections;
}

function buildChunkId(input: {
  sourceFile: string;
  sectionHeading: string | null;
  chunkIndex: number;
  contentText: string;
}) {
  const hash = createHash('sha1')
    .update(input.sourceFile)
    .update('|')
    .update(input.sectionHeading ?? '')
    .update('|')
    .update(String(input.chunkIndex))
    .update('|')
    .update(input.contentText)
    .digest('hex')
    .slice(0, 12);

  return `${input.sourceFile}:${input.chunkIndex}:${hash}`;
}

export function chunkMarkdownDocument(input: {
  sourceFile: string;
  markdown: string;
  pageSlug?: string | null;
  targetChunkTokens?: number;
  maxChunkTokens?: number;
  overlapTokens?: number;
  minChunkTokens?: number;
}): RAGChunk[] {
  const targetChunkTokens = Math.max(1, input.targetChunkTokens ?? 450);
  const maxChunkTokens = Math.max(1, input.maxChunkTokens ?? 500);
  const overlapTokens = Math.max(0, input.overlapTokens ?? 50);
  const minChunkTokens = Math.max(1, input.minChunkTokens ?? 1);
  const pageSlug = input.pageSlug ?? null;

  const chunkWindowSize = Math.min(targetChunkTokens, maxChunkTokens);
  const chunkStep = Math.max(1, chunkWindowSize - overlapTokens);

  const sections = splitIntoSections(input.markdown);
  const chunks: RAGChunk[] = [];

  for (const section of sections) {
    const sectionText = section.body.trim();
    if (sectionText.length === 0) {
      continue;
    }

    const sectionTokenCount = approximateTokenCount(sectionText);
    if (sectionTokenCount < minChunkTokens) {
      continue;
    }

    if (sectionTokenCount <= maxChunkTokens) {
      const chunkIndex = chunks.length;
      chunks.push({
        chunkId: buildChunkId({
          sourceFile: input.sourceFile,
          sectionHeading: section.heading,
          chunkIndex,
          contentText: sectionText
        }),
        sourceFile: input.sourceFile,
        sectionHeading: section.heading,
        chunkIndex,
        tokenCount: sectionTokenCount,
        contentText: sectionText,
        pageSlug
      });
      continue;
    }

    const words = sectionText.split(/\s+/).filter(Boolean);
    for (let start = 0; start < words.length; start += chunkStep) {
      const end = Math.min(start + chunkWindowSize, words.length);
      const contentText = words.slice(start, end).join(' ');
      const tokenCount = approximateTokenCount(contentText);

      if (tokenCount < minChunkTokens) {
        if (end >= words.length) {
          break;
        }
        continue;
      }

      const chunkIndex = chunks.length;
      chunks.push({
        chunkId: buildChunkId({
          sourceFile: input.sourceFile,
          sectionHeading: section.heading,
          chunkIndex,
          contentText
        }),
        sourceFile: input.sourceFile,
        sectionHeading: section.heading,
        chunkIndex,
        tokenCount,
        contentText,
        pageSlug
      });

      if (end >= words.length) {
        break;
      }
    }
  }

  return chunks;
}
