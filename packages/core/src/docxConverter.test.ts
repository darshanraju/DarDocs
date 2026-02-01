import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock mammoth before importing the converter
vi.mock('mammoth', () => ({
  default: {
    convertToHtml: vi.fn(),
    images: {
      imgElement: vi.fn((callback) => callback),
    },
  },
}));

import { convertDocxToTipTap } from './docxConverter';
import mammoth from 'mammoth';

// Helper to create a mock File with arrayBuffer method
function createMockFile(name: string = 'test.docx'): File {
  const mockFile = new File(['mock content'], name, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  // Add arrayBuffer method if not present (jsdom doesn't support it)
  if (!mockFile.arrayBuffer) {
    (mockFile as any).arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
  }

  return mockFile;
}

describe('DOCX Converter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('convertDocxToTipTap', () => {
    it('should convert simple paragraph', async () => {
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<p>Hello World</p>',
        messages: [],
      });

      const file = createMockFile();
      const result = await convertDocxToTipTap(file);

      expect(result.content.type).toBe('doc');
      expect(result.content.content).toBeDefined();
      expect(result.warnings).toEqual([]);
    });

    it('should convert headings correctly', async () => {
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>',
        messages: [],
      });

      const file = createMockFile();
      const result = await convertDocxToTipTap(file);

      expect(result.content.content).toHaveLength(3);
      expect(result.content.content?.[0]).toMatchObject({
        type: 'heading',
        attrs: { level: 1 },
      });
      expect(result.content.content?.[1]).toMatchObject({
        type: 'heading',
        attrs: { level: 2 },
      });
      expect(result.content.content?.[2]).toMatchObject({
        type: 'heading',
        attrs: { level: 3 },
      });
    });

    it('should convert bold text', async () => {
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<p><strong>Bold text</strong></p>',
        messages: [],
      });

      const file = createMockFile();
      const result = await convertDocxToTipTap(file);

      const paragraph = result.content.content?.[0];
      expect(paragraph?.type).toBe('paragraph');
      expect(paragraph?.content?.[0]).toMatchObject({
        type: 'text',
        text: 'Bold text',
        marks: [{ type: 'bold' }],
      });
    });

    it('should convert italic text', async () => {
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<p><em>Italic text</em></p>',
        messages: [],
      });

      const file = createMockFile();
      const result = await convertDocxToTipTap(file);

      const paragraph = result.content.content?.[0];
      expect(paragraph?.content?.[0]).toMatchObject({
        type: 'text',
        text: 'Italic text',
        marks: [{ type: 'italic' }],
      });
    });

    it('should convert underlined text', async () => {
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<p><u>Underlined text</u></p>',
        messages: [],
      });

      const file = createMockFile();
      const result = await convertDocxToTipTap(file);

      const paragraph = result.content.content?.[0];
      expect(paragraph?.content?.[0]).toMatchObject({
        type: 'text',
        marks: [{ type: 'underline' }],
      });
    });

    it('should convert bullet lists', async () => {
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<ul><li>Item 1</li><li>Item 2</li></ul>',
        messages: [],
      });

      const file = createMockFile();
      const result = await convertDocxToTipTap(file);

      expect(result.content.content?.[0]).toMatchObject({
        type: 'bulletList',
      });
      expect(result.content.content?.[0]?.content).toHaveLength(2);
    });

    it('should convert ordered lists', async () => {
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<ol><li>First</li><li>Second</li><li>Third</li></ol>',
        messages: [],
      });

      const file = createMockFile();
      const result = await convertDocxToTipTap(file);

      expect(result.content.content?.[0]).toMatchObject({
        type: 'orderedList',
      });
      expect(result.content.content?.[0]?.content).toHaveLength(3);
    });

    it('should convert blockquotes', async () => {
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<blockquote><p>Quote text</p></blockquote>',
        messages: [],
      });

      const file = createMockFile();
      const result = await convertDocxToTipTap(file);

      expect(result.content.content?.[0]).toMatchObject({
        type: 'blockquote',
      });
    });

    it('should convert code blocks', async () => {
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<pre>const x = 1;</pre>',
        messages: [],
      });

      const file = createMockFile();
      const result = await convertDocxToTipTap(file);

      expect(result.content.content?.[0]).toMatchObject({
        type: 'codeBlock',
      });
    });

    it('should convert links', async () => {
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<p><a href="https://example.com">Link text</a></p>',
        messages: [],
      });

      const file = createMockFile();
      const result = await convertDocxToTipTap(file);

      const paragraph = result.content.content?.[0];
      expect(paragraph?.content?.[0]).toMatchObject({
        type: 'text',
        text: 'Link text',
        marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
      });
    });

    it('should convert tables', async () => {
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<table><tr><th>Header</th></tr><tr><td>Cell</td></tr></table>',
        messages: [],
      });

      const file = createMockFile();
      const result = await convertDocxToTipTap(file);

      expect(result.content.content?.[0]).toMatchObject({
        type: 'table',
      });
    });

    it('should convert horizontal rules', async () => {
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<p>Before</p><hr><p>After</p>',
        messages: [],
      });

      const file = createMockFile();
      const result = await convertDocxToTipTap(file);

      expect(result.content.content?.[1]).toMatchObject({
        type: 'horizontalRule',
      });
    });

    it('should include conversion warnings', async () => {
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<p>Content</p>',
        messages: [
          { type: 'warning', message: 'Unsupported element' },
          { type: 'warning', message: 'Image could not be converted' },
        ],
      });

      const file = createMockFile();
      const result = await convertDocxToTipTap(file);

      expect(result.warnings).toEqual([
        'Unsupported element',
        'Image could not be converted',
      ]);
    });

    it('should handle empty document', async () => {
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '',
        messages: [],
      });

      const file = createMockFile();
      const result = await convertDocxToTipTap(file);

      // Should have at least one paragraph
      expect(result.content.content).toHaveLength(1);
      expect(result.content.content?.[0]).toMatchObject({
        type: 'paragraph',
      });
    });

    it('should convert images with base64 src', async () => {
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<p><img src="data:image/png;base64,ABC123" alt="Test image"></p>',
        messages: [],
      });

      const file = createMockFile();
      const result = await convertDocxToTipTap(file);

      const paragraph = result.content.content?.[0];
      const imageContent = paragraph?.content?.find((c: any) => c.type === 'image');
      expect(imageContent).toMatchObject({
        type: 'image',
        attrs: {
          src: 'data:image/png;base64,ABC123',
          alt: 'Test image',
        },
      });
    });

    it('should handle mixed content', async () => {
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: `
          <h1>Document Title</h1>
          <p>Introduction paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
          <h2>Section 1</h2>
          <ul>
            <li>Item A</li>
            <li>Item B</li>
          </ul>
          <p>Conclusion.</p>
        `,
        messages: [],
      });

      const file = createMockFile();
      const result = await convertDocxToTipTap(file);

      expect(result.content.content?.length).toBeGreaterThan(0);
      expect(result.content.content?.[0]?.type).toBe('heading');
    });
  });
});
