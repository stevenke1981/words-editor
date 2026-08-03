/**
 * Export Service — Word (.docx), PDF, and Markdown export for chapters and full books.
 *
 * Provides clean export using pre-installed docx + jspdf packages.
 * Follows project style: functional, explicit, Chinese-first.
 *
 * ## CJK PDF paths
 * jsPDF's built-in fonts (helvetica, times, courier) do NOT contain CJK glyphs.
 * The browser/Tauri UI therefore uses `html2canvas` with the platform font stack
 * and rasterizes the page before jsPDF pagination. Direct synchronous service
 * callers can still embed Noto Sans TC via:
 * ```ts
 * doc.addFileToVFS('NotoSansTC-Regular.ttf', base64FontData);
 * doc.addFont('NotoSansTC-Regular.ttf', 'NotoSansTC', 'normal');
 * doc.setFont('NotoSansTC');
 * ```
 * The synchronous fallback detects CJK content and adds a warning watermark
 * when no CJK font is embedded. When a CJK font IS provided, the code path
 * activates automatically via `registerCJKFont()`.
 *
 * Co-Authored-By: Qwen Code (implementation)
 */

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  TableOfContents,
  TextRun,
} from 'docx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Book, Chapter } from '../types';

// ---------------------------------------------------------------------------
// CJK Font Support
// ---------------------------------------------------------------------------

/** Regex matching CJK Unified Ideographs, Hiragana, Katakana, Hangul, and CJK punctuation */
const CJK_REGEX =
  /[\u2E80-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\u{20000}-\u{2FA1F}\u3000-\u303F\u3040-\u30FF\uAC00-\uD7AF]/u;

/**
 * Detect whether a string contains CJK characters.
 * Used to decide font selection and watermark warnings in PDF output.
 */
export function containsCJK(text: string): boolean {
  return CJK_REGEX.test(text);
}

/** Registered CJK font name in jsPDF VFS (null = not registered) */
let cjkFontName: string | null = null;

/**
 * Register a CJK font for PDF rendering.
 * Call this once at app startup if a font file is available (e.g. Tauri bundled asset).
 *
 * @param base64Font - Base64-encoded TTF font data
 * @param fontName - Internal font name to register (default: 'NotoSansTC')
 *
 * @example
 * ```ts
 * const fontData = await loadFontFromAssets(); // base64 string
 * registerCJKFont(fontData, 'NotoSansTC');
 * ```
 */
export function registerCJKFont(base64Font: string, fontName = 'NotoSansTC'): void {
  // We store the registration info; actual VFS addition happens per-doc in createPdfDoc
  cjkFontName = fontName;
  cjkFontBase64 = base64Font;
}

let cjkFontBase64: string | null = null;

/**
 * Create a jsPDF document with CJK font support if registered.
 * Falls back to helvetica with a warning watermark for CJK content.
 */
function createPdfDoc(): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setLanguage('zh-TW');

  if (cjkFontName && cjkFontBase64) {
    doc.addFileToVFS(`${cjkFontName}-Regular.ttf`, cjkFontBase64);
    doc.addFont(`${cjkFontName}-Regular.ttf`, cjkFontName, 'normal');
    doc.setFont(cjkFontName, 'normal');
  } else {
    doc.setFont('helvetica', 'normal');
  }

  return doc;
}

/** Whether the current PDF doc has a usable CJK font */
function hasCJKFont(): boolean {
  return cjkFontName !== null;
}

