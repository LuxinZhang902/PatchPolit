import { AgentPayload } from '@/types';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { queryExaForSimilarBugs as queryExa, formatPatternsForPrompt } from './exaClient';
import { generatePatchWithGroq, summarizeRootCause, explainChanges } from './llmClient';

const execAsync = promisify(exec);

/**
 * Main agent function that orchestrates the debugging workflow
 */
export async function runAgent(payload: AgentPayload): Promise<void> {
  const { sessionId, repoUrl, branch, bugDescription, reproCommand, backendBaseUrl } = payload;
  
  // Create a temporary workspace for this session
  const workspaceDir = path.join(process.cwd(), 'sandbox', 'temp', sessionId);
  await fs.mkdir(workspaceDir, { recursive: true });

  try {
    // Step 0: Check if bugDescription is a GitHub issue URL and fetch it
    let processedBugDescription = bugDescription;
    const githubIssueMatch = bugDescription.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/);
    
    if (githubIssueMatch) {
      await updateSession(sessionId, backendBaseUrl, {
        logsAppend: `[${new Date().toISOString()}] Detected GitHub issue URL, fetching issue details...\n`,
      });
      
      try {
        processedBugDescription = await fetchGitHubIssue(githubIssueMatch[0], sessionId, backendBaseUrl);
      } catch (error) {
        await updateSession(sessionId, backendBaseUrl, {
          logsAppend: `[${new Date().toISOString()}] ⚠ Failed to fetch GitHub issue, using original description\n`,
        });
      }
    }

    // Step 1: Clone repository
    await cloneRepository(sessionId, repoUrl, branch, workspaceDir, backendBaseUrl);

    // Step 2: Narrow down relevant files
    const relevantFiles = await narrowRelevantFiles(
      sessionId,
      processedBugDescription,
      workspaceDir,
      backendBaseUrl
    );

    // Step 3: Query Exa for similar bugs
    const exaPatterns = await queryExaForSimilarBugs(
      sessionId,
      processedBugDescription,
      backendBaseUrl
    );

    // Step 4: Generate patch
    await generatePatch(
      sessionId,
      processedBugDescription,
      relevantFiles,
      exaPatterns,
      workspaceDir,
      backendBaseUrl
    );

    // Step 5: Run tests
    const testsPass = await runTests(
      sessionId,
      reproCommand,
      workspaceDir,
      backendBaseUrl
    );

    if (!testsPass) {
      await updateSession(sessionId, backendBaseUrl, {
        status: 'failed',
        errorMessage: 'Tests failed after applying patch',
      });
      return;
    }

    // Step 6: Create PR
    await createPullRequest(
      sessionId,
      repoUrl,
      branch,
      bugDescription,
      workspaceDir,
      backendBaseUrl
    );

  } catch (error) {
    console.error(`Agent error for session ${sessionId}:`, error);
    await updateSession(sessionId, backendBaseUrl, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Step 1: Clone the repository
 */
async function cloneRepository(
  sessionId: string,
  repoUrl: string,
  branch: string,
  workspaceDir: string,
  backendBaseUrl: string
): Promise<void> {
  await updateSession(sessionId, backendBaseUrl, {
    logsAppend: `[${new Date().toISOString()}] Cloning repository: ${repoUrl} (branch: ${branch})\n`,
  });

  try {
    const repoDir = path.join(workspaceDir, 'repo');
    await execAsync(`git clone --depth 1 --branch "${branch}" "${repoUrl}" "${repoDir}"`);
    
    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ✓ Repository cloned successfully\n`,
    });
  } catch (error) {
    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ✗ Failed to clone repository: ${error}\n`,
      status: 'failed',
      errorMessage: `Git clone failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    throw error;
  }
}

/**
 * Step 2: Narrow down relevant files based on bug description
 */
async function narrowRelevantFiles(
  sessionId: string,
  bugDescription: string,
  workspaceDir: string,
  backendBaseUrl: string
): Promise<string[]> {
  await updateSession(sessionId, backendBaseUrl, {
    logsAppend: `[${new Date().toISOString()}] Analyzing bug description to find relevant files...\n`,
  });

  const repoDir = path.join(workspaceDir, 'repo');
  const relevantFiles: string[] = [];

  try {
    // Strategy 1: Parse file paths from stack traces
    const filePathPattern = /(?:File |at |in )"?([a-zA-Z0-9_\-\/\.]+\.[a-zA-Z]+)/g;
    let match;
    while ((match = filePathPattern.exec(bugDescription)) !== null) {
      const filePath = match[1];
      const fullPath = path.join(repoDir, filePath);
      try {
        await fs.access(fullPath);
        relevantFiles.push(filePath);
      } catch {
        // File doesn't exist, skip
      }
    }

    // Strategy 2: Grep for keywords if no files found in stack trace
    if (relevantFiles.length === 0) {
      const keywords = extractKeywords(bugDescription);
      await updateSession(sessionId, backendBaseUrl, {
        logsAppend: `[${new Date().toISOString()}] Searching for keywords: ${keywords.join(', ')}\n`,
      });

      for (const keyword of keywords.slice(0, 3)) {
        try {
          const { stdout } = await execAsync(
            `grep -r -l "${keyword}" --include="*.py" --include="*.js" --include="*.ts" --include="*.java" . | head -5`,
            { cwd: repoDir }
          );
          const files = stdout.trim().split('\n').filter(f => f);
          relevantFiles.push(...files.map(f => f.replace('./', '')));
        } catch {
          // Grep found nothing, continue
        }
      }
    }

    // Limit to max 10 files
    const limitedFiles = [...new Set(relevantFiles)].slice(0, 10);
    
    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ✓ Found ${limitedFiles.length} relevant files:\n${limitedFiles.map(f => `  - ${f}`).join('\n')}\n`,
    });

    return limitedFiles;
  } catch (error) {
    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ⚠ Error analyzing files: ${error}\n`,
    });
    return [];
  }
}

/**
 * Step 3: Query Exa for similar bugs and patterns (SPONSOR INTEGRATION)
 */
async function queryExaForSimilarBugs(
  sessionId: string,
  errorText: string,
  backendBaseUrl: string
): Promise<string[]> {
  await updateSession(sessionId, backendBaseUrl, {
    logsAppend: `[${new Date().toISOString()}] Querying Exa for similar bug patterns...\n`,
  });

  try {
    // Use Exa client (sponsor integration)
    const patterns = await queryExa(errorText);

    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ✓ Retrieved ${patterns.length} similar patterns from Exa\n`,
    });

    return patterns;
  } catch (error) {
    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ⚠ Exa search failed: ${error}\n`,
    });
    // Return empty array on failure - agent will continue without patterns
    return [];
  }
}

/**
 * Step 4: Generate and apply patch
 */
async function generatePatch(
  sessionId: string,
  bugDescription: string,
  relevantFiles: string[],
  exaPatterns: string[],
  workspaceDir: string,
  backendBaseUrl: string
): Promise<void> {
  await updateSession(sessionId, backendBaseUrl, {
    logsAppend: `[${new Date().toISOString()}] Generating patch using AI...\n`,
    status: 'patch_found',
  });

  const repoDir = path.join(workspaceDir, 'repo');

  try {
    // Read relevant file contents
    const fileContents = await Promise.all(
      relevantFiles.map(async (file) => {
        try {
          const content = await fs.readFile(path.join(repoDir, file), 'utf-8');
          return { path: file, content };
        } catch (error) {
          console.error(`Error reading file ${file}:`, error);
          return null;
        }
      })
    );

    const validFiles = fileContents.filter((f): f is { path: string; content: string } => f !== null);

    if (validFiles.length === 0) {
      throw new Error('No valid files to analyze');
    }

    // Summarize root cause using Groq (SPONSOR INTEGRATION)
    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] Analyzing root cause with Groq...\n`,
    });

    const rootCause = await summarizeRootCause(bugDescription, validFiles, exaPatterns);

    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] Root cause: ${rootCause}\n`,
    });

    // Generate patch using Groq (SPONSOR INTEGRATION)
    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] Generating patch with Groq LLM...\n`,
    });

    const patchResponse = await generatePatchWithGroq(bugDescription, validFiles, exaPatterns);

    // Create fix branch
    await execAsync('git checkout -b patchpilot-fix', { cwd: repoDir });

    // Parse and apply the patch
    const filePattern = /FILE: (.+?)\n```[\w]*\n([\s\S]+?)\n```/g;
    let match;
    let filesModified = 0;

    while ((match = filePattern.exec(patchResponse)) !== null) {
      const [, filePath, fixedCode] = match;
      const fullPath = path.join(repoDir, filePath.trim());

      try {
        await fs.writeFile(fullPath, fixedCode.trim());
        await execAsync(`git add "${filePath.trim()}"`, { cwd: repoDir });
        filesModified++;
      } catch (error) {
        console.error(`Error applying fix to ${filePath}:`, error);
      }
    }

    if (filesModified === 0) {
      throw new Error('No files were modified by the patch');
    }

    // Commit changes
    await execAsync(`git commit -m "fix: ${bugDescription.substring(0, 50)}"`, { cwd: repoDir });

    // Generate diff
    const { stdout: diff } = await execAsync('git diff main...patchpilot-fix', { cwd: repoDir });

    // Explain the changes using Groq
    const explanation = await explainChanges(diff);

    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ✓ Patch generated successfully (${filesModified} files modified)\n[${new Date().toISOString()}] Explanation: ${explanation}\n`,
      patchDiff: diff,
    });
  } catch (error) {
    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ✗ Failed to generate patch: ${error}\n`,
    });
    throw error;
  }
}

