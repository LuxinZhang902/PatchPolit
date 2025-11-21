# 🔌 Integration Guide

This guide shows exactly where and how to integrate real E2B, GitHub MCP, and Exa MCP into PatchPilot.

## Overview

The MVP includes **clear integration points** marked with `TODO` comments. All external service calls are abstracted into functions that can be easily replaced.

## 1. E2B Sandbox Integration

### Install E2B SDK

```bash
npm install @e2b/sdk
```

### Update `lib/sandbox-manager.ts`

**Current (Mock)**:
```typescript
const sandboxId = `sandbox_${Date.now()}_${Math.random().toString(36).substring(7)}`;
```

**Replace with**:
```typescript
import { Sandbox } from '@e2b/sdk';

export async function startSandboxForSession(session: DebugSession): Promise<string> {
  try {
    // Create E2B sandbox
    const sandbox = await Sandbox.create({ 
      template: 'base',  // or 'node', 'python', etc.
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: 300000, // 5 minutes
    });

    const sandboxId = sandbox.id;

    // Update session with sandboxId
    await prisma.debugSession.update({
      where: { id: session.id },
      data: { 
        sandboxId,
        status: 'running',
      },
    });

    // Upload agent code to sandbox
    const agentCode = await fs.readFile(
      path.join(process.cwd(), 'sandbox', 'agent.js'), 
      'utf-8'
    );
    await sandbox.filesystem.write('agent.js', agentCode);

    // Prepare agent payload
    const backendBaseUrl = process.env.BACKEND_BASE_URL || 'http://localhost:3000';
    const agentPayload = {
      sessionId: session.id,
      repoUrl: session.repoUrl,
      branch: session.branch,
      bugDescription: session.bugDescription,
      reproCommand: session.reproCommand,
      backendBaseUrl,
    };

    // Execute agent in sandbox
    const process = await sandbox.process.start({
      cmd: `node agent.js '${JSON.stringify(agentPayload)}'`,
      onStdout: (data) => console.log('[Sandbox]', data),
      onStderr: (data) => console.error('[Sandbox]', data),
    });

    // Handle process completion
    process.on('exit', async (exitCode) => {
      console.log(`Sandbox process exited with code ${exitCode}`);
      await sandbox.close();
    });

    return sandboxId;
  } catch (error) {
    console.error('Error starting E2B sandbox:', error);
    
    await prisma.debugSession.update({
      where: { id: session.id },
      data: {
        status: 'failed',
        errorMessage: `Failed to start sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
    });

    throw error;
  }
}
```

### Environment Variables

Add to `.env`:
```bash
E2B_API_KEY=your_e2b_api_key_here
```

Get your API key from: https://e2b.dev/dashboard

---

## 2. GitHub MCP Integration

### Install GitHub MCP

```bash
npm install @modelcontextprotocol/sdk-typescript
```

### Update `sandbox/agent.ts` - createPullRequest()

**Current (Mock)**:
```typescript
const prUrl = `${repoUrl}/pull/12345`;
```

**Replace with**:
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function createPullRequest(
  sessionId: string,
  repoUrl: string,
  baseBranch: string,
  bugDescription: string,
  workspaceDir: string,
  backendBaseUrl: string
): Promise<void> {
  await updateSession(sessionId, backendBaseUrl, {
    logsAppend: `[${new Date().toISOString()}] Creating pull request...\n`,
  });

  try {
    // Initialize GitHub MCP client
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        ...process.env,
        GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
      },
    });

    const client = new Client({
      name: 'patchpilot-client',
      version: '1.0.0',
    }, {
      capabilities: {},
    });

    await client.connect(transport);

    // Extract owner and repo from URL
    const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    if (!urlMatch) {
      throw new Error('Invalid GitHub URL');
    }
    const [, owner, repo] = urlMatch;

    // Push branch to remote (requires git credentials)
    const repoDir = path.join(workspaceDir, 'repo');
    await execAsync('git push origin patchpilot-fix', { cwd: repoDir });

    // Create PR via GitHub MCP
    const result = await client.callTool({
      name: 'create_pull_request',
      arguments: {
        owner,
        repo,
        title: `fix: ${bugDescription.substring(0, 72)}`,
        body: generatePrBody(bugDescription),
        head: 'patchpilot-fix',
        base: baseBranch,
      },
    });

    const prData = JSON.parse(result.content[0].text);
    const prUrl = prData.html_url;

    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ✓ Pull request created: ${prUrl}\n`,
      status: 'completed',
      prUrl,
    });

    await client.close();
  } catch (error) {
    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ✗ Failed to create PR: ${error}\n`,
      errorMessage: `PR creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    throw error;
  }
}

