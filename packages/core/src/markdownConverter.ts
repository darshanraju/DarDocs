import type { JSONContent } from '@tiptap/react';

interface ConversionResult {
  content: JSONContent;
  warnings: string[];
}

/**
 * Convert a Markdown string into TipTap-compatible JSONContent.
 * Zero external dependencies — parses common Markdown constructs directly.
 */
export function convertMarkdownToTipTap(text: string): ConversionResult {
  const warnings: string[] = [];
  const lines = text.split('\n');
  const content: JSONContent[] = [];

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code block ───────────────────────────────────
    const fenceMatch = line.match(/^(`{3,}|~{3,})(\w*)/);
    if (fenceMatch) {
      const fence = fenceMatch[1];
      const lang = fenceMatch[2] || null;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(fence)) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      const node: JSONContent = {
        type: 'codeBlock',
        ...(lang ? { attrs: { language: lang } } : {}),
        content: [{ type: 'text', text: codeLines.join('\n') }],
      };
      content.push(node);
      continue;
    }

    // ── Blank line — skip ───────────────────────────────────
    if (line.trim() === '') {
      i++;
      continue;
    }

    // ── Heading ─────────────────────────────────────────────
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const inlineContent = parseInline(headingMatch[2]);
      content.push({
        type: 'heading',
        attrs: { level },
        content: inlineContent,
      });
      i++;
      continue;
    }

    // ── Horizontal rule ─────────────────────────────────────
    if (/^([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line.trim())) {
      content.push({ type: 'horizontalRule' });
      i++;
      continue;
    }

    // ── Table ───────────────────────────────────────────────
    if (isTableLine(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const { node, linesConsumed } = parseTable(lines, i);
      content.push(node);
      i += linesConsumed;
      continue;
    }

    // ── Blockquote ──────────────────────────────────────────
    if (line.match(/^>\s?/)) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].match(/^>\s?/)) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      // Recursively convert blockquote content
      const inner = convertMarkdownToTipTap(quoteLines.join('\n'));
      warnings.push(...inner.warnings);
      content.push({
        type: 'blockquote',
        content: inner.content.content || [{ type: 'paragraph' }],
      });
      continue;
    }

    // ── Unordered list ──────────────────────────────────────
    if (line.match(/^(\s*)([-*+])\s/)) {
      const { node, linesConsumed } = parseList(lines, i, 'bullet');
      content.push(node);
      i += linesConsumed;
      continue;
    }

    // ── Ordered list ────────────────────────────────────────
    if (line.match(/^(\s*)\d+\.\s/)) {
      const { node, linesConsumed } = parseList(lines, i, 'ordered');
      content.push(node);
      i += linesConsumed;
      continue;
    }

    // ── Image (standalone on its own line) ──────────────────
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)$/);
    if (imgMatch) {
      content.push({
        type: 'image',
        attrs: {
          src: imgMatch[2],
          alt: imgMatch[1] || '',
          title: imgMatch[3] || '',
        },
      });
      i++;
      continue;
    }

    // ── Paragraph (collect continuation lines) ──────────────
    {
      const paraLines: string[] = [line];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !lines[i].match(/^(#{1,6})\s/) &&
        !lines[i].match(/^([-*_])\s*\1\s*\1[\s\-*_]*$/) &&
        !lines[i].match(/^(`{3,}|~{3,})/) &&
        !lines[i].match(/^>\s?/) &&
        !lines[i].match(/^\s*([-*+])\s/) &&
        !lines[i].match(/^\s*\d+\.\s/) &&
        !(isTableLine(lines[i]) && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
      ) {
        paraLines.push(lines[i]);
        i++;
      }

      const inlineContent = parseInline(paraLines.join('\n'));
      content.push({
        type: 'paragraph',
        ...(inlineContent.length > 0 ? { content: inlineContent } : {}),
      });
    }
  }

  if (content.length === 0) {
    content.push({ type: 'paragraph' });
  }

  return {
    content: { type: 'doc', content },
    warnings,
  };
}

// ─── Inline parsing ─────────────────────────────────────────

interface InlineToken {
  type: 'text' | 'bold' | 'italic' | 'code' | 'strike' | 'link' | 'image' | 'hardBreak';
  text?: string;
  href?: string;
  src?: string;
  alt?: string;
  title?: string;
  children?: InlineToken[];
}

