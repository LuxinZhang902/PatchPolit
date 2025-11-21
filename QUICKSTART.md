# 🚀 Quick Start Guide

Get PatchPilot running in under 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Git installed
- Terminal access

## Setup (Automated)

```bash
# Make setup script executable
chmod +x setup.sh

# Run setup
./setup.sh
```

This will:
1. Create `.env` file
2. Install npm dependencies
3. Generate Prisma client
4. Initialize SQLite database

## Setup (Manual)

If the automated setup doesn't work:

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env

# 3. Add API keys (REQUIRED for sponsor integrations)
# Edit .env and add:
# EXA_API_KEY=your_exa_key (get from https://exa.ai/)
# GROQ_API_KEY=your_groq_key (get from https://console.groq.com/)

# 4. Generate Prisma client
npx prisma generate

# 5. Initialize database
npx prisma migrate dev --name init
```

## Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Test the Application

### Example 1: Simple Test

1. **Repository URL**: `https://github.com/yourusername/test-repo`
2. **Branch**: `main`
3. **Bug Description**: 
   ```
   TypeError: Cannot read property 'name' of undefined
   File: src/user.js, line 42
   ```
4. **Reproduction Command**: `npm test`

### Example 2: Python Project

1. **Repository URL**: `https://github.com/yourusername/python-app`
2. **Branch**: `develop`
3. **Bug Description**:
   ```
   AttributeError: 'NoneType' object has no attribute 'get'
   at login_handler in app/auth.py:15
   ```
4. **Reproduction Command**: `pytest tests/test_auth.py`

## What Happens Next?

1. **Session Created**: You'll be redirected to `/sessions/:id`
2. **Agent Starts**: Watch real-time logs as the agent works
3. **Progress Updates**: Status badge changes as work progresses
4. **Patch Generated**: View the diff of proposed changes
5. **Tests Run**: See test output in logs
6. **PR Created**: Get link to pull request (mock in MVP)

## Status Flow

```
🔵 Pending      → Agent initializing
🔵 Running      → Cloning repo, analyzing files
🟣 Patch Found  → AI generated a fix
🟡 Testing      → Running your reproduction command
🟢 Completed    → Tests passed, PR created
🔴 Failed       → Something went wrong (check logs)
```

## Troubleshooting

### Port 3000 already in use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Database locked error

```bash
# Delete and recreate database
rm prisma/dev.db
npx prisma migrate dev --name init
```

### Module not found errors

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Prisma client errors

```bash
# Regenerate Prisma client
npx prisma generate
```

## Development Tools

### View Database

```bash
npm run prisma:studio
```

Opens Prisma Studio at [http://localhost:5555](http://localhost:5555)

### Check Logs

Agent logs are stored in session records and displayed in the UI.
Backend logs appear in the terminal where you ran `npm run dev`.

### Reset Database

```bash
# Delete all data
rm prisma/dev.db

# Recreate
npx prisma migrate dev --name init
```

## Project Structure Quick Reference

```
PatchPilot/
├── app/
│   ├── api/sessions/          # API endpoints
│   ├── sessions/[id]/         # Session detail page
│   └── page.tsx               # Home page
├── lib/
│   ├── prisma.ts              # Database client
│   └── sandbox-manager.ts     # Sandbox orchestration
├── sandbox/
│   └── agent.ts               # 🤖 Core debugging logic
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── dev.db                 # SQLite database (created after setup)
└── types/
    └── index.ts               # TypeScript types
```

## Next Steps

1. **Read the README**: Full documentation in `README.md`
2. **Architecture**: Deep dive in `ARCHITECTURE.md`
3. **Customize**: Modify agent logic in `sandbox/agent.ts`
4. **Integrate**: Add real E2B, GitHub MCP, Exa MCP (see TODOs in code)

## Demo Tips

For hackathon demos:

1. **Pre-create a test repo** with a known bug
2. **Have the bug description ready** to copy-paste
3. **Use a fast reproduction command** (unit test, not full suite)
4. **Show the UI first**, then explain the architecture
5. **Highlight the agent logs** - they're the most impressive part!

## Common Demo Scenarios

### Scenario 1: Null Pointer Bug
- **Language**: JavaScript/TypeScript
- **Bug**: Accessing property on undefined object
- **Fix**: Add null check
- **Command**: `npm test`

### Scenario 2: Import Error
- **Language**: Python
- **Bug**: Missing import statement
- **Fix**: Add import
- **Command**: `pytest tests/`

### Scenario 3: Type Mismatch
- **Language**: TypeScript
- **Bug**: Wrong type passed to function
- **Fix**: Add type conversion
- **Command**: `npm run type-check`

## Support

For issues or questions:
1. Check `ARCHITECTURE.md` for design details
2. Review code comments (marked with TODO for integration points)
3. Check console logs for errors

Happy debugging! 🔧✨
