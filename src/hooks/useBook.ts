import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_TEMPLATE_ID, createBookFromTemplate } from '../data/templates';
import {
  BOOK_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  type LoadedBook,
  decodeStoredBook,
  encodeStoredBook,
  parseBookJson,
} from '../services/bookStorage';
import type { Book, Chapter, GoldenQuote, KnowledgeNode } from '../types';

export type StorageStatus = 'saved' | 'saving' | 'error';

function loadBook(): LoadedBook {
  try {
    const raw = localStorage.getItem(BOOK_STORAGE_KEY);
    if (raw) {
      const loaded = decodeStoredBook(raw);
      if (loaded) return loaded;
    }
  } catch {
    // Fall through to the legacy key or template.
  }

  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const loaded = decodeStoredBook(legacy);
      if (loaded) return loaded;
    }
  } catch {
    // Fall through to the default template.
  }

  const book = createBookFromTemplate(DEFAULT_TEMPLATE_ID);
  return { book, currentChapterId: book.chapters[0]?.id || '01' };
}

export function useBook() {
  const [initial] = useState<LoadedBook>(loadBook);
  const [book, setBook] = useState<Book>(initial.book);
  const [currentChapterId, setCurrentChapterId] = useState<string>(initial.currentChapterId);
  const latestBookRef = useRef(book);
  const latestChapterIdRef = useRef(currentChapterId);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>('saved');

  const persist = useCallback((): boolean => {
    try {
      localStorage.setItem(
        BOOK_STORAGE_KEY,
        encodeStoredBook(latestBookRef.current, latestChapterIdRef.current),
      );
      setStorageStatus('saved');
      return true;
    } catch {
      setStorageStatus('error');
      return false;
    }
  }, []);

  const flushSave = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    persist();
  }, [persist]);

  // Debounced persistence (500ms)
  useEffect(() => {
    latestBookRef.current = book;
    latestChapterIdRef.current = currentChapterId;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setStorageStatus('saving');
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      persist();
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [book, currentChapterId, persist]);

  // Flush pending edits before the document is backgrounded or closed.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', flushSave);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', flushSave);
    };
  }, [flushSave]);

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
          : ch,
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
      id: `q${Date.now().toString(36)}`,
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
      id: `k${Date.now().toString(36)}`,
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
    const loaded = parseBookJson(json);
    if (!loaded) return false;
    setBook(loaded.book);
    setCurrentChapterId(loaded.currentChapterId);
    return true;
  }, []);

  const currentChapter = book.chapters.find((c) => c.id === currentChapterId) || book.chapters[0];

  return {
    book,
    setBook,
    storageStatus,
    flushSave,
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