function parseInline(text: string): JSONContent[] {
  const tokens = tokenizeInline(text);
  return tokensToTipTap(tokens);
}

function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let pos = 0;
  let buf = '';

  const flush = () => {
    if (buf) {
      tokens.push({ type: 'text', text: buf });
      buf = '';
    }
  };

  while (pos < text.length) {
    // Hard break (two trailing spaces + newline, or explicit \n in multiline)
    if (text[pos] === '\n') {
      flush();
      tokens.push({ type: 'hardBreak' });
      pos++;
      continue;
    }

    // Escaped character
    if (text[pos] === '\\' && pos + 1 < text.length && /[\\`*_~\[\]()!#\-+.]/.test(text[pos + 1])) {
      buf += text[pos + 1];
      pos += 2;
      continue;
    }

    // Inline code
    if (text[pos] === '`') {
      const end = text.indexOf('`', pos + 1);
      if (end !== -1) {
        flush();
        tokens.push({ type: 'code', text: text.slice(pos + 1, end) });
        pos = end + 1;
        continue;
      }
    }

    // Image ![alt](src "title")
    if (text[pos] === '!' && text[pos + 1] === '[') {
      const altEnd = text.indexOf(']', pos + 2);
      if (altEnd !== -1 && text[altEnd + 1] === '(') {
        const parenEnd = text.indexOf(')', altEnd + 2);
        if (parenEnd !== -1) {
          flush();
          const alt = text.slice(pos + 2, altEnd);
          const srcPart = text.slice(altEnd + 2, parenEnd);
          const titleMatch = srcPart.match(/^(\S+?)(?:\s+"([^"]*)")?$/);
          tokens.push({
            type: 'image',
            src: titleMatch ? titleMatch[1] : srcPart,
            alt,
            title: titleMatch?.[2] || '',
          });
          pos = parenEnd + 1;
          continue;
        }
      }
    }

    // Link [text](url)
    if (text[pos] === '[') {
      const bracketEnd = text.indexOf(']', pos + 1);
      if (bracketEnd !== -1 && text[bracketEnd + 1] === '(') {
        const parenEnd = text.indexOf(')', bracketEnd + 2);
        if (parenEnd !== -1) {
          flush();
          const linkText = text.slice(pos + 1, bracketEnd);
          const href = text.slice(bracketEnd + 2, parenEnd);
          tokens.push({
            type: 'link',
            text: linkText,
            href,
            children: tokenizeInline(linkText),
          });
          pos = parenEnd + 1;
          continue;
        }
      }
    }

    // Strikethrough ~~text~~
    if (text[pos] === '~' && text[pos + 1] === '~') {
      const end = text.indexOf('~~', pos + 2);
      if (end !== -1) {
        flush();
        tokens.push({
          type: 'strike',
          children: tokenizeInline(text.slice(pos + 2, end)),
        });
        pos = end + 2;
        continue;
      }
    }

    // Bold+Italic ***text*** or ___text___
    if (
      (text[pos] === '*' && text[pos + 1] === '*' && text[pos + 2] === '*') ||
      (text[pos] === '_' && text[pos + 1] === '_' && text[pos + 2] === '_')
    ) {
      const marker = text.slice(pos, pos + 3);
      const end = text.indexOf(marker, pos + 3);
      if (end !== -1) {
        flush();
        tokens.push({
          type: 'bold',
          children: [{ type: 'italic', children: tokenizeInline(text.slice(pos + 3, end)) }],
        });
        pos = end + 3;
        continue;
      }
    }

    // Bold **text** or __text__
    if (
      (text[pos] === '*' && text[pos + 1] === '*') ||
      (text[pos] === '_' && text[pos + 1] === '_')
    ) {
      const marker = text.slice(pos, pos + 2);
      const end = text.indexOf(marker, pos + 2);
      if (end !== -1) {
        flush();
        tokens.push({
          type: 'bold',
          children: tokenizeInline(text.slice(pos + 2, end)),
        });
        pos = end + 2;
        continue;
      }
    }

    // Italic *text* or _text_
    if (text[pos] === '*' || text[pos] === '_') {
      const marker = text[pos];
      const end = text.indexOf(marker, pos + 1);
      if (end !== -1 && end > pos + 1) {
        flush();
        tokens.push({
          type: 'italic',
          children: tokenizeInline(text.slice(pos + 1, end)),
        });
        pos = end + 1;
        continue;
      }
    }

    buf += text[pos];
    pos++;
  }

  flush();
  return tokens;
}

