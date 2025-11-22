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
  const { sessionId, repoUrl, branch, bugDescription, reproCommand, skipTests, backendBaseUrl } = payload;
  
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

    // Step 1.5: Install dependencies
    await installDependencies(sessionId, workspaceDir, backendBaseUrl);

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

    // Step 5: Run tests (if not skipped)
    if (!skipTests) {
      const testsPass = await runTests(
        sessionId,
        reproCommand,
        workspaceDir,
        backendBaseUrl
      );

      if (!testsPass) {
        await updateSession(sessionId, backendBaseUrl, {
          status: 'failed',
          errorMessage: `Tests failed after applying patch. The AI-generated fix did not resolve the issue. This could mean:\n\n1. The patch addressed the wrong root cause\n2. More files need to be modified\n3. The bug description needs more context\n4. The test environment has additional dependencies\n\nCheck the logs above for test output details. Try:\n- Providing a more detailed bug description\n- Using a GitHub issue URL for better context\n- Ensuring the test command is correct`,
        });
        return;
      }
    } else {
      await updateSession(sessionId, backendBaseUrl, {
        logsAppend: `[${new Date().toISOString()}] ⚠ Tests skipped by user request\n`,
      });
    }

    // Mark as completed - PR creation will be triggered manually by user
    await updateSession(sessionId, backendBaseUrl, {
      status: 'completed',
      currentStep: null,
      logsAppend: `[${new Date().toISOString()}] ✓ Patch ready! Review the changes and click "Create Pull Request" to submit.\n`,
    });

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
    currentStep: 'cloning',
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
 * Step 1.5: Install dependencies
 */
