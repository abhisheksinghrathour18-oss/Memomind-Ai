'use client';

import { useState } from 'react';
import { RagAskResponse } from '@memomind/shared';
import { ragApi } from '../lib/rag-api';
import {
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  BookOpen,
  Calendar,
  Info,
} from 'lucide-react';

export function AiChatPanel() {
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAskedQuestion, setLastAskedQuestion] = useState<string | null>(null);
  const [result, setResult] = useState<RagAskResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) {
      setError('Please enter a question to ask your journal.');
      return;
    }

    setAsking(true);
    setError(null);
    setLastAskedQuestion(trimmed);

    try {
      const response = await ragApi.ask(trimmed);
      setResult(response);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to retrieve an answer from your journal.';
      setError(msg);
    } finally {
      setAsking(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Ask RecallAI
            </h2>
            <p className="text-xs text-slate-500">
              Ask questions grounded strictly in your private journal entries
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={asking}
          maxLength={1000}
          placeholder="e.g., What did I eat for breakfast on Tuesday?"
          className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={asking || !question.trim()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm transition-colors disabled:opacity-50 shrink-0"
        >
          {asking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching &amp; Generating...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Ask Journal
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result && !asking && (
        <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
          {lastAskedQuestion && (
            <div className="text-xs font-medium text-slate-500">
              Question: <span className="text-slate-800">&ldquo;{lastAskedQuestion}&rdquo;</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              Grounded Answer
            </p>
            <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
              {result.answer}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Source Citations ({result.sources.length})
            </p>

            {result.sources.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  No matching journal entries met the relevance threshold for this question.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {result.sources.map((source) => (
                  <div
                    key={source.entryId}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        {source.title}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(source.createdAt).toLocaleDateString()} at{' '}
                        {new Date(source.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed italic">
                      &ldquo;{source.excerpt}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

