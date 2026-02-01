export interface LLMProvider {
  name: string;
  complete(prompt: string, systemPrompt?: string): Promise<string>;
}