function generatePrBody(bugDescription: string): string {
  return `## 🤖 Automated Fix by PatchPilot

### Bug Description
${bugDescription}

### Changes Made
This PR contains an automated fix generated by PatchPilot's AI debugging agent.

### Testing
The fix has been validated against the provided reproduction command.

### Review Notes
Please review the changes carefully before merging. While the automated tests passed, human review is recommended.

---
*Generated by [PatchPilot](https://github.com/yourusername/patchpilot)*
`;
}
```

### Environment Variables

Add to `.env`:
```bash
GITHUB_TOKEN=ghp_your_github_personal_access_token
```

**Token Permissions Required**:
- `repo` (full control of private repositories)
- `workflow` (if modifying GitHub Actions)

Create token at: https://github.com/settings/tokens

---

## 3. Exa MCP Integration

### Install Exa MCP

```bash
npm install @modelcontextprotocol/sdk-typescript
```

### Update `sandbox/agent.ts` - queryExaForSimilarBugs()

**Current (Mock)**:
```typescript
const mockPatterns = [
  'Common fix: Check for null/undefined values...',
  // ...
];
return mockPatterns;
```

**Replace with**:
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function queryExaForSimilarBugs(
  sessionId: string,
  errorText: string,
  backendBaseUrl: string
): Promise<string[]> {
  await updateSession(sessionId, backendBaseUrl, {
    logsAppend: `[${new Date().toISOString()}] Querying Exa MCP for similar bug patterns...\n`,
  });

  try {
    // Initialize Exa MCP client
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-exa'],
      env: {
        ...process.env,
        EXA_API_KEY: process.env.EXA_API_KEY,
      },
    });

    const client = new Client({
      name: 'patchpilot-client',
      version: '1.0.0',
    }, {
      capabilities: {},
    });

    await client.connect(transport);

    // Search for similar bugs
    const searchQuery = `how to fix: ${errorText.substring(0, 200)}`;
    
    const result = await client.callTool({
      name: 'exa_search',
      arguments: {
        query: searchQuery,
        type: 'neural',
        numResults: 5,
        category: 'github',
        useAutoprompt: true,
      },
    });

    const searchResults = JSON.parse(result.content[0].text);
    
    // Extract patterns from results
    const patterns = searchResults.results.map((r: any) => {
      return `${r.title}\n${r.text.substring(0, 200)}...`;
    });

    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ✓ Retrieved ${patterns.length} similar patterns from Exa\n`,
    });

    await client.close();

    return patterns;
  } catch (error) {
    console.error('Exa MCP error:', error);
    
    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ⚠ Exa search failed, continuing without patterns\n`,
    });

    // Return empty array on failure (non-critical)
    return [];
  }
}
```

### Environment Variables

Add to `.env`:
```bash
EXA_API_KEY=your_exa_api_key_here
```

Get your API key from: https://exa.ai/

---

## 4. LLM Integration (Patch Generation)

### Option A: Anthropic Claude

```bash
npm install @anthropic-ai/sdk
```

**Update `sandbox/agent.ts` - generatePatch()**:

```typescript
import Anthropic from '@anthropic-ai/sdk';

async function generatePatch(
  sessionId: string,
  bugDescription: string,
  relevantFiles: string[],
  exaPatterns: string[],
  workspaceDir: string,
  backendBaseUrl: string
): Promise<void> {
  await updateSession(sessionId, backendBaseUrl, {
    logsAppend: `[${new Date().toISOString()}] Generating patch using Claude AI...\n`,
    status: 'patch_found',
  });

  const repoDir = path.join(workspaceDir, 'repo');

  try {
    // Read relevant file contents
    const fileContents = await Promise.all(
      relevantFiles.map(async (file) => {
        const content = await fs.readFile(path.join(repoDir, file), 'utf-8');
        return { path: file, content };
      })
    );

    // Build prompt
    const prompt = `You are a debugging expert. Fix the following bug:

BUG DESCRIPTION:
${bugDescription}

RELEVANT FILES:
${fileContents.map(f => `
File: ${f.path}
\`\`\`
${f.content}
\`\`\`
`).join('\n')}

SIMILAR BUG PATTERNS:
${exaPatterns.join('\n\n')}

Provide ONLY the fixed code for each file. Format as:
FILE: path/to/file.ext
\`\`\`
fixed code here
\`\`\`
`;

    // Call Claude
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const response = message.content[0].text;

    // Parse response and apply fixes
    const filePattern = /FILE: (.+?)\n```[\w]*\n([\s\S]+?)\n```/g;
    let match;
    
    await execAsync('git checkout -b patchpilot-fix', { cwd: repoDir });
    
    while ((match = filePattern.exec(response)) !== null) {
      const [, filePath, fixedCode] = match;
      const fullPath = path.join(repoDir, filePath.trim());
      
      await fs.writeFile(fullPath, fixedCode.trim());
      await execAsync(`git add "${filePath.trim()}"`, { cwd: repoDir });
    }

    await execAsync(`git commit -m "fix: ${bugDescription.substring(0, 50)}"`, { cwd: repoDir });

    // Generate diff
    const { stdout: diff } = await execAsync('git diff main...patchpilot-fix', { cwd: repoDir });

    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ✓ Patch generated successfully\n`,
      patchDiff: diff,
    });
  } catch (error) {
    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ✗ Failed to generate patch: ${error}\n`,
    });
    throw error;
  }
}
```

**Environment Variables**:
```bash
ANTHROPIC_API_KEY=sk-ant-your-api-key
```

### Option B: OpenAI GPT-4

```bash
npm install openai
```

Replace Claude code with:

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [{
    role: 'system',
    content: 'You are a debugging expert that fixes code bugs.',
  }, {
    role: 'user',
    content: prompt,
  }],
  max_tokens: 4096,
});

const response = completion.choices[0].message.content;
```

