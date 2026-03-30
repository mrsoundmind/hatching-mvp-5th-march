/**
 * PDF Export — generates branded PDF from deliverable content.
 * Uses pdfkit for server-side PDF generation with Hatchin branding.
 */

import PDFDocument from 'pdfkit';
import type { Deliverable } from '@shared/schema';

const HATCHIN_BLUE = '#6C82FF';
const HATCHIN_TEXT = '#1E2235';
const HATCHIN_MUTED = '#5A6178';
const HATCHIN_BORDER = '#D8DCE8';
const HATCHIN_SURFACE = '#F3F4F8';

const TYPE_LABELS: Record<string, string> = {
  'prd': 'Product Requirements Document',
  'tech-spec': 'Technical Specification',
  'design-brief': 'Design Brief',
  'gtm-plan': 'Go-to-Market Plan',
  'user-stories': 'User Stories',
  'blog-post': 'Blog Post',
  'landing-copy': 'Landing Page Copy',
  'content-calendar': 'Content Calendar',
  'email-sequence': 'Email Sequence',
  'seo-brief': 'SEO Strategy Brief',
  'project-plan': 'Project Plan',
  'competitive-analysis': 'Competitive Analysis',
  'market-research': 'Market Research Report',
  'process-doc': 'Process Documentation',
  'data-report': 'Data Analysis Report',
  'custom': 'Document',
};

/**
 * Parse markdown content into structured sections for PDF rendering.
 */
function parseMarkdownSections(content: string): Array<{ type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'bullet' | 'hr'; text: string }> {
  const lines = content.split('\n');
  const sections: Array<{ type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'bullet' | 'hr'; text: string }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('### ')) {
      sections.push({ type: 'h3', text: trimmed.slice(4).replace(/\*\*/g, '') });
    } else if (trimmed.startsWith('## ')) {
      sections.push({ type: 'h2', text: trimmed.slice(3).replace(/\*\*/g, '') });
    } else if (trimmed.startsWith('# ')) {
      sections.push({ type: 'h1', text: trimmed.slice(2).replace(/\*\*/g, '') });
    } else if (trimmed === '---' || trimmed === '***') {
      sections.push({ type: 'hr', text: '' });
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
      sections.push({ type: 'bullet', text: stripMarkdown(bulletText) });
    } else {
      sections.push({ type: 'paragraph', text: stripMarkdown(trimmed) });
    }
  }

  return sections;
}

/** Strip inline markdown formatting */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1');
}

/** Extract TOC headings from content */
function extractTOC(content: string): string[] {
  const headings: string[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      headings.push(trimmed.slice(3).replace(/\*\*/g, ''));
    }
  }
  return headings;
}

/**
 * Generate a branded PDF buffer from a deliverable.
 */
