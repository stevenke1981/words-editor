/**
 * Tests for exportService — Word, PDF, and Markdown export functions.
 *
 * Co-Authored-By: Qwen Code (tests)
 */

import { describe, expect, it } from 'vitest';
import type { Book } from '../types';
import {
  containsCJK,
  exportChapterToMarkdown,
  exportFullBookToPdf,
  exportFullBookToWord,
  exportToMarkdown,
  exportToPdf,
  exportToWord,
} from './exportService';

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

const testBook: Book = {
  title: '測試書籍',
  templateId: 'general-article',
  genre: '一般寫作',
  description: '這是一本測試用的書籍。',
  chapters: [
    {
      id: '01',
      chapter: '01',
      title: '第一章',
      section: '開頭',
      status: '草稿',
      content: '這是測試內容。\nHello world.',
      wordCount: 12,
      added: 12,
      deleted: 0,
      retention: 100,
      rewrite: 0,
      lastSaved: '2026-08-03 12:00',
      inspirationNotes: '一些靈感',
      references: [{ date: '2026-01-01', title: '參考文獻 A' }],
    },
    {
      id: '02',
      chapter: '02',
      title: '第二章',
      section: '中段',
      status: '待寫',
      content: '',
      wordCount: 0,
      added: 0,
      deleted: 0,
      retention: 100,
      rewrite: 0,
      lastSaved: '2026-08-03 12:00',
    },
  ],
  knowledgeGraph: {
    nodes: [
      { id: 'k1', label: '核心概念', type: 'concept', x: 100, y: 50 },
      { id: 'k2', label: '第一章', type: 'chapter', x: 200, y: 100 },
    ],
    edges: [{ id: 'e1', source: 'k1', target: 'k2', label: '包含' }],
  },
  goldenQuotes: [{ id: 'q1', text: '測試金句', chapterId: '01', createdAt: '2026-08-03' }],
};

// ---------------------------------------------------------------------------
// containsCJK
// ---------------------------------------------------------------------------

