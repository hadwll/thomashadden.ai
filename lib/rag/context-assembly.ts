import type { RetrievedRAGChunk } from '@/lib/rag/retrieval';

function deriveSourceUrl(chunk: RetrievedRAGChunk): string {
  const pageSlug = chunk.pageSlug?.trim();
  if (pageSlug) {
    return pageSlug.startsWith('/') ? pageSlug : `/${pageSlug.replace(/^\/+/, '')}`;
  }

  const normalizedSource = chunk.sourceFile.trim();
  const strippedExt = normalizedSource.replace(/\.md$/i, '');
  const leafSegment = strippedExt.split('/').filter(Boolean).pop() ?? '';
  if (leafSegment.length === 0) {
    return '/';
  }

  return `/${leafSegment}`;
}

function titleFromUrl(url: string): string {
  if (url === '/') {
    return 'Home';
  }

  const leafSegment = url.replace(/^\/+/, '').split('/').filter(Boolean).pop() ?? '';
  if (leafSegment.length === 0) {
    return 'Source';
  }

  return leafSegment
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function deriveSourceTitle(chunk: RetrievedRAGChunk, url: string): string {
  const heading = chunk.sectionHeading?.trim();
  if (heading && heading.length > 0) {
    return heading;
  }

  return titleFromUrl(url) || chunk.sourceFile || 'Source';
}

export function assembleRAGContext(chunks: RetrievedRAGChunk[]): string {
  if (chunks.length === 0) {
    return '';
  }

  const contextLines: string[] = ["CONTEXT FROM THOMAS'S SITE:"];
  for (const chunk of chunks) {
    const sectionLabel = chunk.sectionHeading?.trim() || 'General';
    contextLines.push('---');
    contextLines.push(`[Section: ${sectionLabel}]`);
    contextLines.push(chunk.contentText.trim());
    contextLines.push(`Source: ${chunk.sourceFile} | Relevance: ${chunk.similarity.toFixed(2)}`);
  }
  contextLines.push('---');

  return contextLines.join('\n');
}

export function mapRAGSources(chunks: RetrievedRAGChunk[]): Array<{
  title: string;
  url: string;
  relevance: number;
}> {
  const dedupedByUrl = new Map<
    string,
    {
      title: string;
      url: string;
      relevance: number;
    }
  >();

  for (const chunk of chunks) {
    const url = deriveSourceUrl(chunk);
    const title = deriveSourceTitle(chunk, url);
    const relevance = chunk.similarity;
    const existing = dedupedByUrl.get(url);

    if (!existing || relevance > existing.relevance) {
      dedupedByUrl.set(url, {
        title,
        url,
        relevance
      });
    }
  }

  return [...dedupedByUrl.values()].sort((left, right) => right.relevance - left.relevance);
}
