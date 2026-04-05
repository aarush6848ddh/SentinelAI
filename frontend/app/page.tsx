"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUp, ShieldCheck, Bot } from "lucide-react";
import Sidebar from "./components/Sidebar";
import { streamGeneralChat } from "./lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "What repos are you tracking?",
  "Summarize my security posture",
  "What are the most critical issues?",
  "How do I fix hardcoded secrets?",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setSending(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    await streamGeneralChat(msg, history, (chunk) => {
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Empty state */}
        {isEmpty && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <ShieldCheck size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-zinc-100">SentinelAI</h1>
                <p className="text-sm text-zinc-500 mt-1">Your AI security assistant</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left text-xs text-zinc-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 py-3 transition-colors leading-relaxed"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {!isEmpty && (
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="max-w-2xl mx-auto flex flex-col gap-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {m.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={14} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`text-sm leading-relaxed max-w-[80%] ${
                      m.role === "user"
                        ? "bg-zinc-800 text-zinc-100 rounded-2xl rounded-tr-sm px-4 py-2.5"
                        : "text-zinc-300"
                    }`}
                  >
                    {m.role === "user" ? (
                      m.content
                    ) : m.content === "" ? (
                      <span className="flex gap-1 items-center h-5">
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:120ms]" />
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:240ms]" />
                      </span>
                    ) : (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="text-zinc-100 font-semibold">{children}</strong>,
                          ol: ({ children }) => <ol className="list-decimal list-outside ml-4 space-y-1.5 my-3">{children}</ol>,
                          ul: ({ children }) => <ul className="list-disc list-outside ml-4 space-y-1.5 my-3">{children}</ul>,
                          li: ({ children }) => <li>{children}</li>,
                          code: ({ children, className }) =>
                            className ? (
                              <code className="block bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 my-2 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre">
                                {children}
                              </code>
                            ) : (
                              <code className="bg-zinc-800 rounded px-1.5 py-0.5 text-xs font-mono text-emerald-400">
                                {children}
                              </code>
                            ),
                          pre: ({ children }) => <>{children}</>,
                          h3: ({ children }) => <h3 className="text-zinc-100 font-semibold mt-4 mb-2">{children}</h3>,
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-6 py-4 border-t border-zinc-800">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 focus-within:border-zinc-600 transition-colors">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your repos, issues, or security..."
                className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-600 text-sm outline-none resize-none leading-relaxed"
                style={{ minHeight: "24px" }}
              />
              <button
                onClick={() => handleSend()}
                disabled={sending || !input.trim()}
                className="w-7 h-7 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors shrink-0"
              >
                <ArrowUp size={14} className="text-white" />
              </button>
            </div>
            <p className="text-center text-xs text-zinc-700 mt-2">
              Shift+Enter for new line
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
