import { DebugSession } from '@/types';
import { prisma } from './prisma';
import { runAgent } from '@/sandbox/agent';

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
export async function startSandboxForSession(session: DebugSession): Promise<string> {
  try {
    // TODO: In production, replace with actual E2B SDK call:
    // const sandbox = await E2B.create({ template: 'node-agent' });
    // const sandboxId = sandbox.id;
    
    // For MVP: Generate mock sandbox ID
    const sandboxId = `sandbox_${Date.now()}_${Math.random().toString(36).substring(7)}`;

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

    // TODO: In production, upload and execute agent in E2B sandbox:
    // await sandbox.uploadFile('agent.js', compiledAgentCode);
    // await sandbox.process.start({ cmd: 'node agent.js', env: { PAYLOAD: JSON.stringify(agentPayload) } });

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
