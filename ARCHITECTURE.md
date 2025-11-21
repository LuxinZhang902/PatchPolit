# PatchPilot Architecture

## System Overview

PatchPilot is designed as a three-tier application with clear separation of concerns:

1. **Frontend Layer** (Next.js App Router)
2. **Backend API Layer** (Next.js API Routes)
3. **Agent Runtime Layer** (E2B Sandbox)

## Component Breakdown

### 1. Frontend Layer

**Location**: `/app`

**Components**:
- `page.tsx` - Session creation form
- `sessions/[id]/page.tsx` - Real-time session monitoring
- `layout.tsx` - Application shell

**Key Features**:
- Form validation for session creation
- Real-time polling with SWR (2-second intervals)
- Status-based UI rendering
- Responsive design with Tailwind CSS

**Data Flow**:
```
User Input → Form Validation → POST /api/sessions → Redirect to /sessions/:id
                                                    ↓
                                            Poll GET /api/sessions/:id
```

### 2. Backend API Layer

**Location**: `/app/api/sessions`

**Endpoints**:

#### POST `/api/sessions`
- **Purpose**: Create new debug session
- **Validation**: 
  - Required fields: `repoUrl`, `bugDescription`, `reproCommand`
  - GitHub URL format validation
- **Side Effects**:
  - Creates DB record with status='pending'
  - Triggers async sandbox creation
- **Response**: `{ id: string }`

#### GET `/api/sessions/:id`
- **Purpose**: Retrieve session state
- **Use Case**: Polled by frontend for real-time updates
- **Response**: Full `DebugSession` object

