// Slash command definition (without React-specific parts for testing)
export interface SlashCommandDefinition {
  name: string;
  description: string;
  keywords: string[];
}

// Command definitions for slash menu
export const slashCommandDefinitions: SlashCommandDefinition[] = [
  {
    name: 'Heading 1',
    description: 'Large section heading',
    keywords: ['heading1', 'h1', 'title', 'large'],
  },
  {
    name: 'Heading 2',
    description: 'Medium section heading',
    keywords: ['heading2', 'h2', 'subtitle', 'medium'],
  },
  {
    name: 'Heading 3',
    description: 'Small section heading',
    keywords: ['heading3', 'h3', 'small'],
  },
  {
    name: 'Bullet List',
    description: 'Create a simple bullet list',
    keywords: ['bullet', 'list', 'unordered', 'ul'],
  },
  {
    name: 'Numbered List',
    description: 'Create a numbered list',
    keywords: ['numbered', 'list', 'ordered', 'ol', 'number'],
  },
  {
    name: 'Quote',
    description: 'Add a blockquote',
    keywords: ['quote', 'blockquote', 'citation'],
  },
  {
    name: 'Code Block',
    description: 'Add a code block',
    keywords: ['code', 'codeblock', 'programming', 'snippet'],
  },
  {
    name: 'Divider',
    description: 'Add a horizontal divider',
    keywords: ['divider', 'horizontal', 'rule', 'hr', 'line'],
  },
  {
    name: 'Table',
    description: 'Insert a table',
    keywords: ['table', 'grid', 'spreadsheet'],
  },
  {
    name: 'Whiteboard',
    description: 'Insert a drawing board',
    keywords: ['board', 'whiteboard', 'drawing', 'canvas', 'sketch'],
  },
];

/**
 * Filter slash commands based on a query string.
 * Matches against command name and keywords (case-insensitive).
 */
export function filterSlashCommands(
  commands: SlashCommandDefinition[],
  query: string
): SlashCommandDefinition[] {
  if (!query) return commands;

  const lowerQuery = query.toLowerCase();
  return commands.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(lowerQuery) ||
      cmd.keywords.some((keyword) => keyword.includes(lowerQuery))
  );
}

/**
 * Get a command by exact name match.
 */
export function getCommandByName(
  commands: SlashCommandDefinition[],
  name: string
): SlashCommandDefinition | undefined {
  return commands.find((cmd) => cmd.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get commands that match a specific keyword.
 */
export function getCommandsByKeyword(
  commands: SlashCommandDefinition[],
  keyword: string
): SlashCommandDefinition[] {
  const lowerKeyword = keyword.toLowerCase();
  return commands.filter((cmd) =>
    cmd.keywords.some((kw) => kw.toLowerCase() === lowerKeyword)
  );
}
