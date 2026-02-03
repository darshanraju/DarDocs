import { describe, it, expect } from 'vitest';
import { convertMarkdownToTipTap } from './markdownConverter';

describe('Markdown Converter', () => {
  describe('convertMarkdownToTipTap', () => {
    it('should return empty paragraph for empty input', () => {
      const result = convertMarkdownToTipTap('');
      expect(result.content.type).toBe('doc');
      expect(result.content.content).toHaveLength(1);
      expect(result.content.content![0].type).toBe('paragraph');
      expect(result.warnings).toEqual([]);
    });

    it('should convert a simple paragraph', () => {
      const result = convertMarkdownToTipTap('Hello World');
      expect(result.content.type).toBe('doc');
      expect(result.content.content).toHaveLength(1);
      const para = result.content.content![0];
      expect(para.type).toBe('paragraph');
      expect(para.content).toHaveLength(1);
      expect(para.content![0].text).toBe('Hello World');
    });

    it('should convert headings h1 through h6', () => {
      const md = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6';
      const result = convertMarkdownToTipTap(md);
      const nodes = result.content.content!;
      expect(nodes).toHaveLength(6);
      for (let i = 0; i < 6; i++) {
        expect(nodes[i].type).toBe('heading');
        expect(nodes[i].attrs!.level).toBe(i + 1);
        expect(nodes[i].content![0].text).toBe(`H${i + 1}`);
      }
    });

    it('should convert bold text', () => {
      const result = convertMarkdownToTipTap('This is **bold** text');
      const para = result.content.content![0];
      expect(para.content).toHaveLength(3);
      expect(para.content![0].text).toBe('This is ');
      expect(para.content![1].text).toBe('bold');
      expect(para.content![1].marks).toEqual([{ type: 'bold' }]);
      expect(para.content![2].text).toBe(' text');
    });

    it('should convert italic text', () => {
      const result = convertMarkdownToTipTap('This is *italic* text');
      const para = result.content.content![0];
      expect(para.content![1].text).toBe('italic');
      expect(para.content![1].marks).toEqual([{ type: 'italic' }]);
    });

    it('should convert inline code', () => {
      const result = convertMarkdownToTipTap('Use `console.log` for debugging');
      const para = result.content.content![0];
      expect(para.content![1].text).toBe('console.log');
      expect(para.content![1].marks).toEqual([{ type: 'code' }]);
    });

    it('should convert strikethrough text', () => {
      const result = convertMarkdownToTipTap('This is ~~deleted~~ text');
      const para = result.content.content![0];
      expect(para.content![1].text).toBe('deleted');
      expect(para.content![1].marks).toEqual([{ type: 'strike' }]);
    });

    it('should convert links', () => {
      const result = convertMarkdownToTipTap('Visit [Google](https://google.com) today');
      const para = result.content.content![0];
      expect(para.content![1].text).toBe('Google');
      expect(para.content![1].marks).toEqual([
        { type: 'link', attrs: { href: 'https://google.com' } },
      ]);
    });

    it('should convert inline images', () => {
      const result = convertMarkdownToTipTap('Text with ![alt text](https://example.com/img.png "Title") here');
      const para = result.content.content![0];
      const img = para.content!.find((n) => n.type === 'image');
      expect(img).toBeDefined();
      expect(img!.attrs!.src).toBe('https://example.com/img.png');
      expect(img!.attrs!.alt).toBe('alt text');
      expect(img!.attrs!.title).toBe('Title');
    });

    it('should convert standalone images', () => {
      const result = convertMarkdownToTipTap('![logo](logo.png)');
      const img = result.content.content![0];
      expect(img.type).toBe('image');
      expect(img.attrs!.src).toBe('logo.png');
      expect(img.attrs!.alt).toBe('logo');
    });

    it('should convert fenced code blocks', () => {
      const md = '```typescript\nconst x = 1;\nconsole.log(x);\n```';
      const result = convertMarkdownToTipTap(md);
      const block = result.content.content![0];
      expect(block.type).toBe('codeBlock');
      expect(block.attrs!.language).toBe('typescript');
      expect(block.content![0].text).toBe('const x = 1;\nconsole.log(x);');
    });

    it('should convert code blocks without language', () => {
      const md = '```\nhello\n```';
      const result = convertMarkdownToTipTap(md);
      const block = result.content.content![0];
      expect(block.type).toBe('codeBlock');
      expect(block.attrs).toBeUndefined();
    });

    it('should convert bullet lists', () => {
      const md = '- Item 1\n- Item 2\n- Item 3';
      const result = convertMarkdownToTipTap(md);
      const list = result.content.content![0];
      expect(list.type).toBe('bulletList');
      expect(list.content).toHaveLength(3);
      expect(list.content![0].type).toBe('listItem');
      expect(list.content![0].content![0].content![0].text).toBe('Item 1');
    });

    it('should convert ordered lists', () => {
      const md = '1. First\n2. Second\n3. Third';
      const result = convertMarkdownToTipTap(md);
      const list = result.content.content![0];
      expect(list.type).toBe('orderedList');
      expect(list.content).toHaveLength(3);
      expect(list.content![0].type).toBe('listItem');
    });

    it('should convert blockquotes', () => {
      const md = '> This is a quote\n> Second line';
      const result = convertMarkdownToTipTap(md);
      const quote = result.content.content![0];
      expect(quote.type).toBe('blockquote');
      expect(quote.content!.length).toBeGreaterThan(0);
    });

    it('should convert horizontal rules', () => {
      const md = 'Before\n\n---\n\nAfter';
      const result = convertMarkdownToTipTap(md);
      const nodes = result.content.content!;
      const hr = nodes.find((n) => n.type === 'horizontalRule');
      expect(hr).toBeDefined();
    });

    it('should convert tables', () => {
      const md = '| Name | Age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |';
      const result = convertMarkdownToTipTap(md);
      const table = result.content.content![0];
      expect(table.type).toBe('table');
      expect(table.content).toHaveLength(3); // header + 2 rows
      // First row should be headers
      expect(table.content![0].content![0].type).toBe('tableHeader');
      // Other rows should be cells
      expect(table.content![1].content![0].type).toBe('tableCell');
    });

    it('should handle nested bold and italic', () => {
      const result = convertMarkdownToTipTap('This is ***bold italic*** text');
      const para = result.content.content![0];
      // Should find content with both bold and italic marks
      const formatted = para.content!.find(
        (n) => n.marks && n.marks.length === 2
      );
      expect(formatted).toBeDefined();
      const markTypes = formatted!.marks!.map((m: any) => m.type);
      expect(markTypes).toContain('bold');
      expect(markTypes).toContain('italic');
    });

    it('should handle mixed content', () => {
      const md = [
        '# Title',
        '',
        'A paragraph with **bold** and *italic*.',
        '',
        '- List item 1',
        '- List item 2',
        '',
        '```js',
        'const x = 1;',
        '```',
      ].join('\n');

      const result = convertMarkdownToTipTap(md);
      const nodes = result.content.content!;
      expect(nodes[0].type).toBe('heading');
      expect(nodes[1].type).toBe('paragraph');
      expect(nodes[2].type).toBe('bulletList');
      expect(nodes[3].type).toBe('codeBlock');
    });

    it('should handle escaped characters', () => {
      const result = convertMarkdownToTipTap('This is \\*not italic\\*');
      const para = result.content.content![0];
      const text = para.content!.map((n) => n.text).join('');
      expect(text).toBe('This is *not italic*');
    });
  });
});
