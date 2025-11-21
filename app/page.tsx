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
  });

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
              <label
                htmlFor="bugDescription"
                className="block text-sm font-semibold text-slate-300 mb-2"
              >
                Bug Description / Stack Trace *
              </label>
              <textarea
                id="bugDescription"
                required
                rows={6}
                placeholder="TypeError: Cannot read property 'name' of undefined&#10;at getUserName (src/user.js:42)&#10;&#10;Paste your error messages or stack traces here..."
                value={formData.bugDescription}
                onChange={(e) =>
                  setFormData({ ...formData, bugDescription: e.target.value })
                }
                className="w-full px-4 py-3.5 bg-slate-800/50 text-white placeholder-slate-500 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-slate-600 resize-none font-mono text-sm"
              />
              <p className="mt-2 text-xs text-slate-500">
                Include error types, file paths, and line numbers for best
                results
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
