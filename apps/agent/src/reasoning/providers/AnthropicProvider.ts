import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider } from '../types.js';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model || 'claude-sonnet-4-20250514';
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt || '',
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = message.content.find(b => b.type === 'text');
    return textBlock?.text || '';
  }
}
