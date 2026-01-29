import mammoth from 'mammoth';
import type { JSONContent } from '@tiptap/react';

interface ConversionResult {
  content: JSONContent;
  warnings: string[];
}

export async function convertDocxToTipTap(file: File): Promise<ConversionResult> {
  const arrayBuffer = await file.arrayBuffer();

  // Convert DOCX to HTML using mammoth
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
      ],
      convertImage: mammoth.images.imgElement(async (image) => {
        // Convert images to base64 data URLs
        const imageBuffer = await image.read();
        const base64 = btoa(
          new Uint8Array(imageBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );
        const contentType = image.contentType || 'image/png';
        return {
          src: `data:${contentType};base64,${base64}`,
        };
      }),
    }
  );

  const html = result.value;
  const warnings = result.messages.map((m) => m.message);

  // Parse HTML to TipTap JSON
  const content = htmlToTipTapJson(html);

  return { content, warnings };
}

function htmlToTipTapJson(html: string): JSONContent {
  // Create a DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const content: JSONContent[] = [];

  // Process each child of the body
  Array.from(doc.body.children).forEach((element) => {
    const node = convertElement(element);
    if (node) {
      content.push(node);
    }
  });

  // Ensure we have at least one paragraph
  if (content.length === 0) {
    content.push({ type: 'paragraph' });
  }

  return {
    type: 'doc',
    content,
  };
}

function convertElement(element: Element): JSONContent | null {
  const tagName = element.tagName.toLowerCase();

  switch (tagName) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = parseInt(tagName[1]) as 1 | 2 | 3 | 4 | 5 | 6;
      return {
        type: 'heading',
        attrs: { level },
        content: convertInlineContent(element),
      };
    }

    case 'p': {
      const content = convertInlineContent(element);
      return {
        type: 'paragraph',
        content: content.length > 0 ? content : undefined,
      };
    }

    case 'ul': {
      return {
        type: 'bulletList',
        content: Array.from(element.children)
          .map((li) => convertListItem(li))
          .filter((item): item is JSONContent => item !== null),
      };
    }

    case 'ol': {
      return {
        type: 'orderedList',
        content: Array.from(element.children)
          .map((li) => convertListItem(li))
          .filter((item): item is JSONContent => item !== null),
      };
    }

    case 'blockquote': {
      return {
        type: 'blockquote',
        content: Array.from(element.children)
          .map((child) => convertElement(child))
          .filter((item): item is JSONContent => item !== null),
      };
    }

    case 'pre': {
      return {
        type: 'codeBlock',
        content: [
          {
            type: 'text',
            text: element.textContent || '',
          },
        ],
      };
    }

    case 'table': {
      return convertTable(element);
    }

    case 'img': {
      const src = element.getAttribute('src');
      if (src) {
        return {
          type: 'image',
          attrs: {
            src,
            alt: element.getAttribute('alt') || '',
            title: element.getAttribute('title') || '',
          },
        };
      }
      return null;
    }

    case 'hr': {
      return { type: 'horizontalRule' };
    }

    case 'br': {
      return {
        type: 'hardBreak',
      };
    }

    default: {
      // Try to convert as paragraph with inline content
      const content = convertInlineContent(element);
      if (content.length > 0) {
        return {
          type: 'paragraph',
          content,
        };
      }
      return null;
    }
  }
}

function convertListItem(element: Element): JSONContent | null {
  if (element.tagName.toLowerCase() !== 'li') return null;

  // Check for nested lists
  const nestedList = element.querySelector('ul, ol');
  const content: JSONContent[] = [];

  // Add paragraph with direct text content
  const textContent = Array.from(element.childNodes)
    .filter(
      (node) =>
        node.nodeType === Node.TEXT_NODE ||
        (node.nodeType === Node.ELEMENT_NODE &&
          !['ul', 'ol'].includes((node as Element).tagName.toLowerCase()))
    )
    .map((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent?.trim() || '';
      }
      return (node as Element).textContent?.trim() || '';
    })
    .join('')
    .trim();

  if (textContent) {
    content.push({
      type: 'paragraph',
      content: convertInlineContent(element, true),
    });
  }

  // Add nested list
  if (nestedList) {
    const nestedNode = convertElement(nestedList);
    if (nestedNode) {
      content.push(nestedNode);
    }
  }

  return {
    type: 'listItem',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  };
}

