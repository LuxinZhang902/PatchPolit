export type SessionStatus = 
  | 'pending' 
  | 'running' 
  | 'patch_found' 
  | 'tests_running' 
  | 'completed' 
  | 'failed';

export interface CreateSessionRequest {
  repoUrl: string;
  branch?: string;
  bugDescription: string;
  reproCommand: string;
}

export interface CreateSessionResponse {
  id: string;
}

export interface UpdateSessionRequest {
  status?: SessionStatus;
  logsAppend?: string;
  patchDiff?: string;
  prUrl?: string;
  errorMessage?: string;
}

export interface DebugSession {
  id: string;
  repoUrl: string;
  branch: string;
  bugDescription: string;
  reproCommand: string;
  status: SessionStatus;
  sandboxId: string | null;
  patchDiff: string | null;
  logs: string | null;
  prUrl: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentPayload {
  sessionId: string;
  repoUrl: string;
  branch: string;
  bugDescription: string;
  reproCommand: string;
  backendBaseUrl: string;
}
