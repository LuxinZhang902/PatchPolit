-- CreateTable
CREATE TABLE "DebugSession" (
    "id" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "branch" TEXT NOT NULL DEFAULT 'main',
    "bugDescription" TEXT NOT NULL,
    "reproCommand" TEXT NOT NULL,
    "skipTests" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "currentStep" TEXT,
    "sandboxId" TEXT,
    "patchDiff" TEXT,
    "logs" TEXT,
    "prUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebugSession_pkey" PRIMARY KEY ("id")
);
