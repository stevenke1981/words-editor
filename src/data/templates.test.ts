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
    expect(templates.length).toBeGreaterThanOrEqual(20);
    const ids = templates.map((t) => t.id);
    expect(ids).toContain('general-article');
    expect(ids).toContain('tech-tutorial');
    expect(ids).toContain('blog-opinion');
    expect(ids).toContain('finance-book');
    expect(ids).toContain('short-story');
    expect(ids).toContain('speech-script');
    expect(ids).toContain('book-review');
    expect(ids).toContain('sci-fi-flash');
  });

  it('sample chapters include substantial example prose', () => {
    const story = createBookFromTemplate('short-story');
    const first = story.chapters[0];
    expect(first.content.length).toBeGreaterThan(80);
    expect(first.wordCount).toBeGreaterThan(40);

    const speech = createBookFromTemplate('speech-script');
    expect(speech.goldenQuotes.length).toBeGreaterThan(0);
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
