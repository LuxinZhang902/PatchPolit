"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateSessionRequest } from "@/types";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateSessionRequest>({
    repoUrl: "",
    branch: "main",
    bugDescription: "",
    reproCommand: "",
    skipTests: false,
  });

  const [inputType, setInputType] = useState<'github' | 'direct'>('direct');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create session");
      }

      const data = await response.json();
      router.push(`/sessions/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative overflow-hidden">
      {/* Animated Tech Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.08),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000,transparent)]"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-20 pb-8">
        {/* View Sessions Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => router.push("/sessions")}
            className="px-5 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white font-medium rounded-lg border border-slate-700 hover:border-slate-600 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            View All Sessions
          </button>
        </div>

        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <span className="text-xs font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full backdrop-blur-sm">
              Powered by Exa & Groq
            </span>
          </div>
          <h1 className="text-7xl font-bold text-white mb-6 tracking-tight">
            AI Autonomous Bug Fixing
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Analyze, patch, and create pull requests automatically.
          </p>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Deploy fixes in seconds, not hours.
          </p>
        </div>

        {/* Main Form Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 mb-12 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Repository URL */}
            <div className="group">
              <label
                htmlFor="repoUrl"
                className="block text-sm font-semibold text-slate-300 mb-2"
              >
                Repository URL *
              </label>
              <input
                type="url"
                id="repoUrl"
                required
                placeholder="https://github.com/username/repository"
                value={formData.repoUrl}
                onChange={(e) =>
                  setFormData({ ...formData, repoUrl: e.target.value })
                }
                className="w-full px-4 py-3.5 bg-slate-800/50 text-white placeholder-slate-500 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-slate-600"
              />
            </div>

            {/* Branch */}
            <div className="group">
              <label
                htmlFor="branch"
                className="block text-sm font-semibold text-slate-300 mb-2"
              >
                Branch
              </label>
              <input
                type="text"
                id="branch"
                placeholder="main"
                value={formData.branch}
                onChange={(e) =>
                  setFormData({ ...formData, branch: e.target.value })
                }
                className="w-full px-4 py-3.5 bg-slate-800/50 text-white placeholder-slate-500 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-slate-600"
              />
            </div>

            {/* Bug Description */}
            <div className="group">
              <label className="block text-sm font-semibold text-slate-300 mb-3">
                Bug Information *
              </label>
              
              {/* Input Type Selector */}
              <div className="flex gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setInputType('direct')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                    inputType === 'direct'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-slate-800/30 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="font-semibold">Direct Description</span>
                  </div>
                  <p className="text-xs mt-1 opacity-75">Paste error messages & stack traces</p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setInputType('github')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                    inputType === 'github'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-slate-800/30 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span className="font-semibold">GitHub Issue</span>
                  </div>
                  <p className="text-xs mt-1 opacity-75">Paste issue URL for auto-fetch</p>
                </button>
              </div>

              {/* Input Field */}
              {inputType === 'direct' ? (
                <textarea
                  id="bugDescription"
                  required
                  rows={6}
                  placeholder="TypeError: Cannot read property 'name' of undefined&#10;at getUserName (src/user.js:42)&#10;&#10;Describe what's broken and paste any error messages or stack traces here..."
                  value={formData.bugDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, bugDescription: e.target.value })
                  }
                  className="w-full px-4 py-3.5 bg-slate-800/50 text-white placeholder-slate-500 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-slate-600 resize-none font-mono text-sm"
                />
              ) : (
                <input
                  type="url"
                  id="bugDescription"
                  required
                  placeholder="https://github.com/vercel/next.js/issues/86390"
                  value={formData.bugDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, bugDescription: e.target.value })
                  }
                  className="w-full px-4 py-3.5 bg-slate-800/50 text-white placeholder-slate-500 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-slate-600 font-mono"
                />
              )}
              
              <p className="mt-2 text-xs text-slate-500">
                {inputType === 'direct' 
                  ? 'Include error types, file paths, and line numbers for best results'
                  : 'Paste a GitHub issue URL to automatically fetch bug details'
                }
              </p>
            </div>

            {/* Reproduction Command */}
            <div className="group">
              <label
                htmlFor="reproCommand"
                className="block text-sm font-semibold text-slate-300 mb-2"
              >
                Test Command *
              </label>
              <input
                type="text"
                id="reproCommand"
                required
                placeholder="npm test"
                value={formData.reproCommand}
                onChange={(e) =>
                  setFormData({ ...formData, reproCommand: e.target.value })
                }
                className="w-full px-4 py-3.5 bg-slate-800/50 text-white placeholder-slate-500 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-slate-600 font-mono"
              />
              <p className="mt-2 text-xs text-slate-500">
                Command to reproduce/test the bug
              </p>
            </div>

            {/* Skip Tests Checkbox */}
            <div className="group">
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-800/30 rounded-lg border border-slate-700 hover:border-slate-600 transition-all duration-200">
                <input
                  type="checkbox"
                  checked={formData.skipTests}
                  onChange={(e) =>
                    setFormData({ ...formData, skipTests: e.target.checked })
                  }
                  className="w-5 h-5 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-slate-300">
                    Skip Tests
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generate patch without running tests (faster, but less reliable)
                  </p>
                </div>
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg animate-shake">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
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
                  <span>Launching Agent...</span>
                </span>
              ) : (
                <span>Start Debugging →</span>
              )}
            </button>
          </form>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-900/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 group">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
              <svg
                className="w-6 h-6 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-white mb-2">Smart Analysis</h3>
            <p className="text-sm text-slate-400">
              Searches for similar bugs and narrows down relevant files
            </p>
          </div>
          <div className="bg-slate-900/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300 group">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
              <svg
                className="w-6 h-6 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-white mb-2">AI-Powered Fixes</h3>
            <p className="text-sm text-slate-400">
              Generates intelligent patches using Groq LLM
            </p>
          </div>
          <div className="bg-slate-900/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-green-500/50 transition-all duration-300 group">
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
              <svg
                className="w-6 h-6 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-white mb-2">Auto PR</h3>
            <p className="text-sm text-slate-400">
              Tests and creates pull requests automatically
            </p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-sm rounded-xl p-8 border border-blue-500/30">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-1">60-80%</div>
              <div className="text-sm text-slate-400">Success Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-1">&lt;20s</div>
              <div className="text-sm text-slate-400">Avg Fix Time</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-1">100%</div>
              <div className="text-sm text-slate-400">Autonomous</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