/** Add a warning watermark to the first page when CJK content is present but no CJK font is embedded */
function addCJKWarning(doc: jsPDF): void {
  if (hasCJKFont()) return;

  const pageWidth = doc.internal.pageSize.getWidth();
  doc.saveGraphicsState();
  try {
    // GState provides transparency; typed in jsPDF v4+ but may need cast in older type defs
    const gstate = new (
      doc as unknown as { GState: new (o: Record<string, number>) => unknown }
    ).GState({ opacity: 0.2 });
    doc.setGState(gstate as never);
  } catch {
    // If GState is unavailable, proceed without transparency
  }
  doc.setFontSize(13);
  doc.setTextColor(200, 50, 50);
  doc.text('CJK font not embedded - install Noto Sans TC for full support', pageWidth / 2, 10, {
    align: 'center',
  });
  doc.setTextColor(0, 0, 0);
  doc.restoreGraphicsState();
}

// ---------------------------------------------------------------------------
// PDF Layout Constants
// ---------------------------------------------------------------------------

const PDF_MARGIN = 20;
const PDF_LINE_HEIGHT = 7;
const PDF_BOTTOM_MARGIN = 15;

/**
 * Build an off-screen, text-only document for jsPDF's HTML renderer. The
 * browser renderer uses the platform CJK font stack (Noto Sans TC on this
 * machine, then Microsoft JhengHei/PingFang) and therefore avoids jsPDF's
 * built-in Latin-font limitation for normal Web/Tauri usage.
 */
function createBrowserPdfArticle(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const article = document.createElement('article');
  Object.assign(article.style, {
    position: 'fixed',
    left: '-100000px',
    top: '0',
    width: '794px',
    padding: '56px',
    background: '#ffffff',
    color: '#111827',
    fontFamily: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif',
    fontSize: '16px',
    lineHeight: '1.8',
    whiteSpace: 'normal',
    zIndex: '-1',
  });
  article.setAttribute('aria-hidden', 'true');
  document.body.appendChild(article);
  return article;
}

function appendBrowserPdfText(parent: HTMLElement, text: string, tagName: 'h1' | 'h2' | 'p') {
  const element = document.createElement(tagName);
  element.textContent = text || '\u00a0';
  element.style.whiteSpace = 'pre-wrap';
  element.style.margin = tagName === 'p' ? '0 0 14px' : '0 0 18px';
  if (tagName === 'h1') element.style.fontSize = '30px';
  if (tagName === 'h2') element.style.fontSize = '22px';
  parent.appendChild(element);
}

const BROWSER_PDF_SECTION_CHAR_LIMIT = 6000;

function createBrowserPdfSections(
  title: string,
  titleTag: 'h1' | 'h2',
  lines: string[],
  leadingLines: string[] = [],
): HTMLElement[] {
  const sections: HTMLElement[] = [];
  let section = createBrowserPdfArticle();
  if (!section) return sections;

  appendBrowserPdfText(section, title, titleTag);
  let sectionCharacters = title.length;
  for (const leadingLine of leadingLines) {
    appendBrowserPdfText(section, leadingLine, 'p');
    sectionCharacters += leadingLine.length + 1;
  }

  for (const line of lines) {
    const nextCharacters = sectionCharacters + line.length + 1;
    if (sectionCharacters > title.length && nextCharacters > BROWSER_PDF_SECTION_CHAR_LIMIT) {
      sections.push(section);
      section = createBrowserPdfArticle();
      if (!section) return sections;
      sectionCharacters = 0;
    }
    appendBrowserPdfText(section, line, 'p');
    sectionCharacters += line.length + 1;
  }

  sections.push(section);
  return sections;
}

async function renderBrowserPdfSections(sections: HTMLElement[]): Promise<Blob> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;
  let renderedPageCount = 0;

  for (const section of sections) {
    const canvas = await html2canvas(section, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794,
    });
    const sliceHeight = Math.max(1, Math.floor((contentHeight / contentWidth) * canvas.width));
    let sourceY = 0;
    let sectionPage = 0;

    while (sourceY < canvas.height) {
      if (renderedPageCount > 0) doc.addPage();
      const currentSliceHeight = Math.min(sliceHeight, canvas.height - sourceY);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = currentSliceHeight;
      const context = slice.getContext('2d');
      if (!context) throw new Error('無法建立 PDF canvas context');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, slice.width, slice.height);
      context.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        currentSliceHeight,
        0,
        0,
        slice.width,
        slice.height,
      );
      const renderedHeight = (currentSliceHeight / canvas.width) * contentWidth;
      doc.addImage(
        slice.toDataURL('image/png'),
        'PNG',
        margin,
        margin,
        contentWidth,
        renderedHeight,
      );
      sourceY += currentSliceHeight;
      renderedPageCount += 1;
      sectionPage += 1;
    }

    if (sectionPage === 0) {
      throw new Error('PDF section 沒有可渲染內容');
    }
  }

  return doc.output('blob');
}

