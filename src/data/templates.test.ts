import { describe, it, expect } from 'vitest';
import {
  listTemplates,
  getTemplate,
  createBookFromTemplate,
  DEFAULT_TEMPLATE_ID,
} from './templates';

describe('writing templates', () => {
  it('lists multiple non-finance genres', () => {
    const templates = listTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(8);
    const ids = templates.map((t) => t.id);
    expect(ids).toContain('general-article');
    expect(ids).toContain('tech-tutorial');
    expect(ids).toContain('blog-opinion');
    expect(ids).toContain('finance-book');
  });

  it('defaults to general-article, not finance', () => {
    expect(DEFAULT_TEMPLATE_ID).toBe('general-article');
    const book = createBookFromTemplate(DEFAULT_TEMPLATE_ID);
    expect(book.templateId).toBe('general-article');
    expect(book.genre).not.toMatch(/財經/);
    expect(book.chapters.length).toBeGreaterThan(0);
    expect(book.knowledgeGraph.nodes.length).toBeGreaterThan(0);
  });

  it('each template produces a valid book shape', () => {
    for (const t of listTemplates()) {
      const book = t.createBook();
      expect(book.title.length).toBeGreaterThan(0);
      expect(book.templateId).toBe(t.id);
      expect(book.genre).toBe(t.genre);
      expect(book.chapters.length).toBeGreaterThan(0);
      for (const ch of book.chapters) {
        expect(ch.id).toBeTruthy();
        expect(ch.title).toBeTruthy();
        expect(['完成', '草稿', '待寫']).toContain(ch.status);
        expect(typeof ch.wordCount).toBe('number');
      }
      expect(Array.isArray(book.knowledgeGraph.edges)).toBe(true);
      expect(Array.isArray(book.goldenQuotes)).toBe(true);
    }
  });

  it('getTemplate falls back safely', () => {
    expect(getTemplate('nope').id).toBe(DEFAULT_TEMPLATE_ID);
    expect(getTemplate(undefined).id).toBe(DEFAULT_TEMPLATE_ID);
  });
});
