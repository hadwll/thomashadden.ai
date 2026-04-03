import 'server-only';

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export type RAGSourceDocument = {
  sourceFile: string;
  markdown: string;
  pageSlug: string | null;
};

const PAGE_SLUG_BY_FILE: Record<string, string> = {
  'home.md': '/',
  'about.md': '/about',
  'projects.md': '/projects',
  'research.md': '/research',
  'insights.md': '/insights'
};

function resolvePageSlug(sourceFile: string): string | null {
  return PAGE_SLUG_BY_FILE[sourceFile] ?? null;
}

export async function loadApprovedRAGSources(contentRoot?: string): Promise<RAGSourceDocument[]> {
  const root = contentRoot
    ? path.resolve(contentRoot)
    : path.resolve(process.cwd(), 'content', 'rag');

  let entries: Awaited<ReturnType<typeof readdir>>;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const documents = await Promise.all(
    markdownFiles.map(async (sourceFile) => {
      const filePath = path.join(root, sourceFile);
      const markdown = await readFile(filePath, 'utf8');

      return {
        sourceFile,
        markdown,
        pageSlug: resolvePageSlug(sourceFile)
      };
    })
  );

  return documents;
}