function convertInlineContent(element: Element, excludeLists = false): JSONContent[] {
  const content: JSONContent[] = [];

  Array.from(element.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text && text.trim()) {
        content.push({
          type: 'text',
          text,
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tagName = el.tagName.toLowerCase();

      // Skip lists if excluding
      if (excludeLists && ['ul', 'ol'].includes(tagName)) {
        return;
      }

      switch (tagName) {
        case 'strong':
        case 'b': {
          const innerContent = convertInlineContent(el);
          innerContent.forEach((item) => {
            if (item.type === 'text') {
              item.marks = [...(item.marks || []), { type: 'bold' }];
            }
            content.push(item);
          });
          break;
        }

        case 'em':
        case 'i': {
          const innerContent = convertInlineContent(el);
          innerContent.forEach((item) => {
            if (item.type === 'text') {
              item.marks = [...(item.marks || []), { type: 'italic' }];
            }
            content.push(item);
          });
          break;
        }

        case 'u': {
          const innerContent = convertInlineContent(el);
          innerContent.forEach((item) => {
            if (item.type === 'text') {
              item.marks = [...(item.marks || []), { type: 'underline' }];
            }
            content.push(item);
          });
          break;
        }

        case 's':
        case 'strike':
        case 'del': {
          const innerContent = convertInlineContent(el);
          innerContent.forEach((item) => {
            if (item.type === 'text') {
              item.marks = [...(item.marks || []), { type: 'strike' }];
            }
            content.push(item);
          });
          break;
        }

        case 'code': {
          const text = el.textContent;
          if (text) {
            content.push({
              type: 'text',
              text,
              marks: [{ type: 'code' }],
            });
          }
          break;
        }

        case 'a': {
          const href = el.getAttribute('href');
          const innerContent = convertInlineContent(el);
          innerContent.forEach((item) => {
            if (item.type === 'text' && href) {
              item.marks = [...(item.marks || []), { type: 'link', attrs: { href } }];
            }
            content.push(item);
          });
          break;
        }

        case 'img': {
          const src = el.getAttribute('src');
          if (src) {
            // Images in inline context - add as separate block
            content.push({
              type: 'image',
              attrs: {
                src,
                alt: el.getAttribute('alt') || '',
                title: el.getAttribute('title') || '',
              },
            } as JSONContent);
          }
          break;
        }

        case 'br': {
          content.push({ type: 'hardBreak' });
          break;
        }

        case 'span': {
          // Just process children
          content.push(...convertInlineContent(el));
          break;
        }

        default: {
          // Try to extract text content
          const text = el.textContent;
          if (text && text.trim()) {
            content.push({
              type: 'text',
              text,
            });
          }
        }
      }
    }
  });

  return content;
}

function convertTable(element: Element): JSONContent {
  const rows: JSONContent[] = [];

  // Process tbody, thead, or direct tr children
  const rowElements = element.querySelectorAll('tr');

  rowElements.forEach((tr, rowIndex) => {
    const cells: JSONContent[] = [];

    Array.from(tr.children).forEach((cell) => {
      const isHeader = cell.tagName.toLowerCase() === 'th' || rowIndex === 0;
      const content = convertInlineContent(cell);

      cells.push({
        type: isHeader ? 'tableHeader' : 'tableCell',
        content: [
          {
            type: 'paragraph',
            content: content.length > 0 ? content : undefined,
          },
        ],
      });
    });

    if (cells.length > 0) {
      rows.push({
        type: 'tableRow',
        content: cells,
      });
    }
  });

  return {
    type: 'table',
    content: rows.length > 0 ? rows : [createEmptyTableRow(3)],
  };
}

function createEmptyTableRow(cols: number): JSONContent {
  return {
    type: 'tableRow',
    content: Array(cols)
      .fill(null)
      .map(() => ({
        type: 'tableCell',
        content: [{ type: 'paragraph' }],
      })),
  };
}
