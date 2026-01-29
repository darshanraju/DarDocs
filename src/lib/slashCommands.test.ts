import { describe, it, expect } from 'vitest';
import {
  slashCommandDefinitions,
  filterSlashCommands,
  getCommandByName,
  getCommandsByKeyword,
  type SlashCommandDefinition,
} from './slashCommands';

describe('Slash Commands', () => {
  describe('slashCommandDefinitions', () => {
    it('should have all expected commands', () => {
      const expectedCommands = [
        'Heading 1',
        'Heading 2',
        'Heading 3',
        'Bullet List',
        'Numbered List',
        'Quote',
        'Code Block',
        'Divider',
        'Table',
        'Whiteboard',
      ];

      const commandNames = slashCommandDefinitions.map((cmd) => cmd.name);
      expect(commandNames).toEqual(expectedCommands);
    });

    it('should have descriptions for all commands', () => {
      slashCommandDefinitions.forEach((cmd) => {
        expect(cmd.description).toBeDefined();
        expect(cmd.description.length).toBeGreaterThan(0);
      });
    });

    it('should have keywords for all commands', () => {
      slashCommandDefinitions.forEach((cmd) => {
        expect(cmd.keywords).toBeDefined();
        expect(cmd.keywords.length).toBeGreaterThan(0);
      });
    });
  });

  describe('filterSlashCommands', () => {
    it('should return all commands when query is empty', () => {
      const result = filterSlashCommands(slashCommandDefinitions, '');

      expect(result).toEqual(slashCommandDefinitions);
    });

    it('should filter by command name (case-insensitive)', () => {
      const result = filterSlashCommands(slashCommandDefinitions, 'heading');

      expect(result).toHaveLength(3);
      expect(result.map((c) => c.name)).toEqual([
        'Heading 1',
        'Heading 2',
        'Heading 3',
      ]);
    });

    it('should filter by keyword', () => {
      const result = filterSlashCommands(slashCommandDefinitions, 'h1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Heading 1');
    });

    it('should filter by partial keyword match', () => {
      const result = filterSlashCommands(slashCommandDefinitions, 'list');

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((c) => c.name === 'Bullet List')).toBe(true);
      expect(result.some((c) => c.name === 'Numbered List')).toBe(true);
    });

    it('should be case-insensitive', () => {
      const resultLower = filterSlashCommands(slashCommandDefinitions, 'table');
      const resultUpper = filterSlashCommands(slashCommandDefinitions, 'TABLE');
      const resultMixed = filterSlashCommands(slashCommandDefinitions, 'TaBLe');

      expect(resultLower).toEqual(resultUpper);
      expect(resultLower).toEqual(resultMixed);
    });

    it('should return empty array when no matches found', () => {
      const result = filterSlashCommands(slashCommandDefinitions, 'xyz123');

      expect(result).toHaveLength(0);
    });

    it('should match against multiple keywords', () => {
      // "board" keyword should match Whiteboard
      const result = filterSlashCommands(slashCommandDefinitions, 'board');

      expect(result.some((c) => c.name === 'Whiteboard')).toBe(true);
    });

    it('should filter with single character query', () => {
      const result = filterSlashCommands(slashCommandDefinitions, 'q');

      // Should match Quote (name starts with Q)
      expect(result.some((c) => c.name === 'Quote')).toBe(true);
    });

    it('should handle whitespace in query', () => {
      const result = filterSlashCommands(slashCommandDefinitions, 'bullet list');

      expect(result.some((c) => c.name === 'Bullet List')).toBe(true);
    });

    it('should work with custom command list', () => {
      const customCommands: SlashCommandDefinition[] = [
        { name: 'Alpha', description: 'Test 1', keywords: ['test', 'unique'] },
        { name: 'Beta', description: 'Test 2', keywords: ['another'] },
      ];

      const result = filterSlashCommands(customCommands, 'unique');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alpha');
    });
  });

  describe('getCommandByName', () => {
    it('should find command by exact name', () => {
      const result = getCommandByName(slashCommandDefinitions, 'Table');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Table');
    });

    it('should be case-insensitive', () => {
      const result = getCommandByName(slashCommandDefinitions, 'table');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Table');
    });

    it('should return undefined for non-existent command', () => {
      const result = getCommandByName(slashCommandDefinitions, 'NonExistent');

      expect(result).toBeUndefined();
    });

    it('should match full name only', () => {
      const result = getCommandByName(slashCommandDefinitions, 'Head');

      expect(result).toBeUndefined();
    });
  });

  describe('getCommandsByKeyword', () => {
    it('should find commands by exact keyword', () => {
      const result = getCommandsByKeyword(slashCommandDefinitions, 'h1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Heading 1');
    });

    it('should be case-insensitive', () => {
      const result = getCommandsByKeyword(slashCommandDefinitions, 'H1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Heading 1');
    });

    it('should return empty array for non-existent keyword', () => {
      const result = getCommandsByKeyword(slashCommandDefinitions, 'nonexistent');

      expect(result).toHaveLength(0);
    });

    it('should find multiple commands with shared keyword', () => {
      const result = getCommandsByKeyword(slashCommandDefinitions, 'list');

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some((c) => c.name === 'Bullet List')).toBe(true);
      expect(result.some((c) => c.name === 'Numbered List')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty command list', () => {
      const result = filterSlashCommands([], 'test');

      expect(result).toHaveLength(0);
    });

    it('should handle commands with empty keywords array', () => {
      const commandsWithEmptyKeywords: SlashCommandDefinition[] = [
        { name: 'Test', description: 'Test command', keywords: [] },
      ];

      const resultByName = filterSlashCommands(commandsWithEmptyKeywords, 'test');
      const resultByKeyword = filterSlashCommands(commandsWithEmptyKeywords, 'xyz');

      expect(resultByName).toHaveLength(1);
      expect(resultByKeyword).toHaveLength(0);
    });

    it('should handle special characters in query', () => {
      const result = filterSlashCommands(slashCommandDefinitions, 'heading!@#');

      // Should not match anything since special chars are not in names/keywords
      expect(result).toHaveLength(0);
    });

    it('should handle numeric queries', () => {
      const result = filterSlashCommands(slashCommandDefinitions, '1');

      // Should match commands with '1' in name or keywords
      expect(result.some((c) => c.name.includes('1'))).toBe(true);
    });
  });
});
