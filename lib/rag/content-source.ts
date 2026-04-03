export type RAGSourceDocument = {
  sourceFile: string;
  markdown: string;
  pageSlug: string | null;
};

export async function loadApprovedRAGSources(_contentRoot?: string): Promise<RAGSourceDocument[]> {
  throw new Error('Not implemented');
}
