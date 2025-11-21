'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { DebugSession, SessionStatus } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusConfig: Record<SessionStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  running: { label: 'Running', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  patch_found: { label: 'Patch Found', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  tests_running: { label: 'Testing', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  failed: { label: 'Failed', color: 'text-red-700', bgColor: 'bg-red-100' },
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
          <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-3 text-slate-600">Loading session...</span>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[session.status as SessionStatus];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-slate-900">Debug Session</h1>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${statusInfo.color} ${statusInfo.bgColor}`}>
            {statusInfo.label}
          </span>
        </div>
        <p className="text-slate-600">Session ID: <code className="bg-slate-100 px-2 py-1 rounded text-sm">{session.id}</code></p>
      </div>

      {/* Session Info */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Repository Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Repository</p>
            <a 
              href={session.repoUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 hover:underline break-all"
            >
              {session.repoUrl}
            </a>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Branch</p>
            <p className="text-slate-900">{session.branch}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-slate-500 mb-1">Reproduction Command</p>
            <code className="block bg-slate-50 px-3 py-2 rounded text-sm text-slate-900 border border-slate-200">
              {session.reproCommand}
            </code>
          </div>
        </div>
      </div>

      {/* Bug Description */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Bug Description</h2>
        <pre className="bg-slate-50 px-4 py-3 rounded-lg text-sm text-slate-900 whitespace-pre-wrap border border-slate-200 overflow-x-auto">
          {session.bugDescription}
        </pre>
      </div>

      {/* Logs */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Execution Logs</h2>
        <div className="bg-slate-900 text-green-400 px-4 py-3 rounded-lg font-mono text-sm overflow-x-auto max-h-96 overflow-y-auto">
          {session.logs ? (
            <pre className="whitespace-pre-wrap">{session.logs}</pre>
          ) : (
            <p className="text-slate-500">No logs yet...</p>
          )}
        </div>
      </div>

      {/* Patch Diff */}
      {session.patchDiff && (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Generated Patch</h2>
          <pre className="bg-slate-50 px-4 py-3 rounded-lg text-sm text-slate-900 whitespace-pre-wrap border border-slate-200 overflow-x-auto max-h-96 overflow-y-auto">
            {session.patchDiff}
          </pre>
        </div>
      )}

      {/* Error Message */}
      {session.errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-red-900 mb-4">Error</h2>
          <p className="text-red-700">{session.errorMessage}</p>
        </div>
      )}

      {/* Pull Request */}
      {session.prUrl && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-green-900 mb-4">✅ Pull Request Created</h2>
          <a
            href={session.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
          >
            View Pull Request
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}

      {/* Progress Indicator */}
      {session.status !== 'completed' && session.status !== 'failed' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center">
            <svg className="animate-spin h-6 w-6 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div>
              <p className="text-blue-900 font-semibold">PatchPilot is working on your bug...</p>
              <p className="text-blue-700 text-sm">This page will update automatically as progress is made.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