/** Browser/Tauri PDF path that preserves CJK glyphs through the platform font renderer. */
export async function exportToPdfBrowser(
  chapterTitle: string,
  chapterContent: string,
  bookTitle: string,
): Promise<Blob> {
  const sections = createBrowserPdfSections(chapterTitle, 'h1', chapterContent.split(/\r?\n/), [
    `— ${bookTitle}`,
  ]);
  if (sections.length === 0) {
    return exportToPdf(chapterTitle, chapterContent, bookTitle);
  }

  try {
    return await renderBrowserPdfSections(sections);
  } catch (error) {
    console.error('Browser CJK PDF renderer unavailable.', error);
    throw new Error('瀏覽器繁中 PDF 渲染失敗，未產生不完整的 fallback 檔案。');
  } finally {
    for (const section of sections) section.remove();
  }
}

/** Write body text with word-wrap and automatic pagination. Returns final y position. */
function writePdfBody(doc: jsPDF, text: string, startY: number, fontSize = 12): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - PDF_MARGIN * 2;
  let y = startY;

  doc.setFontSize(fontSize);
  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (y > pageHeight - PDF_BOTTOM_MARGIN) {
      doc.addPage();
      y = PDF_MARGIN;
      doc.setFontSize(fontSize);
    }

    if (!para.trim()) {
      y += PDF_LINE_HEIGHT * 0.7;
      continue;
    }

    const wrappedLines: string[] = doc.splitTextToSize(para, maxWidth);
    for (const line of wrappedLines) {
      if (y > pageHeight - PDF_BOTTOM_MARGIN) {
        doc.addPage();
        y = PDF_MARGIN;
      }
      doc.text(line, PDF_MARGIN, y);
      y += PDF_LINE_HEIGHT;
    }
  }

  return y;
}

/** Add page numbers to all pages of the document */
function addPageNumbers(doc: jsPDF): void {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(`${i} / ${totalPages}`, pageWidth / 2, pageHeight - 8, {
      align: 'center',
    });
    doc.setTextColor(0, 0, 0);
  }
}

// ---------------------------------------------------------------------------
// Single-Chapter Export (backward-compatible signatures)
// ---------------------------------------------------------------------------

/**
 * Export a single chapter to .docx Blob.
 *
 * @param chapterTitle - Chapter heading text
 * @param chapterContent - Body text (paragraphs split on \n)
 * @param bookTitle - Parent book title shown as subtitle
 * @returns Promise resolving to a .docx Blob
 */
export async function exportToWord(
  chapterTitle: string,
  chapterContent: string,
  bookTitle: string,
): Promise<Blob> {
  const bodyParagraphs = chapterContent.split('\n').map(
    (line) =>
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: line || '\u00A0',
            font: 'Noto Sans TC',
            size: 24, // 12pt in half-points
          }),
        ],
      }),
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: chapterTitle,
                bold: true,
                size: 36, // 18pt
                font: 'Noto Sans TC',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `\u2014 ${bookTitle}`,
                italics: true,
                size: 22,
                font: 'Noto Sans TC',
                color: '666666',
              }),
            ],
          }),
          ...bodyParagraphs,
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

