"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Bug, Sparkles, Shield, ChevronRight, FileCode } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { getIssues } from "../../lib/api";

type Issue = {
  id: number;
  title: string;
  severity: string;
  category: string;
  file_path: string;
  line_number: number | null;
  status: string;
};

const SEVERITIES = ["all", "critical", "high", "medium", "low"];
const CATEGORIES = ["all", "security", "bug", "quality"];

const severityStyles: Record<string, { pill: string; bar: string; count: string }> = {
  critical: { pill: "bg-red-500/10 text-red-400 border-red-500/20",    bar: "bg-red-500",    count: "text-red-400" },
  high:     { pill: "bg-orange-500/10 text-orange-400 border-orange-500/20", bar: "bg-orange-500", count: "text-orange-400" },
  medium:   { pill: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", bar: "bg-yellow-500", count: "text-yellow-400" },
  low:      { pill: "bg-zinc-700/40 text-zinc-400 border-zinc-700",    bar: "bg-zinc-600",   count: "text-zinc-500" },
};

const leftBorder: Record<string, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-zinc-700",
};

const categoryIcon: Record<string, React.ReactNode> = {
  security: <Shield size={11} />,
  bug: <Bug size={11} />,
  quality: <Sparkles size={11} />,
};

export default function RepoPage() {
  const { id } = useParams<{ id: string }>();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [severity, setSeverity] = useState("all");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIssues(Number(id)).then(setAllIssues);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    getIssues(
      Number(id),
      severity !== "all" ? severity : undefined,
      category !== "all" ? category : undefined
    ).then((data) => { setIssues(data); setLoading(false); });
  }, [id, severity, category]);

  const counts = {
    critical: allIssues.filter((i) => i.severity === "critical").length,
    high:     allIssues.filter((i) => i.severity === "high").length,
    medium:   allIssues.filter((i) => i.severity === "medium").length,
    low:      allIssues.filter((i) => i.severity === "low").length,
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <Sidebar activeRepoId={Number(id)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-1.5 text-xs text-zinc-600 mb-4">
            <Link href="/" className="hover:text-zinc-400 transition-colors">Home</Link>
            <ChevronRight size={12} />
            <span className="text-zinc-400">Issues</span>
          </div>

          {/* Severity stat cards */}
          <div className="grid grid-cols-4 gap-3">
            {(["critical", "high", "medium", "low"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSeverity(severity === s ? "all" : s)}
                className={`text-left rounded-xl border px-4 py-3 transition-all ${
                  severityStyles[s].pill
                } ${severity === s ? "ring-1 ring-current ring-offset-1 ring-offset-zinc-950" : "opacity-60 hover:opacity-100"}`}
              >
                <p className={`text-2xl font-semibold tabular-nums ${severityStyles[s].count}`}>
                  {counts[s]}
                </p>
                <p className="text-xs capitalize mt-0.5 opacity-70">{s}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="px-8 py-3 border-b border-zinc-800 flex items-center gap-4">
          <div className="flex gap-1">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={`px-2.5 py-1 rounded-md text-xs capitalize transition-colors ${
                  severity === s
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="w-px h-3 bg-zinc-800" />
          <div className="flex gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-2.5 py-1 rounded-md text-xs capitalize transition-colors ${
                  category === c
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-zinc-600">{issues.length} issues</span>
        </div>

        {/* Issues list */}
        <div className="px-8 py-4 flex flex-col gap-1.5">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-zinc-900 animate-pulse" />
            ))
          ) : issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-zinc-700">
              <AlertTriangle size={28} />
              <p className="text-sm">No issues match these filters</p>
            </div>
          ) : (
            issues.map((issue) => (
              <Link
                key={issue.id}
                href={`/repos/${id}/issues/${issue.id}`}
                className={`group flex items-center gap-4 px-4 py-3 rounded-xl border border-zinc-800 border-l-2 ${
                  leftBorder[issue.severity] ?? "border-l-zinc-700"
                } hover:bg-zinc-900 hover:border-zinc-700 transition-all`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{issue.title}</p>
                  <p className="text-xs text-zinc-600 font-mono mt-0.5">
                    <FileCode size={10} className="inline mr-1" />
                    {issue.file_path}{issue.line_number ? `:${issue.line_number}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`flex items-center gap-1 text-[11px] border px-2 py-0.5 rounded-md capitalize ${severityStyles[issue.severity]?.pill ?? ""}`}>
                    {categoryIcon[issue.category]}
                    {issue.severity}
                  </span>
                  <ChevronRight size={13} className="text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