async function installDependencies(
  sessionId: string,
  workspaceDir: string,
  backendBaseUrl: string
): Promise<void> {
  await updateSession(sessionId, backendBaseUrl, {
    currentStep: 'installing',
    logsAppend: `[${new Date().toISOString()}] Installing dependencies...\n`,
  });

  const repoDir = path.join(workspaceDir, 'repo');

  try {
    // Detect package manager
    const hasPackageJson = await fs.access(path.join(repoDir, 'package.json')).then(() => true).catch(() => false);
    const hasPnpmLock = await fs.access(path.join(repoDir, 'pnpm-lock.yaml')).then(() => true).catch(() => false);
    const hasYarnLock = await fs.access(path.join(repoDir, 'yarn.lock')).then(() => true).catch(() => false);
    
    if (!hasPackageJson) {
      await updateSession(sessionId, backendBaseUrl, {
        logsAppend: `[${new Date().toISOString()}] ℹ No package.json found, skipping dependency installation\n`,
      });
      return;
    }

    let installCommand = 'npm install';
    if (hasPnpmLock) {
      installCommand = 'pnpm install --frozen-lockfile';
    } else if (hasYarnLock) {
      installCommand = 'yarn install --frozen-lockfile';
    }

    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] Running: ${installCommand}\n`,
    });

    // Run install with timeout (5 minutes max)
    await execAsync(installCommand, { 
      cwd: repoDir,
      timeout: 300000 // 5 minutes
    });

    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ✓ Dependencies installed successfully\n`,
    });
  } catch (error) {
    // Don't fail the entire process if install fails
    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] ⚠ Dependency installation failed (continuing anyway): ${error}\n`,
    });
  }
}

/**
 * Step 2: Narrow down relevant files
 */
async function narrowRelevantFiles(
  sessionId: string,
  bugDescription: string,
  workspaceDir: string,
  backendBaseUrl: string
): Promise<string[]> {
  await updateSession(sessionId, backendBaseUrl, {
    currentStep: 'analyzing',
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
  bugDescription: string,
  backendBaseUrl: string
): Promise<string[]> {
  await updateSession(sessionId, backendBaseUrl, {
    currentStep: 'querying',
    logsAppend: `[${new Date().toISOString()}] Querying Exa for similar bug patterns...\n`,
  });

  try {
    // Use Exa client (sponsor integration)
    const patterns = await queryExa(bugDescription);

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
    currentStep: 'patching',
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

    // Log the raw patch response for debugging
    await updateSession(sessionId, backendBaseUrl, {
      logsAppend: `[${new Date().toISOString()}] Raw patch response:\n${patchResponse.substring(0, 500)}...\n`,
    });

    // Create fix branch
    await execAsync('git checkout -b patchpilot-fix', { cwd: repoDir });

    // Parse and apply the patch - try multiple patterns
    let filesModified = 0;

    // Pattern 1: FILE: path\n```code```
    const pattern1 = /FILE:\s*(.+?)\n```[\w]*\n([\s\S]+?)\n```/g;
    let match;
    
    while ((match = pattern1.exec(patchResponse)) !== null) {
      const [, filePath, fixedCode] = match;
      const fullPath = path.join(repoDir, filePath.trim());

      try {
        await fs.writeFile(fullPath, fixedCode.trim());
        await execAsync(`git add "${filePath.trim()}"`, { cwd: repoDir });
        filesModified++;
        await updateSession(sessionId, backendBaseUrl, {
          logsAppend: `[${new Date().toISOString()}] ✓ Modified: ${filePath.trim()}\n`,
        });
      } catch (error) {
        await updateSession(sessionId, backendBaseUrl, {
          logsAppend: `[${new Date().toISOString()}] ✗ Failed to modify ${filePath}: ${error}\n`,
        });
      }
    }

    // Pattern 2: **File: path**\n```code```
    if (filesModified === 0) {
      const pattern2 = /\*\*File:\s*(.+?)\*\*\n```[\w]*\n([\s\S]+?)\n```/g;
      while ((match = pattern2.exec(patchResponse)) !== null) {
        const [, filePath, fixedCode] = match;
        const fullPath = path.join(repoDir, filePath.trim());

        try {
          await fs.writeFile(fullPath, fixedCode.trim());
          await execAsync(`git add "${filePath.trim()}"`, { cwd: repoDir });
          filesModified++;
          await updateSession(sessionId, backendBaseUrl, {
            logsAppend: `[${new Date().toISOString()}] ✓ Modified: ${filePath.trim()}\n`,
          });
        } catch (error) {
          await updateSession(sessionId, backendBaseUrl, {
            logsAppend: `[${new Date().toISOString()}] ✗ Failed to modify ${filePath}: ${error}\n`,
          });
        }
      }
    }

    // Pattern 3: Just modify the first file in relevantFiles if no pattern matched
    if (filesModified === 0 && relevantFiles.length > 0) {
      await updateSession(sessionId, backendBaseUrl, {
        logsAppend: `[${new Date().toISOString()}] ⚠ No file pattern matched, applying patch to first relevant file\n`,
      });

      // Extract code block from response
      const codeBlockPattern = /```[\w]*\n([\s\S]+?)\n```/;
      const codeMatch = codeBlockPattern.exec(patchResponse);
      
      if (codeMatch) {
        const fixedCode = codeMatch[1];
        const targetFile = relevantFiles[0];
        const fullPath = path.join(repoDir, targetFile);

        try {
          await fs.writeFile(fullPath, fixedCode.trim());
          await execAsync(`git add "${targetFile}"`, { cwd: repoDir });
          filesModified++;
          await updateSession(sessionId, backendBaseUrl, {
            logsAppend: `[${new Date().toISOString()}] ✓ Modified: ${targetFile}\n`,
          });
        } catch (error) {
          await updateSession(sessionId, backendBaseUrl, {
            logsAppend: `[${new Date().toISOString()}] ✗ Failed to modify ${targetFile}: ${error}\n`,
          });
        }
      }
    }

    if (filesModified === 0) {
      throw new Error('No files were modified by the patch. The LLM response format may not match expected patterns.');
    }

    // Commit changes (skip pre-commit hooks to avoid lint failures)
    await execAsync(`git commit --no-verify -m "fix: ${bugDescription.substring(0, 50)}"`, { cwd: repoDir });

    // Generate diff (compare current branch with the commit before our changes)
    const { stdout: diff } = await execAsync('git diff HEAD~1', { cwd: repoDir });

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
 * Helper: Extract meaningful error information from test output
 */
function extractTestErrors(stdout: string, stderr: string): string {
  const combined = `${stdout}\n${stderr}`;
  const lines = combined.split('\n');
  
  // Look for common error patterns
  const errorPatterns = [
    /FAIL|FAILED|ERROR|Error:/i,
    /AssertionError/i,
    /TypeError/i,
    /ReferenceError/i,
    /SyntaxError/i,
    /Expected.*but got/i,
    /\d+ failing/i,
    /Tests failed:/i,
  ];
  
  const errorLines: string[] = [];
  let contextLines = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line matches any error pattern
    if (errorPatterns.some(pattern => pattern.test(line))) {
      // Add context: 2 lines before and 3 lines after
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 4);
      
      for (let j = start; j < end; j++) {
        if (!errorLines.includes(lines[j]) && lines[j].trim()) {
          errorLines.push(lines[j]);
        }
      }
      
      contextLines++;
      if (contextLines >= 3) break; // Limit to first 3 error contexts
    }
  }
  
  if (errorLines.length > 0) {
    return `\n📋 Key Test Errors:\n${errorLines.slice(0, 15).join('\n')}`;
  }
  
  return '\n💡 No specific error patterns found. Check full test output above.';
}

/**
 * Step 5: Run tests
 */
async function runTests(
  sessionId: string,
  reproCommand: string,
  workspaceDir: string,
  backendBaseUrl: string
): Promise<boolean> {
  await updateSession(sessionId, backendBaseUrl, {
    currentStep: 'testing',
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
        // Extract meaningful error info from test output
        const errorSummary = extractTestErrors(stdout, stderr);
        await updateSession(sessionId, backendBaseUrl, {
          logsAppend: `[${new Date().toISOString()}] ✗ Tests failed with exit code ${code}\n${errorSummary}\n`,
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
  branch: string,
  bugDescription: string,
  workspaceDir: string,
  backendBaseUrl: string
): Promise<void> {
  await updateSession(sessionId, backendBaseUrl, {
    currentStep: 'creating_pr',
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
    currentStep?: string | null;
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