export function generateDeliverablePDF(deliverable: Deliverable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 55, right: 55 },
        info: {
          Title: deliverable.title,
          Author: `${deliverable.agentName || 'Agent'} (${deliverable.agentRole || 'Team Member'}) — Hatchin`,
          Subject: TYPE_LABELS[deliverable.type] || 'Document',
          Creator: 'Hatchin — AI Team Platform',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // ─── Cover Header ───────────────────────────────────────
      // Brand bar
      doc.rect(0, 0, doc.page.width, 4).fill(HATCHIN_BLUE);

      // Type badge
      doc.y = 60;
      const typeLabel = (TYPE_LABELS[deliverable.type] || deliverable.type).toUpperCase();
      doc.fontSize(9).font('Helvetica-Bold').fillColor(HATCHIN_BLUE);
      doc.text(typeLabel, doc.page.margins.left, doc.y);
      doc.moveDown(0.6);

      // Title
      doc.fontSize(24).font('Helvetica-Bold').fillColor(HATCHIN_TEXT);
      doc.text(deliverable.title, { width: pageWidth });
      doc.moveDown(0.5);

      // Attribution line
      doc.fontSize(10).font('Helvetica').fillColor(HATCHIN_MUTED);
      const attribution = `Written by ${deliverable.agentName || 'Agent'} (${deliverable.agentRole || 'Team Member'})`;
      const statusText = `Status: ${deliverable.status === 'in_review' ? 'In Review' : deliverable.status === 'complete' ? 'Complete' : 'Draft'}`;
      const versionText = `Version ${deliverable.currentVersion || 1}`;
      doc.text(`${attribution}  •  ${statusText}  •  ${versionText}`, { width: pageWidth });
      doc.moveDown(0.3);

      // Date
      doc.fontSize(9).fillColor(HATCHIN_MUTED);
      doc.text(new Date(deliverable.createdAt!).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
      doc.moveDown(1);

      // Divider
      doc.moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.margins.left + pageWidth, doc.y)
        .strokeColor(HATCHIN_BORDER)
        .lineWidth(0.5)
        .stroke();
      doc.moveDown(1);

      // ─── Table of Contents ──────────────────────────────────
      const tocHeadings = extractTOC(deliverable.content);
      if (tocHeadings.length >= 2) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor(HATCHIN_TEXT);
        doc.text('Table of Contents');
        doc.moveDown(0.4);

        for (let i = 0; i < tocHeadings.length; i++) {
          doc.fontSize(10).font('Helvetica').fillColor(HATCHIN_BLUE);
          doc.text(`${i + 1}.  ${tocHeadings[i]}`, { indent: 8 });
          doc.moveDown(0.15);
        }
        doc.moveDown(0.8);

        // Divider after TOC
        doc.moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.margins.left + pageWidth, doc.y)
          .strokeColor(HATCHIN_BORDER)
          .lineWidth(0.5)
          .stroke();
        doc.moveDown(1);
      }

      // ─── Handoff Notes ──────────────────────────────────────
      if (deliverable.handoffNotes) {
        const boxX = doc.page.margins.left;
        const boxY = doc.y;
        const boxPadding = 10;

        doc.fontSize(9).font('Helvetica-Oblique').fillColor(HATCHIN_MUTED);
        const textHeight = doc.heightOfString(deliverable.handoffNotes, { width: pageWidth - boxPadding * 2 });

        doc.rect(boxX, boxY, pageWidth, textHeight + boxPadding * 2)
          .fillColor(HATCHIN_SURFACE)
          .fill();

        doc.fillColor(HATCHIN_MUTED);
        doc.text(deliverable.handoffNotes, boxX + boxPadding, boxY + boxPadding, { width: pageWidth - boxPadding * 2 });
        doc.y = boxY + textHeight + boxPadding * 2 + 12;
      }

      // ─── Main Content ───────────────────────────────────────
      const sections = parseMarkdownSections(deliverable.content);

      for (const section of sections) {
        // Check if we need a new page (leave room for at least 3 lines)
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
          // Add brand bar on new pages
          doc.rect(0, 0, doc.page.width, 2).fill(HATCHIN_BLUE);
        }

        switch (section.type) {
          case 'h1':
            doc.moveDown(0.6);
            doc.fontSize(18).font('Helvetica-Bold').fillColor(HATCHIN_TEXT);
            doc.text(section.text, { width: pageWidth });
            doc.moveDown(0.3);
            break;
          case 'h2':
            doc.moveDown(0.6);
            doc.fontSize(14).font('Helvetica-Bold').fillColor(HATCHIN_TEXT);
            doc.text(section.text, { width: pageWidth });
            doc.moveDown(0.3);
            break;
          case 'h3':
            doc.moveDown(0.4);
            doc.fontSize(11).font('Helvetica-Bold').fillColor(HATCHIN_TEXT);
            doc.text(section.text, { width: pageWidth });
            doc.moveDown(0.2);
            break;
          case 'bullet':
            doc.fontSize(10).font('Helvetica').fillColor(HATCHIN_TEXT);
            doc.text(`  •  ${section.text}`, { width: pageWidth, indent: 8 });
            doc.moveDown(0.15);
            break;
          case 'hr':
            doc.moveDown(0.4);
            doc.moveTo(doc.page.margins.left, doc.y)
              .lineTo(doc.page.margins.left + pageWidth, doc.y)
              .strokeColor(HATCHIN_BORDER)
              .lineWidth(0.5)
              .stroke();
            doc.moveDown(0.6);
            break;
          case 'paragraph':
            doc.fontSize(10).font('Helvetica').fillColor(HATCHIN_TEXT);
            doc.text(section.text, { width: pageWidth, lineGap: 2 });
            doc.moveDown(0.3);
            break;
        }
      }

      // ─── Footer ─────────────────────────────────────────────
      doc.moveDown(2);

      // Only add footer divider if we have room
      if (doc.y < doc.page.height - 80) {
        doc.moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.margins.left + pageWidth, doc.y)
          .strokeColor(HATCHIN_BORDER)
          .lineWidth(0.5)
          .stroke();
        doc.moveDown(0.6);
      }

      doc.fontSize(8).font('Helvetica').fillColor(HATCHIN_MUTED);
      doc.text(`Generated by Hatchin — AI Team Platform  •  hatchin.app`, doc.page.margins.left, doc.y, {
        width: pageWidth,
        align: 'center',
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