function tokensToTipTap(tokens: InlineToken[], extraMarks: JSONContent['marks'] = []): JSONContent[] {
  const result: JSONContent[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'text': {
        const node: JSONContent = { type: 'text', text: token.text };
        if (extraMarks && extraMarks.length > 0) {
          node.marks = [...extraMarks];
        }
        result.push(node);
        break;
      }

      case 'hardBreak':
        result.push({ type: 'hardBreak' });
        break;

      case 'code': {
        const marks: JSONContent['marks'] = [...(extraMarks || []), { type: 'code' }];
        result.push({ type: 'text', text: token.text, marks });
        break;
      }

      case 'bold': {
        const marks = [...(extraMarks || []), { type: 'bold' }];
        result.push(...tokensToTipTap(token.children || [], marks));
        break;
      }

      case 'italic': {
        const marks = [...(extraMarks || []), { type: 'italic' }];
        result.push(...tokensToTipTap(token.children || [], marks));
        break;
      }

      case 'strike': {
        const marks = [...(extraMarks || []), { type: 'strike' }];
        result.push(...tokensToTipTap(token.children || [], marks));
        break;
      }

      case 'link': {
        const marks = [...(extraMarks || []), { type: 'link', attrs: { href: token.href } }];
        result.push(...tokensToTipTap(token.children || [], marks));
        break;
      }

      case 'image': {
        result.push({
          type: 'image',
          attrs: {
            src: token.src || '',
            alt: token.alt || '',
            title: token.title || '',
          },
        });
        break;
      }
    }
  }

  return result;
}

// ─── List parsing ───────────────────────────────────────────

function parseList(
  lines: string[],
  start: number,
  kind: 'bullet' | 'ordered'
): { node: JSONContent; linesConsumed: number } {
  const items: JSONContent[] = [];
  let i = start;
  const pattern = kind === 'bullet' ? /^(\s*)([-*+])\s(.*)/ : /^(\s*)\d+\.\s(.*)/;

  while (i < lines.length) {
    const match = lines[i].match(pattern);
    if (!match) break;

    // Grab the text for this item
    const itemText = kind === 'bullet' ? match[3] : match[2];
    const itemLines: string[] = [itemText];
    i++;

    // Collect continuation lines (indented, not a new list item)
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^\s*([-*+])\s/) &&
      !lines[i].match(/^\s*\d+\.\s/) &&
      /^\s{2,}/.test(lines[i])
    ) {
      itemLines.push(lines[i].replace(/^\s{2,}/, ''));
      i++;
    }

    const inlineContent = parseInline(itemLines.join('\n'));
    items.push({
      type: 'listItem',
      content: [
        {
          type: 'paragraph',
          ...(inlineContent.length > 0 ? { content: inlineContent } : {}),
        },
      ],
    });
  }

  return {
    node: {
      type: kind === 'bullet' ? 'bulletList' : 'orderedList',
      content: items.length > 0 ? items : [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
    },
    linesConsumed: i - start,
  };
}

// ─── Table parsing ──────────────────────────────────────────

function isTableLine(line: string): boolean {
  return line.trim().startsWith('|') && line.trim().endsWith('|');
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s\-:|]+\|[\s\-:|]*$/.test(line.trim());
}

function parseTable(
  lines: string[],
  start: number
): { node: JSONContent; linesConsumed: number } {
  const rows: JSONContent[] = [];
  let i = start;

  // Header row
  const headerCells = parseTableRow(lines[i]);
  rows.push({
    type: 'tableRow',
    content: headerCells.map((text) => ({
      type: 'tableHeader',
      content: [{ type: 'paragraph', content: parseInline(text) }],
    })),
  });
  i++; // header

  // Separator row — skip
  i++;

  // Data rows
  while (i < lines.length && isTableLine(lines[i])) {
    const cells = parseTableRow(lines[i]);
    // Pad or trim to match header width
    while (cells.length < headerCells.length) cells.push('');

    rows.push({
      type: 'tableRow',
      content: cells.slice(0, headerCells.length).map((text) => ({
        type: 'tableCell',
        content: [{ type: 'paragraph', content: parseInline(text) }],
      })),
    });
    i++;
  }

  return {
    node: { type: 'table', content: rows },
    linesConsumed: i - start,
  };
}

function parseTableRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}
