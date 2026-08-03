import { describe, expect, it } from 'vitest';
import { decodeStoredBook, encodeStoredBook, normalizeBook, parseBookJson } from './bookStorage';

const rawBook = {
  title: '測試專案',
  chapters: [
    {
      id: '01',
      chapter: '01',
      title: '第一章',
      section: '開頭',
      status: '草稿',
      content: '<img src=x onerror=alert(1)>內容',
    },
  ],
  knowledgeGraph: {
    nodes: [{ id: 'k1', label: '概念', x: 10, y: 20 }],
  },
};

describe('bookStorage', () => {
  it('normalizes incomplete graph data without crashing the UI', () => {
    const book = normalizeBook(rawBook);

    expect(book).not.toBeNull();
    expect(book?.knowledgeGraph.edges).toEqual([]);
    expect(book?.chapters[0].wordCount).toBeGreaterThan(0);
  });

  it('rejects malformed projects without chapters or title', () => {
    expect(normalizeBook({ title: '無章節', chapters: [] })).toBeNull();
    expect(parseBookJson('{"chapters":[]}')).toBeNull();
  });

  it('preserves the selected chapter through export/import', () => {
    const book = normalizeBook({
      ...rawBook,
      chapters: [rawBook.chapters[0], { ...rawBook.chapters[0], id: '02', title: '第二章' }],
    });
    expect(book).not.toBeNull();
    if (!book) throw new Error('測試資料建立失敗');

    const encoded = encodeStoredBook(book, '02');
    const loaded = parseBookJson(encoded);

    expect(loaded?.currentChapterId).toBe('02');
    expect(loaded?.book.chapters).toHaveLength(2);
  });

  it('migrates raw legacy Book JSON and falls back to the first chapter', () => {
    const loaded = decodeStoredBook(JSON.stringify(rawBook));

    expect(loaded?.currentChapterId).toBe('01');
    expect(loaded?.book.title).toBe('測試專案');
  });
});
