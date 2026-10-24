'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../../lib/auth-api';
import { UserDto } from '@memomind/shared';
import {
  User,
  LogOut,
  ShieldCheck,
  BookOpen,
  Calendar,
  Loader2,
  Lock,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    authApi
      .getMe()
      .then((data) => {
        if (mounted) {
          setUser(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          router.push('/login');
        }
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Verifying secure session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-sm">
              M
            </div>
            <span className="font-bold text-slate-900 tracking-tight">MemoMind AI</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Tenant Isolated
            </span>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-xs font-semibold text-slate-600 hover:text-red-600 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              {loggingOut ? 'Logging out...' : 'Log Out'}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Welcome, {user?.name || user?.email.split('@')[0]}
                </h1>
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-1.5 self-end sm:self-auto">
              <Calendar className="w-3.5 h-3.5" />
              Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </section>

        {/* Security & Multi-Tenant Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-sky-600" />
              Session &amp; Security Specs
            </h2>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Session Cookie:</span>
                <span className="font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  HTTP-Only, Secure, SameSite
                </span>
              </li>
              <li className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Password Hashing:</span>
                <span className="font-mono font-medium text-slate-800">Argon2id</span>
              </li>
              <li className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Tenant Identity:</span>
                <span className="font-mono text-xs text-slate-700 truncate max-w-[200px]">
                  {user?.id}
                </span>
              </li>
              <li className="flex items-center justify-between py-1">
                <span className="text-slate-500">Token Storage:</span>
                <span className="font-semibold text-emerald-600">Never in localStorage</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-sky-600" />
              Journal Ingestion (Milestone 2 Ready)
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every journal entry, embedding, and vector similarity search will be strictly scoped
              to tenant ID <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">{user?.id}</code>.
            </p>
            <div className="mt-4 p-3 rounded-lg bg-sky-50 border border-sky-100 text-xs text-sky-800">
              Authentication and multi-tenant security are verified and active.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