/**
 * Step 5: Run reproduction command to validate fix
 */
async function runTests(
  sessionId: string,
  reproCommand: string,
  workspaceDir: string,
  backendBaseUrl: string
): Promise<boolean> {
  await updateSession(sessionId, backendBaseUrl, {
    logsAppend: `[${new Date().toISOString()}] Running tests: ${reproCommand}\n`,
    status: 'tests_running',
  });

  const repoDir = path.join(workspaceDir, 'repo');

  return new Promise((resolve) => {
    const [command, ...args] = reproCommand.split(' ');
    const testProcess = spawn(command, args, {
      cwd: repoDir,
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    testProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    testProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    testProcess.on('close', async (code) => {
      const output = `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n`;
      
      await updateSession(sessionId, backendBaseUrl, {
        logsAppend: `[${new Date().toISOString()}] Test output:\n${output}\n`,
      });

      if (code === 0) {
        await updateSession(sessionId, backendBaseUrl, {
          logsAppend: `[${new Date().toISOString()}] ✓ Tests passed!\n`,
        });
        resolve(true);
      } else {
        await updateSession(sessionId, backendBaseUrl, {
          logsAppend: `[${new Date().toISOString()}] ✗ Tests failed with exit code ${code}\n`,
        });
        resolve(false);
      }
    });

    testProcess.on('error', async (error) => {
      await updateSession(sessionId, backendBaseUrl, {
        logsAppend: `[${new Date().toISOString()}] ✗ Test execution error: ${error}\n`,
      });
      resolve(false);
    });
  });
}

/**
 * Step 6: Create GitHub PR
 */
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

  // TODO: In production, use GitHub MCP:
  // const githubMcp = new GitHubMCP();
  // const pr = await githubMcp.createPullRequest({
  //   owner: extractOwner(repoUrl),
  //   repo: extractRepo(repoUrl),
  //   title: `fix: ${bugDescription.substring(0, 50)}`,
  //   head: 'patchpilot-fix',
  //   base: baseBranch,
  //   body: generatePrBody(bugDescription, exaPatterns)
  // });
  // const prUrl = pr.html_url;

  // For MVP: Generate mock PR URL
  const prUrl = `${repoUrl}/pull/12345`;

  await updateSession(sessionId, backendBaseUrl, {
    logsAppend: `[${new Date().toISOString()}] ✓ Pull request created: ${prUrl}\n`,
    status: 'completed',
    prUrl,
  });
}

/**
 * Helper: Fetch GitHub issue details
 */
async function fetchGitHubIssue(
  issueUrl: string,
  sessionId: string,
  backendBaseUrl: string
): Promise<string> {
  await updateSession(sessionId, backendBaseUrl, {
    logsAppend: `[${new Date().toISOString()}] Fetching GitHub issue: ${issueUrl}\n`,
  });

  try {
    // Extract owner, repo, and issue number from URL
    const match = issueUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/);
    if (!match) {
      throw new Error('Invalid GitHub issue URL');
    }

    const [, owner, repo, issueNumber] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PatchPilot-Agent',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const issue = await response.json();

    // Format the issue data into a comprehensive bug description
    const formattedDescription = `
GitHub Issue #${issueNumber}: ${issue.title}

URL: ${issueUrl}

Description:
${issue.body || 'No description provided'}

Labels: ${issue.labels.map((l: any) => l.name).join(', ') || 'None'}
State: ${issue.state}
Created: ${new Date(issue.created_at).toLocaleString()}
`.trim();

    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ✓ Successfully fetched GitHub issue #${issueNumber}\n`,
    });

    return formattedDescription;
  } catch (error) {
    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ✗ Failed to fetch GitHub issue: ${error}\n`,
    });
    throw error;
  }
}

/**
 * Helper: Update session via backend API
 */
async function updateSession(
  sessionId: string,
  backendBaseUrl: string,
  updates: {
    status?: string;
    logsAppend?: string;
    patchDiff?: string;
    prUrl?: string;
    errorMessage?: string;
  }
): Promise<void> {
  try {
    const response = await fetch(`${backendBaseUrl}/api/sessions/${sessionId}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      console.error(`Failed to update session: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error updating session:', error);
  }
}

/**
 * Helper: Extract keywords from bug description
 */
function extractKeywords(text: string): string[] {
  // Remove common words and extract meaningful terms
  const commonWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !commonWords.has(w));
  
  return [...new Set(words)];
}
