import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UpdateSessionRequest } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdateSessionRequest = await request.json();

    // Fetch current session
    const currentSession = await prisma.debugSession.findUnique({
      where: { id: params.id },
    });

    if (!currentSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (body.status) {
      updateData.status = body.status;
    }

    if (body.patchDiff !== undefined) {
      updateData.patchDiff = body.patchDiff;
    }

    if (body.prUrl !== undefined) {
      updateData.prUrl = body.prUrl;
    }

    if (body.errorMessage !== undefined) {
      updateData.errorMessage = body.errorMessage;
    }

    // Append logs if provided
    if (body.logsAppend) {
      const existingLogs = currentSession.logs || '';
      updateData.logs = existingLogs + body.logsAppend;
    }

    // Update session
    const updatedSession = await prisma.debugSession.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
