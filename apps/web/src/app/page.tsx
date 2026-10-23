'use client';

import { useEffect, useState } from 'react';
import { HealthCheckResponse } from '@memomind/shared';
import { fetchHealth, API_BASE_URL } from '../lib/api';
import { CheckCircle2, XCircle, RefreshCw, Database, Server, Cpu, ShieldCheck } from 'lucide-react';

export default function Home() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect to API');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <main className="min-h-screen px-4 py-12 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold uppercase tracking-wider mb-3">
          Milestone 0 &bull; Foundation Ready
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          MemoMind <span className="text-sky-600">AI</span>
        </h1>
        <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
          Personalized AI Journal powered by Retrieval-Augmented Generation (RAG).
          Private entries, semantic memory, natural language recall.
        </p>
      </header>

      {/* System Status Banner */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-sky-600" />
              Backend System Health
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Target API endpoint: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-xs">{API_BASE_URL}/health</code>
            </p>
          </div>

          <button
            onClick={loadHealth}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Checking...' : 'Refresh Status'}
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Cannot reach NestJS backend API</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
              <p className="text-xs text-red-600 mt-2">
                Make sure the API server is running with <code className="font-mono bg-red-100 px-1 rounded">pnpm dev:api</code>.
              </p>
            </div>
          </div>
        )}

        {health && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* API Health */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase text-slate-500">API Service</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-lg font-bold text-slate-900 capitalize">{health.status}</p>
              <p className="text-xs text-slate-500 mt-1">Uptime: {health.uptime}s &bull; Env: {health.environment}</p>
            </div>

            {/* Database Health */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase text-slate-500">PostgreSQL DB</span>
                {health.database.connected ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
              </div>
              <p className="text-lg font-bold text-slate-900">
                {health.database.connected ? 'Connected' : 'Disconnected'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Prisma ORM Client Connected</p>
            </div>

            {/* pgvector Status */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase text-slate-500">pgvector Extension</span>
                {health.database.pgvector ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
              </div>
              <p className="text-lg font-bold text-slate-900">
                {health.database.pgvector ? 'Installed' : 'Missing'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {health.database.version ? `v${health.database.version} (RAG Ready)` : 'Not detected'}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Monorepo Architecture Overview */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-3">
            <Cpu className="w-5 h-5 text-sky-600" />
            Monorepo Structure
          </h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded shrink-0">apps/web</span>
              <span>Next.js 15 App Router frontend with Tailwind CSS and responsive UI.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded shrink-0">apps/api</span>
              <span>NestJS REST API with <code className="font-mono text-xs">/api/v1</code> prefix, validation pipes, and error filters.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded shrink-0">packages/database</span>
              <span>Prisma ORM schema with User &amp; JournalEntry models and pgvector migration.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded shrink-0">packages/shared</span>
              <span>Reusable TypeScript contracts and Zod validation schemas.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Milestone 0 Acceptance
          </h3>
          <ul className="space-y-2.5 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>pnpm workspaces initialized and configured</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>PostgreSQL with pgvector running via Docker Compose</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Prisma database initial migration applied</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Strict TypeScript and Vitest tests in place</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Ready for Milestone 1: User Auth &amp; Entry APIs</span>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}

