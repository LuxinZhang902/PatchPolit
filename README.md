# 🔧 PatchPilot

**Autonomous Debugging Agent** - AI-powered bug fixing that automatically analyzes, patches, and creates pull requests.

## 🎯 Overview

PatchPilot is an autonomous debugging agent built for hackathons that takes a GitHub repository URL, bug description, and reproduction command, then:

1. **Clones** the repository in an E2B sandbox
2. **Analyzes** the codebase to find relevant files
3. **Searches** for similar bug patterns using **Exa** (sponsor integration ⭐)
4. **Generates** an intelligent patch using **Groq** LLM (sponsor integration ⭐)
5. **Tests** the fix with your reproduction command
6. **Creates** a pull request via GitHub MCP

## 🏗️ Architecture

```
┌─────────────┐
│  Next.js    │  ← Frontend (React + TypeScript)
│  Frontend   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Next.js    │  ← Backend API Routes
│  API Routes │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  E2B        │  ← Sandbox Environment
│  Sandbox    │
│  ┌────────┐ │
│  │ Agent  │ │  ← Autonomous debugging logic
│  └────────┘ │
└─────────────┘
       │
       ├─────► GitHub MCP (read/write repo, create PRs)
       └─────► Exa MCP (search similar bugs)
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, SWR
- **Backend**: Next.js API Routes, TypeScript
- **Database**: SQLite via Prisma
- **Runtime**: Node.js
- **Sandbox**: E2B (simulated in MVP)
- **AI/Search**: 
  - **Exa** ⭐ - Neural search for similar bugs (INTEGRATED)
  - **Groq** ⭐ - Ultra-fast LLM inference (INTEGRATED)
- **MCPs**: GitHub MCP (ready for integration)

## 📦 Project Structure

```
PatchPilot/
├── app/
│   ├── api/
│   │   └── sessions/
│   │       ├── route.ts              # POST /api/sessions
│   │       └── [id]/
│   │           ├── route.ts          # GET /api/sessions/:id
│   │           └── update/
│   │               └── route.ts      # POST /api/sessions/:id/update
│   ├── sessions/
│   │   └── [id]/
│   │       └── page.tsx              # Session detail page
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Home page (create session)
│   └── globals.css                   # Global styles
├── lib/
│   ├── prisma.ts                     # Prisma client
│   └── sandbox-manager.ts            # E2B sandbox orchestration
├── sandbox/
│   └── agent.ts                      # Autonomous debugging agent
├── prisma/
│   └── schema.prisma                 # Database schema
├── types/
│   └── index.ts                      # TypeScript types
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd PatchPilot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Initialize the database**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### 🐳 Quick Start with Docker

```bash
# Make script executable
chmod +x docker-start.sh

# Run Docker setup
./docker-start.sh
```

Or manually:
```bash
docker-compose up -d
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 📖 Usage

### Creating a Debug Session

1. Navigate to the home page
2. Fill in the form:
   - **Repository URL**: GitHub repo URL (e.g., `https://github.com/user/repo`)
   - **Branch**: Target branch (default: `main`)
   - **Bug Description**: Describe the bug or paste stack trace
   - **Reproduction Command**: Command to test the fix (e.g., `pytest tests/`)
3. Click "Start Debugging"
4. You'll be redirected to the session page where you can watch progress in real-time

### Monitoring Progress

The session page automatically polls every 2 seconds and shows:
- **Status badge**: Current stage of debugging
- **Execution logs**: Real-time output from the agent
- **Generated patch**: Diff of changes made
- **Pull request link**: When completed successfully

## 🔄 Session Status Flow

```
pending → running → patch_found → tests_running → completed
                                                 ↘ failed
```

## 🎨 API Reference

### POST `/api/sessions`

Create a new debug session.

**Request Body:**
```json
{
  "repoUrl": "https://github.com/user/repo",
  "branch": "main",
  "bugDescription": "Error in login function...",
  "reproCommand": "pytest tests/test_login.py"
}
```

**Response:**
```json
{
  "id": "uuid-session-id"
}
```

### GET `/api/sessions/:id`

Get session details.

**Response:**
```json
{
  "id": "uuid",
  "repoUrl": "https://github.com/user/repo",
  "branch": "main",
  "bugDescription": "...",
  "reproCommand": "...",
  "status": "running",
  "sandboxId": "sandbox_123",
  "patchDiff": "...",
  "logs": "...",
  "prUrl": null,
  "errorMessage": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### POST `/api/sessions/:id/update`

Update session (used by agent).

**Request Body:**
```json
{
  "status": "patch_found",
  "logsAppend": "New log entry\n",
  "patchDiff": "diff content...",
  "prUrl": "https://github.com/user/repo/pull/123",
  "errorMessage": "Error message if failed"
}
```

## 🔌 Integration Points

### E2B Sandbox (Production)

Replace mock implementation in `lib/sandbox-manager.ts`:

```typescript
import { Sandbox } from '@e2b/sdk';

const sandbox = await Sandbox.create({ 
  template: 'node-agent',
  apiKey: process.env.E2B_API_KEY 
});
```

### GitHub MCP (Production)

Replace mock in `sandbox/agent.ts`:

```typescript
import { GitHubMCP } from '@modelcontextprotocol/github';

const github = new GitHubMCP({ token: process.env.GITHUB_TOKEN });
const pr = await github.createPullRequest({
  owner, repo, title, head, base, body
});
```

### Exa MCP (Production)

Replace mock in `sandbox/agent.ts`:

```typescript
import { ExaMCP } from '@modelcontextprotocol/exa';

const exa = new ExaMCP({ apiKey: process.env.EXA_API_KEY });
const results = await exa.search({
  query: `how to fix: ${errorText}`,
  type: 'neural',
  numResults: 5
});
```

## 🧪 Development

### Database Management

```bash
# Generate Prisma client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio
```

### Build for Production

```bash
npm run build
npm start
```

## 📝 MVP Limitations

This MVP includes simulated/mocked implementations for:

- **E2B Sandbox**: Runs agent locally instead of in isolated sandbox
- **GitHub MCP**: Returns mock PR URLs instead of creating real PRs
- **Exa MCP**: Returns hardcoded patterns instead of real search results
- **LLM Integration**: Patch generation is simulated (adds comments)

All integration points are clearly marked with `TODO` comments and can be swapped with real implementations.

## 🎯 Roadmap

- [ ] Integrate real E2B sandbox
- [ ] Connect GitHub MCP for actual PR creation
- [ ] Integrate Exa MCP for intelligent bug pattern search
- [ ] Add LLM integration (Claude/GPT-4) for patch generation
- [ ] Support multiple programming languages
- [ ] Add session history and analytics
- [ ] Implement webhook notifications
- [ ] Add authentication and user management

## 🤝 Contributing

This is a hackathon MVP. Feel free to fork and extend!

## 📄 License

MIT

---

Built with ❤️ for autonomous debugging
