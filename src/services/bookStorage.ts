import type { Book, Chapter, GoldenQuote, KnowledgeEdge, KnowledgeNode } from '../types';

export const BOOK_STORAGE_KEY = 'wordsEditor:project';
export const LEGACY_STORAGE_KEY = 'wordsEditorProject';
export const STORAGE_VERSION = 3;

export interface StorageEnvelope {
  version: number;
  savedAt: string;
  currentChapterId?: string;
  data: Book;
}

export interface LoadedBook {
  book: Book;
  currentChapterId: string;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  return Math.min(max, Math.max(min, finiteNumber(value, fallback)));
}

function computeWordCount(content: string): number {
  const chinese = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  const english = content.split(/\s+/).filter((word) => /[a-zA-Z]/.test(word)).length;
  return chinese + english;
}

function normalizeReferences(value: unknown): Chapter['references'] {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter(isRecord)
    .map((reference) => ({
      date: stringValue(reference.date),
      title: stringValue(reference.title),
    }))
    .filter((reference) => reference.title.length > 0);
}

function normalizeChapter(value: unknown, index: number): Chapter | null {
  if (!isRecord(value)) return null;

  const id = stringValue(value.id, String(index + 1).padStart(2, '0'));
  const content = stringValue(value.content);
  const status =
    value.status === '完成' || value.status === '草稿' || value.status === '待寫'
      ? value.status
      : '草稿';

  return {
    id,
    chapter: stringValue(value.chapter, id),
    title: stringValue(value.title, `未命名${stringValue(value.section, '章節')}`),
    section: stringValue(value.section, '內容'),
    status,
    content,
    wordCount: computeWordCount(content),
    added: Math.max(0, Math.round(finiteNumber(value.added, computeWordCount(content)))),
    deleted: Math.max(0, Math.round(finiteNumber(value.deleted, 0))),
    retention: clamp(value.retention, 0, 100, 100),
    rewrite: clamp(value.rewrite, 0, 100, 0),
    lastSaved: stringValue(
      value.lastSaved,
      new Date().toISOString().slice(0, 16).replace('T', ' '),
    ),
    inspirationNotes:
      typeof value.inspirationNotes === 'string' ? value.inspirationNotes : undefined,
    references: normalizeReferences(value.references),
    illustration: typeof value.illustration === 'string' ? value.illustration : undefined,
  };
}

function normalizeNodes(value: unknown): KnowledgeNode[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((node, index) => {
      const type =
        node.type === 'chapter' || node.type === 'entity' || node.type === 'concept'
          ? node.type
          : 'concept';
      return {
        id: stringValue(node.id, `k${index + 1}`),
        label: stringValue(node.label, `概念 ${index + 1}`),
        type,
        x: finiteNumber(node.x, 90 + (index % 4) * 70),
        y: finiteNumber(node.y, 55 + Math.floor(index / 4) * 35),
        color: typeof node.color === 'string' ? node.color : undefined,
      } satisfies KnowledgeNode;
    })
    .filter((node) => node.label.trim().length > 0);
}

function normalizeEdges(value: unknown, nodes: KnowledgeNode[]): KnowledgeEdge[] {
  if (!Array.isArray(value)) return [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  return value
    .filter(isRecord)
    .map((edge, index) => ({
      id: stringValue(edge.id, `e${index + 1}`),
      source: stringValue(edge.source),
      target: stringValue(edge.target),
      label: typeof edge.label === 'string' ? edge.label : undefined,
    }))
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
}

function normalizeQuotes(value: unknown): GoldenQuote[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((quote, index) => ({
      id: stringValue(quote.id, `q${index + 1}`),
      text: stringValue(quote.text),
      chapterId: typeof quote.chapterId === 'string' ? quote.chapterId : undefined,
      createdAt: stringValue(quote.createdAt, new Date().toISOString().slice(0, 10)),
    }))
    .filter((quote) => quote.text.trim().length > 0);
}

/** Normalize imported or persisted data into a safe Book shape. */
export function normalizeBook(value: unknown): Book | null {
  if (!isRecord(value) || typeof value.title !== 'string' || value.title.trim().length === 0) {
    return null;
  }

  const chapters = Array.isArray(value.chapters)
    ? value.chapters.map(normalizeChapter).filter((chapter): chapter is Chapter => chapter !== null)
    : [];
  if (chapters.length === 0) return null;

  const graph = isRecord(value.knowledgeGraph) ? value.knowledgeGraph : {};
  const nodes = normalizeNodes(graph.nodes);

  return {
    title: value.title.trim(),
    templateId: typeof value.templateId === 'string' ? value.templateId : undefined,
    genre: typeof value.genre === 'string' ? value.genre : undefined,
    description: typeof value.description === 'string' ? value.description : undefined,
    chapters,
    knowledgeGraph: {
      nodes,
      edges: normalizeEdges(graph.edges, nodes),
    },
    goldenQuotes: normalizeQuotes(value.goldenQuotes),
  };
}

function selectedChapterId(book: Book, value: unknown): string {
  return typeof value === 'string' && book.chapters.some((chapter) => chapter.id === value)
    ? value
    : book.chapters[0].id;
}

/** Decode a JSON project export, accepting both raw v1 and versioned envelopes. */
export function parseBookJson(json: string): LoadedBook | null {
  try {
    const parsed: unknown = JSON.parse(json);
    const rawBook = isRecord(parsed) && 'data' in parsed ? parsed.data : parsed;
    const book = normalizeBook(rawBook);
    if (!book) return null;
    const currentChapterId = isRecord(parsed) ? parsed.currentChapterId : undefined;
    return { book, currentChapterId: selectedChapterId(book, currentChapterId) };
  } catch {
    return null;
  }
}

/** Decode local storage and migrate raw legacy Book JSON to the current shape. */
export function decodeStoredBook(json: string): LoadedBook | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (
      isRecord(parsed) &&
      typeof parsed.version === 'number' &&
      parsed.version > STORAGE_VERSION
    ) {
      return null;
    }
    const rawBook = isRecord(parsed) && 'data' in parsed ? parsed.data : parsed;
    const book = normalizeBook(rawBook);
    if (!book) return null;
    const currentChapterId = isRecord(parsed) ? parsed.currentChapterId : undefined;
    return { book, currentChapterId: selectedChapterId(book, currentChapterId) };
  } catch {
    return null;
  }
}

export function encodeStoredBook(book: Book, currentChapterId: string): string {
  const envelope: StorageEnvelope = {
    version: STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    currentChapterId: selectedChapterId(book, currentChapterId),
    data: book,
  };
  return JSON.stringify(envelope);
}
