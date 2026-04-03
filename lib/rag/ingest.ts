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
  void input;
  throw new Error('Not implemented');
}
