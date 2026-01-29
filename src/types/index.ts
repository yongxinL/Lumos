// Global type definitions for Lumos

export interface ElectronAPI {
  send: (_channel: string, _data: unknown) => void;
  receive: (_channel: string, _func: (..._args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

// Re-export database types
export type {
  AuditLog,
  Skill,
  Policy,
  TrustLevel,
  ActionProposal,
  MCPServer,
  SchemaMigration,
} from './database';

export {};
