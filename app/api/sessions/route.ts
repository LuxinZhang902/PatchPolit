import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreateSessionRequest, CreateSessionResponse } from '@/types';
import { startSandboxForSession } from '@/lib/sandbox-manager';

export async function GET(request: NextRequest) {
  try {
    // Get all sessions ordered by most recent first
    const sessions = await prisma.debugSession.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSessionRequest = await request.json();

    // Validate input
    if (!body.repoUrl || !body.bugDescription || !body.reproCommand) {
      return NextResponse.json(
        { error: 'Missing required fields: repoUrl, bugDescription, reproCommand' },
        { status: 400 }
      );
    }

    // Validate repo URL format
    const urlPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w-]+/;
    if (!urlPattern.test(body.repoUrl)) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL' },
        { status: 400 }
      );
    }

    // Create DebugSession with status = 'pending'
    const session = await prisma.debugSession.create({
      data: {
        repoUrl: body.repoUrl,
        branch: body.branch || 'main',
        bugDescription: body.bugDescription,
        reproCommand: body.reproCommand,
        skipTests: body.skipTests || false,
        status: 'pending',
      },
    });

    // Start sandbox asynchronously (don't await to respond quickly)
    startSandboxForSession(session).catch((error) => {
      console.error(`Failed to start sandbox for session ${session.id}:`, error);
    });

    const response: CreateSessionResponse = {
      id: session.id,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