/**
 * Export a single chapter to .pdf Blob (A4).
 *
 * **CJK Note:** Without an embedded CJK font (see `registerCJKFont`), Chinese
 * characters will not render correctly. A warning watermark is added automatically.
 *
 * @param chapterTitle - Chapter heading text
 * @param chapterContent - Body text (paragraphs split on \n)
 * @param bookTitle - Parent book title shown as subtitle
 * @returns A .pdf Blob
 */
export function exportToPdf(chapterTitle: string, chapterContent: string, bookTitle: string): Blob {
  const doc = createPdfDoc();
  const needsCJKWarning =
    !hasCJKFont() &&
    (containsCJK(chapterTitle) || containsCJK(chapterContent) || containsCJK(bookTitle));

  let y = PDF_MARGIN;

  // Title
  doc.setFontSize(18);
  doc.text(chapterTitle, PDF_MARGIN, y);
  y += 8;

  // Subtitle
  doc.setFontSize(11);
  doc.text(`\u2014 ${bookTitle}`, PDF_MARGIN, y);
  y += 10;

  // Body
  writePdfBody(doc, chapterContent, y);

  // Page numbers
  addPageNumbers(doc);

  // CJK warning watermark
  if (needsCJKWarning) {
    doc.setPage(1);
    addCJKWarning(doc);
  }

  return doc.output('blob');
}

// ---------------------------------------------------------------------------
// Full-Book Word Export
// ---------------------------------------------------------------------------

/**
 * Export an entire book to .docx Blob with:
 * - Title page (book title, genre, date)
 * - Table of contents
 * - Each chapter as a section with page break
 *
 * @param book - The full Book object
 * @returns Promise resolving to a .docx Blob
 */
export async function exportFullBookToWord(book: Book): Promise<Blob> {
  const today = new Date().toISOString().slice(0, 10);

  // --- Title page section ---
  const titlePageChildren: Paragraph[] = [
    new Paragraph({ spacing: { before: 2400 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: book.title,
          bold: true,
          size: 56, // 28pt
          font: 'Noto Sans TC',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: book.genre ?? '',
          size: 24,
          font: 'Noto Sans TC',
          color: '555555',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: today,
          size: 22,
          font: 'Noto Sans TC',
          color: '888888',
        }),
      ],
    }),
  ];

  if (book.description) {
    titlePageChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [
          new TextRun({
            text: book.description,
            italics: true,
            size: 22,
            font: 'Noto Sans TC',
            color: '666666',
          }),
        ],
      }),
    );
  }

  // --- TOC section ---
  const tocChildren = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: '\u76EE\u9304',
          bold: true,
          size: 32,
          font: 'Noto Sans TC',
        }),
      ],
    }),
    new TableOfContents('Table of Contents', {
      hyperlink: true,
      headingStyleRange: '1-2',
    }),
  ];

  // --- Chapter sections ---
  const chapterSections = book.chapters.map((chapter, index) => {
    const children: Paragraph[] = [];

    // Page break before each chapter (except first — it gets its own section)
    if (index > 0) {
      children.push(
        new Paragraph({
          children: [new PageBreak()],
        }),
      );
    }

    // Chapter heading
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: chapter.title,
            bold: true,
            size: 36,
            font: 'Noto Sans TC',
          }),
        ],
      }),
    );

    // Section label + status
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `${chapter.section} \u00B7 ${chapter.status} \u00B7 ${chapter.wordCount} \u5B57`,
            italics: true,
            size: 20,
            font: 'Noto Sans TC',
            color: '888888',
          }),
        ],
      }),
    );

    // Body paragraphs
    const bodyParagraphs = (chapter.content || '').split('\n').map(
      (line) =>
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: line || '\u00A0',
              font: 'Noto Sans TC',
              size: 24,
            }),
          ],
        }),
    );
    children.push(...bodyParagraphs);

    return {
      properties: {},
      children,
    };
  });

  const doc = new Document({
    features: { updateFields: true },
    sections: [
      { properties: {}, children: titlePageChildren },
      { properties: {}, children: tocChildren },
      ...chapterSections,
    ],
  });

  return Packer.toBlob(doc);
}

