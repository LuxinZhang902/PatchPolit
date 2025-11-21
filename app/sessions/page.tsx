"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DebugSession, SessionStatus } from "@/types";

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

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<DebugSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SessionStatus | "all">("all");

  useEffect(() => {
    fetchSessions();
    // Poll every 3 seconds for updates
    const interval = setInterval(fetchSessions, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/sessions");
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to session detail
    
    if (!confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${sessionId}/delete`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from local state
        setSessions(sessions.filter((s) => s.id !== sessionId));
      } else {
        alert("Failed to delete session");
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      alert("Failed to delete session");
    }
  };

  const filteredSessions = sessions.filter(
    (session) => filter === "all" || session.status === filter
  );

  const stats = {
    total: sessions.length,
    completed: sessions.filter((s) => s.status === "completed").length,
    failed: sessions.filter((s) => s.status === "failed").length,
    running: sessions.filter(
      (s) => s.status === "running" || s.status === "tests_running" || s.status === "patch_found"
    ).length,
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000,transparent)]"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl font-bold text-white mb-2">
                Debug Sessions
              </h1>
              <p className="text-slate-400">Manage and monitor all your debugging tasks</p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Session
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Total Sessions</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-green-700/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Completed</p>
                  <p className="text-3xl font-bold text-green-400 mt-1">{stats.completed}</p>
                </div>
                <div className="w-12 h-12 bg-green-700/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-red-700/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Failed</p>
                  <p className="text-3xl font-bold text-red-400 mt-1">{stats.failed}</p>
                </div>
                <div className="w-12 h-12 bg-red-700/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">❌</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-blue-700/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">In Progress</p>
                  <p className="text-3xl font-bold text-blue-400 mt-1">{stats.running}</p>
                </div>
                <div className="w-12 h-12 bg-blue-700/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🔄</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {["all", "running", "patch_found", "tests_running", "completed", "failed"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as SessionStatus | "all")}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-200 ${
                  filter === status
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800/50 text-slate-400 hover:bg-slate-700/50"
                }`}
              >
                {status === "all" ? "All" : statusConfig[status as SessionStatus]?.label || status}
              </button>
            ))}
          </div>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-slate-400 text-lg">Loading sessions...</span>
            </div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Sessions Found</h3>
            <p className="text-slate-400 mb-6">
              {filter === "all" 
                ? "Start your first debugging session to see it here"
                : `No ${statusConfig[filter as SessionStatus]?.label.toLowerCase()} sessions`
              }
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              Create New Session
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => {
              const statusInfo = statusConfig[session.status as SessionStatus];
              return (
                <div
                  key={session.id}
                  onClick={() => router.push(`/sessions/${session.id}`)}
                  className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 hover:border-blue-500/50 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-4 py-1.5 rounded-lg text-sm font-bold ${statusInfo.color} ${statusInfo.bgColor} border ${statusInfo.borderColor} flex items-center gap-2`}>
                          <span>{statusInfo.emoji}</span>
                          {statusInfo.label}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(session.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Repository</p>
                          <p className="text-sm text-blue-400 font-medium truncate group-hover:text-blue-300 transition-colors">
                            {session.repoUrl}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Branch</p>
                          <p className="text-sm text-slate-300 font-mono">{session.branch}</p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-xs text-slate-500 mb-1">Bug Description</p>
                        <p className="text-sm text-slate-300 line-clamp-2">
                          {session.bugDescription}
                        </p>
                      </div>

                      {session.errorMessage && (
                        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                          <p className="text-xs text-red-400 font-medium">
                            {session.errorMessage}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => deleteSession(session.id, e)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                        title="Delete session"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <svg className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
