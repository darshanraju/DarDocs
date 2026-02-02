import type { ContextProvider } from '@dardocs/core';

export class NoOpContext implements ContextProvider {
  async getRepoContext(): Promise<string> {
    return '';
  }

  async getFileContext(): Promise<string> {
    return '';
  }
}