// ---------------------------------------------------------------------------
// Full-Book PDF Export
// ---------------------------------------------------------------------------

/**
 * Export an entire book to .pdf Blob (A4) with:
 * - Title page
 * - Each chapter starting on a new page
 * - Page numbers in footer
 *
 * **CJK Note:** Without an embedded CJK font (see `registerCJKFont`), Chinese
 * characters will not render correctly. A warning watermark is added automatically.
 *
 * @param book - The full Book object
 * @returns A .pdf Blob
 */
export function exportFullBookToPdf(book: Book): Blob {
  const doc = createPdfDoc();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const today = new Date().toISOString().slice(0, 10);

  const allText = [
    book.title,
    book.genre ?? '',
    ...book.chapters.map((c) => c.title + c.content),
  ].join('');
  const needsCJKWarning = !hasCJKFont() && containsCJK(allText);

  // --- Title page ---
  doc.setFontSize(28);
  doc.text(book.title, pageWidth / 2, pageHeight * 0.35, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  if (book.genre) {
    doc.text(book.genre, pageWidth / 2, pageHeight * 0.35 + 14, { align: 'center' });
  }
  doc.setFontSize(11);
  doc.text(today, pageWidth / 2, pageHeight * 0.35 + 26, { align: 'center' });

  if (book.description) {
    doc.setFontSize(11);
    const descLines: string[] = doc.splitTextToSize(book.description, pageWidth - PDF_MARGIN * 4);
    doc.text(descLines, pageWidth / 2, pageHeight * 0.35 + 42, { align: 'center' });
  }
  doc.setTextColor(0, 0, 0);

  // --- Chapters ---
  for (const chapter of book.chapters) {
    doc.addPage();
    let y = PDF_MARGIN;

    // Chapter title
    doc.setFontSize(18);
    doc.text(chapter.title, PDF_MARGIN, y);
    y += 8;

    // Metadata line
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `${chapter.section} \u00B7 ${chapter.status} \u00B7 ${chapter.wordCount} \u5B57`,
      PDF_MARGIN,
      y,
    );
    doc.setTextColor(0, 0, 0);
    y += 10;

    // Body
    y = writePdfBody(doc, chapter.content || '', y);
  }

  // Page numbers
  addPageNumbers(doc);

  // CJK warning
  if (needsCJKWarning) {
    doc.setPage(1);
    addCJKWarning(doc);
  }

  return doc.output('blob');
}

/** Browser/Tauri full-book PDF path using the platform CJK font renderer. */
export async function exportFullBookToPdfBrowser(book: Book): Promise<Blob> {
  const sections: HTMLElement[] = [];
  const firstSection = createBrowserPdfArticle();
  if (!firstSection) {
    return exportFullBookToPdf(book);
  }
  sections.push(firstSection);

  try {
    appendBrowserPdfText(firstSection, book.title, 'h1');
    if (book.genre) appendBrowserPdfText(firstSection, book.genre, 'p');
    if (book.description) appendBrowserPdfText(firstSection, book.description, 'p');

    for (const chapter of book.chapters) {
      sections.push(
        ...createBrowserPdfSections(chapter.title, 'h2', chapter.content.split(/\r?\n/), [
          `${chapter.section} · ${chapter.status} · ${chapter.wordCount} 字`,
        ]),
      );
    }

    return await renderBrowserPdfSections(sections);
  } catch (error) {
    console.error('Browser CJK full-book PDF renderer unavailable.', error);
    throw new Error('整本書繁中 PDF 渲染失敗，未產生不完整的 fallback 檔案。');
  } finally {
    for (const section of sections) section.remove();
  }
}

// ---------------------------------------------------------------------------
// Markdown Export
// ---------------------------------------------------------------------------

