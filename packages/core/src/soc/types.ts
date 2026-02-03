import type { GodModeConfig } from '../godMode/types';
import type { AIConfig } from '../workspace/types';

export type SocType = 'godmode';

export interface SocConfig {
  id: string;
  workspaceId: string;
  documentId: string | null;
  name: string;
  type: SocType;
  config: GodModeConfig;
  aiConfig: AIConfig | null;
  lastGeneratedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSocConfigRequest {
  name: string;
  type?: SocType;
  config: GodModeConfig;
  aiConfig?: AIConfig | null;
  documentId?: string;
}

export interface UpdateSocConfigRequest {
  name?: string;
  config?: GodModeConfig;
  aiConfig?: AIConfig | null;
}

export interface SocRegenerationResult {
  socConfigId: string;
  documentId: string;
  generatedAt: string;
}

export interface ApiKeyInfo {
  id: string;
  workspaceId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes?: string[];
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  key: string;
  apiKey: ApiKeyInfo;
}