#### POST `/api/sessions/:id/update`
- **Purpose**: Update session state (called by agent)
- **Features**:
  - Appends logs (doesn't overwrite)
  - Partial updates supported
  - Atomic operations via Prisma
- **Request Body**: `UpdateSessionRequest`

### 3. Sandbox Manager

**Location**: `/lib/sandbox-manager.ts`

**Responsibilities**:
- Orchestrate E2B sandbox lifecycle
- Generate unique sandbox IDs
- Handle sandbox failures gracefully
- Bridge between API and Agent

**Production Integration Points**:
```typescript
// TODO: Replace with E2B SDK
const sandbox = await E2B.create({ 
  template: 'node-agent',
  apiKey: process.env.E2B_API_KEY 
});

// Upload compiled agent code
await sandbox.uploadFile('agent.js', compiledCode);

// Execute with payload
await sandbox.process.start({ 
  cmd: 'node agent.js',
  env: { PAYLOAD: JSON.stringify(agentPayload) }
});
```

### 4. Agent Runtime

**Location**: `/sandbox/agent.ts`

**Main Function**: `runAgent(payload: AgentPayload)`

**Workflow Steps**:

#### Step 1: Clone Repository
```typescript
git clone --depth 1 --branch ${branch} ${repoUrl}
```
- Creates isolated workspace per session
- Shallow clone for performance
- Error handling with status updates

#### Step 2: Narrow Relevant Files
**Strategy A**: Parse stack traces
```typescript
const filePathPattern = /(?:File |at |in )"?([a-zA-Z0-9_\-\/\.]+\.[a-zA-Z]+)/g;
```

**Strategy B**: Keyword grep
- Extract keywords from bug description
- Search with file type filters
- Limit to 10 most relevant files

#### Step 3: Query Exa MCP
**Purpose**: Learn from similar bugs

**Production Implementation**:
```typescript
const exa = new ExaMCP({ apiKey: process.env.EXA_API_KEY });
const results = await exa.search({
  query: `how to fix: ${errorText}`,
  type: 'neural',
  numResults: 5,
  category: 'github issue'
});
```

**MVP**: Returns hardcoded patterns

#### Step 4: Generate Patch
**Inputs**:
- Bug description
- Relevant file contents
- Exa patterns
- Repository context

**Production Implementation**:
```typescript
const llm = new AnthropicClient({ apiKey: process.env.ANTHROPIC_API_KEY });
const patch = await llm.generatePatch({
  bugDescription,
  files: relevantFileContents,
  patterns: exaPatterns,
  context: repoMetadata
});
```

**MVP**: Adds comment to first relevant file

#### Step 5: Run Tests
```typescript
const testProcess = spawn(command, args, { cwd: repoDir });
```
- Captures stdout/stderr
- Streams to backend logs
- Exit code determines success/failure

#### Step 6: Create PR
**Production Implementation**:
```typescript
const github = new GitHubMCP({ token: process.env.GITHUB_TOKEN });
const pr = await github.createPullRequest({
  owner: extractOwner(repoUrl),
  repo: extractRepo(repoUrl),
  title: `fix: ${bugDescription}`,
  head: 'patchpilot-fix',
  base: baseBranch,
  body: generatePrBody(bugDescription, patterns)
});
```

**MVP**: Returns mock PR URL

### 5. Database Layer

**ORM**: Prisma with SQLite

**Schema**:
```prisma
model DebugSession {
  id             String   @id @default(uuid())
  repoUrl        String
  branch         String   @default("main")
  bugDescription String
  reproCommand   String
  status         String   @default("pending")
  sandboxId      String?
  patchDiff      String?
  logs           String?
  prUrl          String?
  errorMessage   String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

**Key Design Decisions**:
- SQLite for simplicity (file-based, no server)
- String status field (could be enum in production)
- Nullable fields for progressive updates
- Auto-managed timestamps

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  ┌──────────────┐              ┌──────────────┐            │
│  │ Create Form  │─────────────▶│ Session Page │            │
│  └──────────────┘              └──────┬───────┘            │
└────────┬────────────────────────────────┼──────────────────┘
         │ POST /api/sessions             │ GET (poll)
         ▼                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Create     │  │     Get      │  │    Update    │     │
│  │   Session    │  │   Session    │  │   Session    │     │
│  └──────┬───────┘  └──────────────┘  └──────▲───────┘     │
│         │                                     │              │
│         ▼                                     │              │
│  ┌──────────────┐                            │              │
│  │   Prisma     │◀───────────────────────────┘              │
│  │   Client     │                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────┐                                           │
│  │  Sandbox     │                                           │
│  │  Manager     │                                           │
│  └──────┬───────┘                                           │
└─────────┼──────────────────────────────────────────────────┘
          │ Start sandbox
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    E2B Sandbox (Agent)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   runAgent()                         │  │
│  │                                                      │  │
│  │  1. Clone Repo ──────────────────────────┐          │  │
│  │  2. Narrow Files ─────────────────────┐  │          │  │
│  │  3. Query Exa MCP ────────────────┐   │  │          │  │
│  │  4. Generate Patch ───────────┐   │   │  │          │  │
│  │  5. Run Tests ────────────┐   │   │   │  │          │  │
│  │  6. Create PR ────────┐   │   │   │   │  │          │  │
│  │                       │   │   │   │   │  │          │  │
│  │  Each step calls:     │   │   │   │   │  │          │  │
│  │  updateSession() ─────┼───┼───┼───┼───┼──┼──────┐   │  │
│  └───────────────────────┼───┼───┼───┼───┼──┼──────┼───┘  │
└────────────────────────────┼───┼───┼───┼───┼──┼──────┼────┘
                             │   │   │   │   │  │      │
                             ▼   ▼   ▼   ▼   ▼  ▼      │
                          POST /api/sessions/:id/update │
                                                         │
                                                         ▼
                                                    Update DB
```

## Security Considerations

### Current MVP
- No authentication (single-user demo)
- No rate limiting
- No input sanitization beyond basic validation
- No secrets management

### Production Requirements
- [ ] User authentication (OAuth, JWT)
- [ ] API rate limiting
- [ ] Input sanitization and validation
- [ ] Secrets management (Vault, AWS Secrets Manager)
- [ ] Sandbox isolation and resource limits
- [ ] GitHub token scoping (minimal permissions)
- [ ] Audit logging

## Scalability Considerations

### Current Bottlenecks
1. **SQLite**: Single-file database, not suitable for concurrent writes
2. **Local Agent Execution**: No isolation, resource contention
3. **Polling**: Frontend polls every 2s (inefficient at scale)

### Production Improvements
1. **Database**: Migrate to PostgreSQL with connection pooling
2. **Sandbox**: Use E2B for true isolation and horizontal scaling
3. **Real-time Updates**: WebSockets or Server-Sent Events
4. **Queue System**: Redis/Bull for job management
5. **Caching**: Redis for session state
6. **CDN**: Static asset delivery

## Error Handling Strategy

### Agent Errors
- All steps wrapped in try-catch
- Errors logged to session.logs
- Status updated to 'failed'
- errorMessage field populated

### API Errors
- Consistent error response format
- HTTP status codes (400, 404, 500)
- Logged to console (production: structured logging)

### Frontend Errors
- SWR error handling
- User-friendly error messages
- Retry mechanisms

## Testing Strategy (Future)

### Unit Tests
- API route handlers
- Agent step functions
- Utility functions

### Integration Tests
- Full session lifecycle
- Database operations
- API endpoint contracts

### E2E Tests
- User flows (create session → monitor → view PR)
- Error scenarios
- Edge cases

## Deployment

### MVP (Local)
```bash
npm run build
npm start
```

### Production (Vercel)
```bash
vercel deploy
```

**Environment Variables**:
- `DATABASE_URL` → PostgreSQL connection string
- `E2B_API_KEY` → E2B sandbox API key
- `GITHUB_TOKEN` → GitHub MCP token
- `EXA_API_KEY` → Exa MCP API key
- `ANTHROPIC_API_KEY` → Claude API key (for patch generation)

## Monitoring & Observability (Future)

- **Logs**: Structured logging (Winston, Pino)
- **Metrics**: Session success rate, average time per step
- **Tracing**: OpenTelemetry for distributed tracing
- **Alerts**: Failed sessions, API errors, sandbox timeouts

## Future Enhancements

1. **Multi-language Support**: Python, Java, Go, Rust
2. **Incremental Patching**: Multiple iterations if first patch fails
3. **Human-in-the-Loop**: Review patches before PR creation
4. **Batch Processing**: Multiple bugs in one session
5. **Learning System**: Improve from successful/failed patches
6. **Integration**: Jira, Linear, GitHub Issues
