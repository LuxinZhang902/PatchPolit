'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateSessionRequest } from '@/types';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateSessionRequest>({
    repoUrl: '',
    branch: 'main',
    bugDescription: '',
    reproCommand: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const data = await response.json();
      router.push(`/sessions/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">
          Start Debugging Session
        </h1>
        <p className="text-lg text-slate-600">
          Provide your repository details and bug information. PatchPilot will analyze, fix, and create a PR automatically.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Repository URL */}
          <div>
            <label htmlFor="repoUrl" className="block text-sm font-semibold text-slate-700 mb-2">
              GitHub Repository URL *
            </label>
            <input
              type="url"
              id="repoUrl"
              required
              placeholder="https://github.com/username/repository"
              value={formData.repoUrl}
              onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
            />
          </div>

          {/* Branch */}
          <div>
            <label htmlFor="branch" className="block text-sm font-semibold text-slate-700 mb-2">
              Branch
            </label>
            <input
              type="text"
              id="branch"
              placeholder="main"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
            />
          </div>

          {/* Bug Description */}
          <div>
            <label htmlFor="bugDescription" className="block text-sm font-semibold text-slate-700 mb-2">
              Bug Description / Stack Trace *
            </label>
            <textarea
              id="bugDescription"
              required
              rows={6}
              placeholder="Describe the bug or paste the stack trace here..."
              value={formData.bugDescription}
              onChange={(e) => setFormData({ ...formData, bugDescription: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none"
            />
          </div>

          {/* Reproduction Command */}
          <div>
            <label htmlFor="reproCommand" className="block text-sm font-semibold text-slate-700 mb-2">
              Reproduction Command *
            </label>
            <input
              type="text"
              id="reproCommand"
              required
              placeholder="pytest tests/test_login.py"
              value={formData.reproCommand}
              onChange={(e) => setFormData({ ...formData, reproCommand: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
            />
            <p className="mt-2 text-sm text-slate-500">
              Command to reproduce/test the bug (e.g., pytest, npm test, etc.)
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-primary-700 hover:to-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting Debug Session...
              </span>
            ) : (
              'Start Debugging'
            )}
          </button>
        </form>
      </div>

      {/* Info Cards */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-2xl mb-2">🔍</div>
          <h3 className="font-semibold text-slate-900 mb-1">Analyze</h3>
          <p className="text-sm text-slate-600">Scans your repo and identifies relevant files</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-2xl mb-2">🤖</div>
          <h3 className="font-semibold text-slate-900 mb-1">Fix</h3>
          <p className="text-sm text-slate-600">Generates and applies intelligent patches</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-2xl mb-2">✅</div>
          <h3 className="font-semibold text-slate-900 mb-1">Verify</h3>
          <p className="text-sm text-slate-600">Tests the fix and creates a pull request</p>
        </div>
      </div>
    </div>
  );
}
