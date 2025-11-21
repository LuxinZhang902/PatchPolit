import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPullRequestForSession } from '@/lib/pr-creator';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    // Get session
    const session = await prisma.debugSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if session is completed
    if (session.status !== 'completed') {
      return NextResponse.json(
        { error: 'Session must be completed before creating PR' },
        { status: 400 }
      );
    }

    // Check if real PR already created (not just a compare URL)
    if (session.prUrl && session.prUrl.includes('/pull/')) {
      return NextResponse.json(
        { error: 'Pull request already created', prUrl: session.prUrl },
        { status: 400 }
      );
    }
    
    // If it's just a compare URL, allow re-creation (user might have added GITHUB_TOKEN)
    if (session.prUrl && session.prUrl.includes('/compare/')) {
      console.log(`Re-attempting PR creation for session ${sessionId} (previous attempt was compare URL only)`);
    }

    // Create PR asynchronously
    createPullRequestForSession(session).catch((error) => {
      console.error(`Failed to create PR for session ${sessionId}:`, error);
    });

    return NextResponse.json(
      { message: 'Pull request creation started' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error creating PR:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
