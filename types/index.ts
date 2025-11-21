export type SessionStatus = 
  | 'pending' 
  | 'running' 
  | 'patch_found' 
  | 'tests_running' 
  | 'completed' 
  | 'failed';

export type CurrentStep = 
  | 'cloning' 
  | 'installing' 
  | 'analyzing' 
  | 'querying' 
  | 'patching' 
  | 'testing' 
  | 'creating_pr';

export interface CreateSessionRequest {
  repoUrl: string;
  branch?: string;
  bugDescription: string;
  reproCommand: string;
  skipTests?: boolean;
}

export interface CreateSessionResponse {
  id: string;
}

export interface UpdateSessionRequest {
  status?: SessionStatus;
  currentStep?: CurrentStep | null;
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
  skipTests: boolean;
  status: SessionStatus;
  currentStep: CurrentStep | null;
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
  skipTests: boolean;
  backendBaseUrl: string;
}