describe('containsCJK', () => {
  it('detects Chinese characters', () => {
    expect(containsCJK('你好世界')).toBe(true);
  });

  it('detects mixed CJK and Latin', () => {
    expect(containsCJK('Hello 世界')).toBe(true);
  });

  it('returns false for pure ASCII', () => {
    expect(containsCJK('Hello World 123!')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(containsCJK('')).toBe(false);
  });

  it('detects Japanese hiragana', () => {
    expect(containsCJK('こんにちは')).toBe(true);
  });

  it('detects Korean hangul', () => {
    expect(containsCJK('안녕하세요')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// exportToWord (single chapter)
// ---------------------------------------------------------------------------

describe('exportToWord', () => {
  it('returns a Blob', async () => {
    const blob = await exportToWord('第一章', '測試內容', '測試書籍');
    expect(blob).toBeInstanceOf(Blob);
  });

  it('produces a non-empty blob', async () => {
    const blob = await exportToWord('Title', 'Some content here.', 'My Book');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('handles empty content without throwing', async () => {
    const blob = await exportToWord('', '', '');
    expect(blob).toBeInstanceOf(Blob);
  });

  it('handles CJK content without throwing', async () => {
    const blob = await exportToWord('中文標題', '中文內容段落。\n第二行。', '中文書名');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// exportToPdf (single chapter)
// ---------------------------------------------------------------------------

describe('exportToPdf', () => {
  it('returns a Blob', () => {
    const blob = exportToPdf('第一章', '測試內容', '測試書籍');
    expect(blob).toBeInstanceOf(Blob);
  });

  it('produces a non-empty blob', () => {
    const blob = exportToPdf('Chapter 1', 'Hello world content.', 'Test Book');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('handles empty content without throwing', () => {
    const blob = exportToPdf('', '', '');
    expect(blob).toBeInstanceOf(Blob);
  });

  it('handles CJK content without throwing', () => {
    const blob = exportToPdf('中文標題', '中文內容。\n第二段落。', '中文書');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('handles very long content with pagination', () => {
    const longContent = Array.from({ length: 200 }, (_, i) => `Line ${i + 1}: Some text.`).join(
      '\n',
    );
    const blob = exportToPdf('Long Chapter', longContent, 'Big Book');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// exportFullBookToWord
// ---------------------------------------------------------------------------

describe('exportFullBookToWord', () => {
  it('returns a Blob for multi-chapter book', async () => {
    const blob = await exportFullBookToWord(testBook);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('handles book with empty chapters', async () => {
    const emptyBook: Book = {
      ...testBook,
      chapters: [],
    };
    const blob = await exportFullBookToWord(emptyBook);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('handles book with no genre or description', async () => {
    const minimalBook: Book = {
      title: 'Minimal',
      chapters: [testBook.chapters[0]],
      knowledgeGraph: { nodes: [], edges: [] },
      goldenQuotes: [],
    };
    const blob = await exportFullBookToWord(minimalBook);
    expect(blob).toBeInstanceOf(Blob);
  });
});

// ---------------------------------------------------------------------------
// exportFullBookToPdf
// ---------------------------------------------------------------------------

describe('exportFullBookToPdf', () => {
  it('returns a Blob for multi-chapter book', () => {
    const blob = exportFullBookToPdf(testBook);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('handles book with empty chapters', () => {
    const emptyBook: Book = {
      ...testBook,
      chapters: [],
    };
    const blob = exportFullBookToPdf(emptyBook);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('handles CJK book without throwing', () => {
    const blob = exportFullBookToPdf(testBook);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// exportToMarkdown
// ---------------------------------------------------------------------------

describe('exportToMarkdown', () => {
  it('produces markdown with H1 book title', () => {
    const md = exportToMarkdown(testBook);
    expect(md).toContain('# 測試書籍');
  });

  it('includes chapter headings as H2', () => {
    const md = exportToMarkdown(testBook);
    expect(md).toContain('## 第一章');
    expect(md).toContain('## 第二章');
  });

  it('includes genre as blockquote', () => {
    const md = exportToMarkdown(testBook);
    expect(md).toContain('> 類型：一般寫作');
  });

  it('includes status metadata comments', () => {
    const md = exportToMarkdown(testBook);
    expect(md).toContain('<!-- status: 草稿');
    expect(md).toContain('words: 12');
  });

  it('includes chapter content', () => {
    const md = exportToMarkdown(testBook);
    expect(md).toContain('這是測試內容。');
    expect(md).toContain('Hello world.');
  });

  it('includes golden quotes section', () => {
    const md = exportToMarkdown(testBook);
    expect(md).toContain('## 金句');
    expect(md).toContain('> 測試金句');
  });

  it('includes knowledge graph nodes', () => {
    const md = exportToMarkdown(testBook);
    expect(md).toContain('## 知識圖譜');
    expect(md).toContain('**核心概念** (concept)');
  });

  it('includes knowledge graph edges', () => {
    const md = exportToMarkdown(testBook);
    expect(md).toContain('核心概念 → 第一章 [包含]');
  });

  it('includes inspiration notes when present', () => {
    const md = exportToMarkdown(testBook);
    expect(md).toContain('### 靈感筆記');
    expect(md).toContain('一些靈感');
  });

  it('includes references when present', () => {
    const md = exportToMarkdown(testBook);
    expect(md).toContain('### 參考資料');
    expect(md).toContain('參考文獻 A');
  });

  it('handles empty book gracefully', () => {
    const emptyBook: Book = {
      title: 'Empty',
      chapters: [],
      knowledgeGraph: { nodes: [], edges: [] },
      goldenQuotes: [],
    };
    const md = exportToMarkdown(emptyBook);
    expect(md).toContain('# Empty');
    expect(md).not.toContain('## 金句');
    expect(md).not.toContain('## 知識圖譜');
  });
});

// ---------------------------------------------------------------------------
// exportChapterToMarkdown
// ---------------------------------------------------------------------------

describe('exportChapterToMarkdown', () => {
  it('includes chapter title as H2', () => {
    const md = exportChapterToMarkdown(testBook.chapters[0], '測試書籍');
    expect(md).toContain('## 第一章');
  });

  it('includes book title as HTML comment', () => {
    const md = exportChapterToMarkdown(testBook.chapters[0], '測試書籍');
    expect(md).toContain('<!-- book: 測試書籍 -->');
  });

  it('includes content', () => {
    const md = exportChapterToMarkdown(testBook.chapters[0], '測試書籍');
    expect(md).toContain('這是測試內容。');
  });

  it('includes status metadata', () => {
    const md = exportChapterToMarkdown(testBook.chapters[0], '測試書籍');
    expect(md).toContain('status: 草稿');
    expect(md).toContain('words: 12');
  });

  it('handles chapter with empty content', () => {
    const md = exportChapterToMarkdown(testBook.chapters[1], '測試書籍');
    expect(md).toContain('## 第二章');
    expect(md).toContain('status: 待寫');
  });

  it('includes inspiration notes when present', () => {
    const md = exportChapterToMarkdown(testBook.chapters[0], '測試書籍');
    expect(md).toContain('### 靈感筆記');
    expect(md).toContain('一些靈感');
  });

  it('includes references when present', () => {
    const md = exportChapterToMarkdown(testBook.chapters[0], '測試書籍');
    expect(md).toContain('### 參考資料');
    expect(md).toContain('參考文獻 A');
  });
});