**Environment Variables**:
```bash
OPENAI_API_KEY=sk-your-openai-api-key
```

---

## 5. Complete Environment Variables

After all integrations, your `.env` should look like:

```bash
# Backend
BACKEND_BASE_URL=http://localhost:3000

# Database
DATABASE_URL="file:./dev.db"

# E2B Sandbox
E2B_API_KEY=your_e2b_api_key

# GitHub MCP
GITHUB_TOKEN=ghp_your_github_token

# Exa MCP
EXA_API_KEY=your_exa_api_key

# LLM (choose one or both)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
OPENAI_API_KEY=sk-your-openai-key
```

---

## 6. Testing Integrations

### Test E2B
```typescript
// test/e2b.test.ts
import { Sandbox } from '@e2b/sdk';

const sandbox = await Sandbox.create({ 
  apiKey: process.env.E2B_API_KEY 
});
console.log('Sandbox created:', sandbox.id);
await sandbox.close();
```

### Test GitHub MCP
```bash
# Ensure GitHub MCP server is installed
npx -y @modelcontextprotocol/server-github

# Test with MCP Inspector
npx @modelcontextprotocol/inspector npx -y @modelcontextprotocol/server-github
```

### Test Exa MCP
```bash
# Test Exa MCP server
npx -y @modelcontextprotocol/server-exa

# Test with MCP Inspector
npx @modelcontextprotocol/inspector npx -y @modelcontextprotocol/server-exa
```

---

## 7. Deployment Considerations

### Production Checklist

- [ ] All API keys stored in secure environment variables
- [ ] E2B sandbox timeout configured appropriately
- [ ] GitHub token has minimal required permissions
- [ ] Rate limiting implemented for external APIs
- [ ] Error handling for all external service calls
- [ ] Logging for debugging integration issues
- [ ] Monitoring for API quota usage
- [ ] Fallback behavior when services are unavailable

### Cost Optimization

- **E2B**: Use appropriate timeout values, close sandboxes promptly
- **LLM**: Cache similar bug patterns, use smaller models when possible
- **Exa**: Limit search results, cache frequently searched patterns
- **GitHub**: Batch operations when possible

---

## 8. Troubleshooting

### E2B Issues
- **Timeout errors**: Increase `timeoutMs` in sandbox creation
- **Connection errors**: Check API key and network connectivity
- **File upload fails**: Verify file paths and permissions

### GitHub MCP Issues
- **Authentication failed**: Verify token permissions
- **PR creation fails**: Check branch exists and is pushed to remote
- **Rate limit**: Implement exponential backoff

### Exa MCP Issues
- **No results**: Try different query formulations
- **API quota exceeded**: Implement caching layer
- **Connection timeout**: Add retry logic

### LLM Issues
- **Token limit exceeded**: Reduce file content in prompt
- **Poor quality fixes**: Improve prompt engineering
- **API errors**: Implement fallback to simpler models

---

## Next Steps

1. **Start with E2B**: Get sandboxing working first
2. **Add LLM**: Enable real patch generation
3. **Integrate Exa**: Improve patch quality with patterns
4. **Add GitHub MCP**: Enable real PR creation
5. **Test end-to-end**: Verify full workflow
6. **Monitor & optimize**: Track success rates and costs

For questions or issues, refer to:
- E2B Docs: https://e2b.dev/docs
- MCP Docs: https://modelcontextprotocol.io/
- Anthropic Docs: https://docs.anthropic.com/
- OpenAI Docs: https://platform.openai.com/docs
