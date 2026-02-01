import OpenAI from 'openai';
import type { LLMProvider } from '../types.js';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model || 'gpt-4o';
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: 1024,
    });

    return response.choices[0]?.message?.content || '';
  }
}
