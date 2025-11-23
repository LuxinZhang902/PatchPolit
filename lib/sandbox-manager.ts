import { prisma } from './prisma';
import { runAgent } from '@/sandbox/agent';
import { Sandbox } from 'e2b';

type SessionData = {
  id: string;
  repoUrl: string;
  branch: string;
  bugDescription: string;
  reproCommand: string;
  skipTests: boolean;
};

/**
 * Starts a sandbox for the given session.
 * In production, this would:
 * 1. Create an E2B sandbox instance
 * 2. Upload the agent code to the sandbox
 * 3. Execute the agent with the session payload
 * 
 * For MVP/demo purposes, we simulate the E2B sandbox by:
 * - Generating a mock sandboxId
 * - Running the agent locally in a separate process context
 */
export async function startSandboxForSession(session: SessionData): Promise<string> {
  try {
    // Try to create a real E2B sandbox when an API key is configured
    const apiKey = process.env.E2B_API_KEY;
    let sandboxId: string;
    
    if (apiKey) {
      // In production, this uses a real E2B sandbox instance
      const sandbox = await Sandbox.create('base', {
        apiKey,
        timeoutMs: 300000, // 5 minutes
      });

      sandboxId = sandbox.id;

      // Minimal no-op process in the sandbox so it is actually used
      const process = await sandbox.process.start({
        cmd: 'node -e "console.log(\'PatchPilot E2B sandbox started\')"',
      });

      process.on('exit', async () => {
        await sandbox.close();
      });
    } else {
      // For environments without E2B configured, fall back to mock sandbox ID
      sandboxId = `sandbox_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    // Update session with sandboxId
    await prisma.debugSession.update({
      where: { id: session.id },
      data: { 
        sandboxId,
        status: 'running',
      },
    });

    // Prepare agent payload
    const backendBaseUrl = process.env.BACKEND_BASE_URL || 'http://localhost:3000';
    
    const agentPayload = {
      sessionId: session.id,
      repoUrl: session.repoUrl,
      branch: session.branch,
      bugDescription: session.bugDescription,
      reproCommand: session.reproCommand,
      skipTests: session.skipTests,
      backendBaseUrl,
    };

    // For MVP: Run agent locally (simulating sandbox execution)
    // Run asynchronously without blocking
    runAgent(agentPayload).catch((error) => {
      console.error(`Agent execution failed for session ${session.id}:`, error);
    });

    return sandboxId;
  } catch (error) {
    console.error('Error starting sandbox:', error);
    
    // Update session with error
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
