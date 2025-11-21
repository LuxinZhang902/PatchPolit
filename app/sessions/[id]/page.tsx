"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { DebugSession, SessionStatus } from "@/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusConfig: Record<
  SessionStatus,
  {
    label: string;
    emoji: string;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  pending: {
    label: "Pending",
    emoji: "⏳",
    color: "text-slate-700",
    bgColor: "bg-slate-100",
    borderColor: "border-slate-300",
  },
  running: {
    label: "Running",
    emoji: "🔄",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300",
  },
  patch_found: {
    label: "Patch Found",
    emoji: "🔧",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-300",
  },
  tests_running: {
    label: "Testing",
    emoji: "🧪",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    borderColor: "border-yellow-300",
  },
  completed: {
    label: "Completed",
    emoji: "✅",
    color: "text-green-700",
    bgColor: "bg-green-100",
    borderColor: "border-green-300",
  },
  failed: {
    label: "Failed",
    emoji: "❌",
    color: "text-red-700",
    bgColor: "bg-red-100",
    borderColor: "border-red-300",
  },
};

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;

  // Poll every 2 seconds
  const { data: session, error } = useSWR<DebugSession>(
    `/api/sessions/${sessionId}`,
    fetcher,
    { refreshInterval: 2000 }
  );

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          Failed to load session: {error.message}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center">
          <svg
            className="animate-spin h-8 w-8 text-primary-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="ml-3 text-slate-600">Loading session...</span>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[session.status as SessionStatus];

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Debug Session
              </h1>
              <p className="text-slate-400">
                Session ID:{" "}
                <code className="bg-slate-800/50 px-3 py-1.5 rounded-lg text-sm font-mono border border-slate-700 text-slate-300">
                  {session.id}
                </code>
              </p>
            </div>
            <span
              className={`px-6 py-3 rounded-xl text-base font-bold ${statusInfo.color} ${statusInfo.bgColor} border-2 ${statusInfo.borderColor} shadow-lg flex items-center gap-2`}
            >
              <span className="text-2xl">{statusInfo.emoji}</span>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Session Info */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 mb-6 hover:border-slate-600/50 transition-all">
          <h2 className="text-2xl font-bold text-white mb-6">
            Repository Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="group">
              <p className="text-sm font-semibold text-slate-400 mb-2">
                Repository
              </p>
              <a
                href={session.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 font-medium hover:underline break-all transition-colors"
              >
                {session.repoUrl}
              </a>
            </div>
            <div className="group">
              <p className="text-sm font-semibold text-slate-400 mb-2">
                Branch
              </p>
              <p className="text-white font-mono bg-slate-800/50 px-3 py-1.5 rounded-lg inline-block border border-slate-700">
                {session.branch}
              </p>
            </div>
            <div className="md:col-span-2 group">
              <p className="text-sm font-semibold text-slate-400 mb-2">
                Test Command
              </p>
              <code className="block bg-slate-800/50 text-green-400 px-4 py-3 rounded-lg text-sm font-mono border border-slate-700">
                {session.reproCommand}
              </code>
            </div>
          </div>
        </div>

        {/* Bug Description */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 mb-6 hover:border-slate-600/50 transition-all">
          <h2 className="text-2xl font-bold text-white mb-6">
            Bug Description
          </h2>
          <pre className="bg-slate-800/50 text-slate-200 px-6 py-4 rounded-lg text-sm font-mono whitespace-pre-wrap border border-slate-700 overflow-x-auto">
            {session.bugDescription}
          </pre>
        </div>

        {/* Logs */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 mb-6 hover:border-slate-600/50 transition-all">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            Execution Logs
            <span className="ml-auto text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-semibold border border-blue-500/30">
              Live
            </span>
          </h2>
          <div className="bg-slate-950 text-green-400 px-6 py-4 rounded-lg font-mono text-sm overflow-x-auto max-h-96 overflow-y-auto border border-slate-800">
            {session.logs ? (
              <pre className="whitespace-pre-wrap">{session.logs}</pre>
            ) : (
              <p className="text-slate-600 italic">Waiting for logs...</p>
            )}
          </div>
        </div>

        {/* Patch Diff */}
        {session.patchDiff && (
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 mb-6 hover:border-slate-600/50 transition-all">
            <h2 className="text-2xl font-bold text-white mb-6">
              Generated Patch
            </h2>
            <pre className="bg-slate-950 text-slate-200 px-6 py-4 rounded-lg text-sm font-mono whitespace-pre-wrap border border-slate-800 overflow-x-auto max-h-96 overflow-y-auto">
              {session.patchDiff}
            </pre>
          </div>
        )}

        {/* Error Message */}
        {session.errorMessage && (
          <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/50 rounded-2xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
            <p className="text-red-300 font-medium">{session.errorMessage}</p>
          </div>
        )}

        {/* Pull Request */}
        {session.prUrl && (
          <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 backdrop-blur-sm rounded-2xl p-8 mb-6 border border-green-500/30">
            <h2 className="text-2xl font-bold text-green-400 mb-4">
              Pull Request Created!
            </h2>
            <p className="text-slate-300 mb-4">
              Your fix has been successfully created and is ready for review.
            </p>
            <a
              href={session.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 transition-all shadow-lg hover:shadow-green-500/50 hover:scale-105 active:scale-95"
            >
              View Pull Request
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        )}

        {/* Progress Indicator */}
        {session.status !== "completed" && session.status !== "failed" && (
          <div className="bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-8">
            <div className="flex items-center gap-4">
              <svg
                className="animate-spin h-10 w-10 text-blue-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <div className="flex-1">
                <p className="text-white font-bold text-lg mb-1">
                  PatchPilot is working on your bug...
                </p>
                <p className="text-slate-400">
                  This page updates automatically. Powered by PatchPilot.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
