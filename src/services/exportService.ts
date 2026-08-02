/**
 * Export Service — Word (.docx) and PDF chapter export
 *
 * Provides clean export for current chapter using pre-installed docx + jspdf.
 * Follows project style: functional, explicit, Chinese-first.
 *
 * Co-Authored-By: Fixer (implementation)
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import jsPDF from 'jspdf';

/**
 * Export chapter content to .docx Blob
 * - Title as H1 (18pt bold, Noto Sans TC)
 * - Subtitle with book title (italic)
 * - Body paragraphs split on \n (12pt, Noto Sans TC for CJK)
 */
export async function exportToWord(
  chapterTitle: string,
  chapterContent: string,
  bookTitle: string
): Promise<Blob> {
  const bodyParagraphs = chapterContent.split('\n').map((line) =>
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: line || '\u00A0',
          font: 'Noto Sans TC',
          size: 24, // 12pt in half-points
        }),
      ],
    })
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
                text: `— ${bookTitle}`,
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
 * Export chapter content to .pdf Blob (A4)
 * - Uses setLanguage('zh-TW') for CJK hint
 * - Manual line wrapping + page break handling via splitTextToSize
 * - Helvetica base (CJK glyphs rely on PDF viewer font substitution)
 */
export function exportToPdf(
  chapterTitle: string,
  chapterContent: string,
  bookTitle: string
): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setLanguage('zh-TW');
  doc.setFont('helvetica', 'normal');

  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 7;

  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.text(chapterTitle, margin, y);
  y += 8;

  // Subtitle
  doc.setFontSize(11);
  doc.text(`— ${bookTitle}`, margin, y);
  y += 10;

  // Body content with wrapping + pagination
  doc.setFontSize(12);
  const paragraphs = chapterContent.split('\n');

  for (const para of paragraphs) {
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 20;
      doc.setFontSize(12);
    }

    if (!para.trim()) {
      y += lineHeight * 0.7;
      continue;
    }

    const wrappedLines: string[] = doc.splitTextToSize(para, maxWidth);
    for (const line of wrappedLines) {
      if (y > pageHeight - 15) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
  }

  return doc.output('blob');
}
