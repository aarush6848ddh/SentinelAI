"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Shield, Bug, Sparkles, FileCode, ArrowUp, ChevronRight, AlertTriangle } from "lucide-react";
import Sidebar from "../../../../components/Sidebar";
import { getIssue, streamChatMessage } from "../../../../lib/api";

type Issue = {
  id: number;
  title: string;
  severity: string;
  category: string;
  file_path: string;
  line_number: number | null;
  description: string;
  status: string;
};

type Message = { role: "user" | "assistant"; content: string };

const severityStyles: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high:     "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  low:      "bg-zinc-700/40 text-zinc-400 border-zinc-700",
};

const categoryIcon: Record<string, React.ReactNode> = {
  security: <Shield size={12} />,
  bug: <Bug size={12} />,
  quality: <Sparkles size={12} />,
};

const SUGGESTIONS = [
  "How do I fix this?",
  "Why is this a problem?",
  "Show me an example fix",
  "How urgent is this?",
];

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="text-zinc-100 font-semibold">{children}</strong>,
        ol: ({ children }) => <ol className="list-decimal list-outside ml-4 space-y-1.5 my-2.5">{children}</ol>,
        ul: ({ children }) => <ul className="list-disc list-outside ml-4 space-y-1.5 my-2.5">{children}</ul>,
        li: ({ children }) => <li>{children}</li>,
        code: ({ children, className }) =>
          className ? (
            <code className="block bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 my-2 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre">
              {children}
            </code>
          ) : (
            <code className="bg-zinc-800 rounded px-1.5 py-0.5 text-xs font-mono text-emerald-400">{children}</code>
          ),
        pre: ({ children }) => <>{children}</>,
        h3: ({ children }) => <h3 className="text-zinc-100 font-semibold mt-3 mb-1.5">{children}</h3>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function IssuePage() {
  const { id, issueId } = useParams<{ id: string; issueId: string }>();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { getIssue(Number(issueId)).then(setIssue); }, [issueId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setSending(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    await streamChatMessage(Number(issueId), msg, history, (chunk) => {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: updated[updated.length - 1].content + chunk,
        };
        return updated;
      });
    });
    setSending(false);
    inputRef.current?.focus();
  }

  if (!issue) {
    return (
      <div className="flex h-screen bg-zinc-950">
        <Sidebar activeRepoId={Number(id)} />
        <div className="flex-1 flex items-center justify-center text-zinc-700 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <Sidebar activeRepoId={Number(id)} />

      <div className="flex-1 flex min-w-0 overflow-hidden">
        {/* Issue detail panel */}
        <div className="w-80 shrink-0 border-r border-zinc-800 overflow-y-auto flex flex-col">
          {/* Breadcrumb */}
          <div className="px-6 pt-6 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-1 text-xs text-zinc-600 mb-4">
              <Link href="/" className="hover:text-zinc-400 transition-colors">Home</Link>
              <ChevronRight size={11} />
              <Link href={`/repos/${id}`} className="hover:text-zinc-400 transition-colors">Issues</Link>
              <ChevronRight size={11} />
              <span className="text-zinc-500">#{issueId}</span>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className={`flex items-center gap-1 text-xs border px-2 py-0.5 rounded-md capitalize ${severityStyles[issue.severity] ?? ""}`}>
                <AlertTriangle size={11} />
                {issue.severity}
              </span>
              <span className="flex items-center gap-1 text-xs border border-zinc-700 bg-zinc-800/50 text-zinc-400 px-2 py-0.5 rounded-md capitalize">
                {categoryIcon[issue.category]}
                {issue.category}
              </span>
            </div>

            <h1 className="text-base font-semibold text-zinc-100 leading-snug">{issue.title}</h1>
            <p className="flex items-center gap-1 text-xs text-zinc-600 font-mono mt-2">
              <FileCode size={11} />
              {issue.file_path}{issue.line_number ? `:${issue.line_number}` : ""}
            </p>
          </div>

          {/* Description */}
          <div className="px-6 py-4 flex-1">
            <p className="text-xs font-medium text-zinc-600 uppercase tracking-wider mb-2">Description</p>
            <p className="text-sm text-zinc-400 leading-relaxed">{issue.description}</p>
          </div>

          {/* Quick questions */}
          {messages.length === 0 && (
            <div className="px-6 py-4 border-t border-zinc-800">
              <p className="text-xs font-medium text-zinc-600 uppercase tracking-wider mb-2">Ask about this</p>
              <div className="flex flex-col gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-left text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-2 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 shrink-0">
            <p className="text-sm font-medium text-zinc-300">Security Assistant</p>
            <p className="text-xs text-zinc-600">Grounded in this issue</p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="flex flex-col gap-5 max-w-xl">
              {messages.length === 0 && (
                <p className="text-sm text-zinc-700">Ask anything about this issue…</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div
                    className={`text-sm leading-relaxed max-w-[85%] ${
                      m.role === "user"
                        ? "bg-zinc-800 text-zinc-200 rounded-2xl rounded-tr-sm px-4 py-2.5"
                        : "text-zinc-300"
                    }`}
                  >
                    {m.role === "user" ? (
                      m.content
                    ) : m.content === "" ? (
                      <span className="flex gap-1 items-center h-5">
                        <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:120ms]" />
                        <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:240ms]" />
                      </span>
                    ) : (
                      <MarkdownMessage content={m.content} />
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-zinc-800 shrink-0">
            <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus-within:border-zinc-700 transition-colors">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Ask about this issue…"
                className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-600 text-sm outline-none resize-none leading-relaxed"
                style={{ minHeight: "22px" }}
              />
              <button
                onClick={() => handleSend()}
                disabled={sending || !input.trim()}
                className="w-7 h-7 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors shrink-0"
              >
                <ArrowUp size={13} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