/**
 * Export a single chapter to Markdown string.
 *
 * @param chapter - The chapter to export
 * @param bookTitle - Parent book title for context header
 * @returns Markdown-formatted string
 */
export function exportChapterToMarkdown(chapter: Chapter, bookTitle: string): string {
  const lines: string[] = [];

  lines.push(`<!-- book: ${bookTitle} -->`);
  lines.push('');
  lines.push(`## ${chapter.title}`);
  lines.push('');
  lines.push(
    `<!-- status: ${chapter.status} | words: ${chapter.wordCount} | section: ${chapter.section} -->`,
  );
  lines.push('');

  if (chapter.content) {
    lines.push(chapter.content);
    lines.push('');
  }

  if (chapter.inspirationNotes) {
    lines.push('### \u9748\u611F\u7B46\u8A18');
    lines.push('');
    lines.push(chapter.inspirationNotes);
    lines.push('');
  }

  if (chapter.references && chapter.references.length > 0) {
    lines.push('### \u53C3\u8003\u8CC7\u6599');
    lines.push('');
    for (const ref of chapter.references) {
      lines.push(`- [${ref.title}] (${ref.date})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Export an entire book to Markdown string with:
 * - H1 book title
 * - Each chapter as H2
 * - Status/word-count metadata comments
 * - Golden quotes section
 * - Knowledge graph as a list
 *
 * @param book - The full Book object
 * @returns Markdown-formatted string
 */
export function exportToMarkdown(book: Book): string {
  const lines: string[] = [];

  // Book title
  lines.push(`# ${book.title}`);
  lines.push('');

  if (book.genre) {
    lines.push(`> \u985E\u578B\uFF1A${book.genre}`);
    lines.push('');
  }

  if (book.description) {
    lines.push(book.description);
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Chapters
  for (const chapter of book.chapters) {
    lines.push(`## ${chapter.title}`);
    lines.push('');
    lines.push(
      `<!-- status: ${chapter.status} | words: ${chapter.wordCount} | section: ${chapter.section} | lastSaved: ${chapter.lastSaved} -->`,
    );
    lines.push('');

    if (chapter.content) {
      lines.push(chapter.content);
      lines.push('');
    }

    if (chapter.inspirationNotes) {
      lines.push('### \u9748\u611F\u7B46\u8A18');
      lines.push('');
      lines.push(chapter.inspirationNotes);
      lines.push('');
    }

    if (chapter.references && chapter.references.length > 0) {
      lines.push('### \u53C3\u8003\u8CC7\u6599');
      lines.push('');
      for (const ref of chapter.references) {
        lines.push(`- [${ref.title}] (${ref.date})`);
      }
      lines.push('');
    }
  }

  // Golden Quotes
  if (book.goldenQuotes && book.goldenQuotes.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## \u91D1\u53E5');
    lines.push('');
    for (const quote of book.goldenQuotes) {
      lines.push(`> ${quote.text}`);
      lines.push('');
    }
  }

  // Knowledge Graph
  if (book.knowledgeGraph && book.knowledgeGraph.nodes.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## \u77E5\u8B58\u5716\u8B5C');
    lines.push('');
    for (const node of book.knowledgeGraph.nodes) {
      lines.push(`- **${node.label}** (${node.type})`);
    }
    lines.push('');

    if (book.knowledgeGraph.edges.length > 0) {
      lines.push('### \u95DC\u806F');
      lines.push('');
      for (const edge of book.knowledgeGraph.edges) {
        const sourceNode = book.knowledgeGraph.nodes.find((n) => n.id === edge.source);
        const targetNode = book.knowledgeGraph.nodes.find((n) => n.id === edge.target);
        const label = edge.label ? ` [${edge.label}]` : '';
        lines.push(
          `- ${sourceNode?.label ?? edge.source} \u2192 ${targetNode?.label ?? edge.target}${label}`,
        );
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
