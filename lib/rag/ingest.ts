import { chunkMarkdownDocument, type RAGChunk } from '@/lib/rag/chunking';
import { loadApprovedRAGSources } from '@/lib/rag/content-source';
import { embedRAGChunks } from '@/lib/rag/embedding';
import { writeRAGChunks } from '@/lib/rag/vector-store';

export type RAGIngestSummary = {
  filesProcessed: number;
  chunksCreated: number;
  durationMs: number;
  embeddingModel: string;
  status: 'success' | 'failed';
  errors: Array<{ sourceFile?: string; message: string }>;
};

export async function runManualRAGIngest(input?: {
  contentRoot?: string;
  forceReingest?: boolean;
}): Promise<RAGIngestSummary> {
  const startedAt = Date.now();
  const errors: Array<{ sourceFile?: string; message: string }> = [];

  let filesProcessed = 0;
  let chunksCreated = 0;
  let embeddingModel = 'unknown';
  let chunks: RAGChunk[] = [];

  try {
    const sourceDocuments = await loadApprovedRAGSources(input?.contentRoot);
    filesProcessed = sourceDocuments.length;

    for (const sourceDocument of sourceDocuments) {
      try {
        const sourceChunks = chunkMarkdownDocument({
          sourceFile: sourceDocument.sourceFile,
          markdown: sourceDocument.markdown,
          pageSlug: sourceDocument.pageSlug
        });
        chunks = chunks.concat(sourceChunks);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown chunking error.';
        errors.push({
          sourceFile: sourceDocument.sourceFile,
          message
        });
      }
    }

    try {
      const embeddingResult = await embedRAGChunks(chunks);
      embeddingModel = embeddingResult.embeddingModel;

      const writeResult = await writeRAGChunks({
        chunks,
        vectors: embeddingResult.vectors,
        forceReingest: input?.forceReingest
      });
      chunksCreated = writeResult.chunksWritten;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown embedding/vector-store error.';
      errors.push({ message });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ingest pipeline error.';
    errors.push({ message });
  }

  return {
    filesProcessed,
    chunksCreated,
    durationMs: Date.now() - startedAt,
    embeddingModel,
    status: errors.length === 0 ? 'success' : 'failed',
    errors
  };
}
