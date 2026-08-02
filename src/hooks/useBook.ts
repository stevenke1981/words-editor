import { useState, useCallback, useEffect, useRef } from 'react';
import type { Book, Chapter, GoldenQuote, KnowledgeNode } from '../types';
import { createBookFromTemplate, DEFAULT_TEMPLATE_ID } from '../data/templates';

const STORAGE_KEY = 'wordsEditor:project';
const STORAGE_VERSION = 2;
const LEGACY_STORAGE_KEY = 'wordsEditorProject';

interface StorageEnvelope {
  version: number;
  savedAt: string;
  data: Book;
}

function loadBook(): Book {
  // Try new versioned envelope format first
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const envelope = JSON.parse(raw) as StorageEnvelope;
      if (envelope.version === STORAGE_VERSION && envelope.data?.chapters?.length > 0) {
        return envelope.data;
      }
      // Migration from v1: raw Book JSON stored without envelope under new key
      if (!envelope.version && (envelope as unknown as Book).chapters) {
        const legacy = envelope as unknown as Book;
        if (legacy.chapters?.length > 0) return legacy;
      }
    }
  } catch {
    // ignore corrupt storage
  }

  // Try legacy key for migration
  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as Book;
      if (parsed?.title && Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  return createBookFromTemplate(DEFAULT_TEMPLATE_ID);
}

export function useBook() {
  const [book, setBook] = useState<Book>(loadBook);
  const [currentChapterId, setCurrentChapterId] = useState<string>(
    () => loadBook().chapters[0]?.id || '01'
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced persistence (500ms)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const envelope: StorageEnvelope = {
          version: STORAGE_VERSION,
          savedAt: new Date().toISOString(),
          data: book,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
      } catch {
        // quota / private mode
      }
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [book]);

  // Chapter operations
  const updateChapter = useCallback((chapterId: string, updates: Partial<Chapter>) => {
    setBook((prev) => {
      const newChapters = prev.chapters.map((ch) =>
        ch.id === chapterId
          ? {
              ...ch,
              ...updates,
              lastSaved: new Date().toISOString().slice(0, 16).replace('T', ' '),
            }
          : ch
      );
      return { ...prev, chapters: newChapters };
    });
  }, []);

  const switchChapter = useCallback((id: string) => {
    setCurrentChapterId(id);
  }, []);

  // Quote operations
  const addQuote = useCallback((text: string, chapterId?: string) => {
    const newQuote: GoldenQuote = {
      id: 'q' + Date.now().toString(36),
      text: text.trim(),
      chapterId,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setBook((prev) => ({
      ...prev,
      goldenQuotes: [...prev.goldenQuotes, newQuote],
    }));
  }, []);

  const removeQuote = useCallback((id: string) => {
    setBook((prev) => ({
      ...prev,
      goldenQuotes: prev.goldenQuotes.filter((q) => q.id !== id),
    }));
  }, []);

  // Graph operations
  const updateGraphNodes = useCallback((nodes: KnowledgeNode[]) => {
    setBook((prev) => ({
      ...prev,
      knowledgeGraph: {
        ...prev.knowledgeGraph,
        nodes,
      },
    }));
  }, []);

  const addGraphNode = useCallback((label: string) => {
    const newNode: KnowledgeNode = {
      id: 'k' + Date.now().toString(36),
      label: label.trim(),
      type: 'concept',
      x: 90 + Math.random() * 80,
      y: 55 + Math.random() * 50,
      color: '#64748b',
    };
    setBook((prev) => ({
      ...prev,
      knowledgeGraph: {
        nodes: [...prev.knowledgeGraph.nodes, newNode],
        edges: prev.knowledgeGraph.edges,
      },
    }));
  }, []);

  // Template
  const applyTemplate = useCallback((templateId: string) => {
    const next = createBookFromTemplate(templateId);
    setBook(next);
    setCurrentChapterId(next.chapters[0]?.id || '01');
  }, []);

  // Project
  const renameProject = useCallback((title: string) => {
    setBook((prev) => ({ ...prev, title: title.trim() }));
  }, []);

  // Import JSON
  const importBook = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || !Array.isArray(parsed.chapters) || parsed.chapters.length === 0) {
        return false;
      }
      // Validate minimal structure
      const hasTitle = typeof parsed.title === 'string';
      const hasGraph = parsed.knowledgeGraph && Array.isArray(parsed.knowledgeGraph.nodes);
      if (!hasTitle || !hasGraph) {
        return false;
      }
      const imported: Book = {
        title: parsed.title,
        templateId: parsed.templateId,
        genre: parsed.genre,
        description: parsed.description,
        chapters: parsed.chapters,
        knowledgeGraph: parsed.knowledgeGraph,
        goldenQuotes: Array.isArray(parsed.goldenQuotes) ? parsed.goldenQuotes : [],
      };
      setBook(imported);
      setCurrentChapterId(imported.chapters[0]?.id || '01');
      return true;
    } catch {
      return false;
    }
  }, []);

  const currentChapter =
    book.chapters.find((c) => c.id === currentChapterId) || book.chapters[0];

  return {
    book,
    setBook,
    currentChapter,
    currentChapterId,
    setCurrentChapterId,
    switchChapter,
    updateChapter,
    addQuote,
    removeQuote,
    updateGraphNodes,
    addGraphNode,
    applyTemplate,
    renameProject,
    importBook,
  };
}
