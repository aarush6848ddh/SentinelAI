"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  GitFork,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Lock,
  Globe,
} from "lucide-react";
import {
  getGithubRepos,
  getRepositories,
  getCrawlJobs,
  createRepository,
  triggerCrawl,
  getIssues,
} from "../lib/api";

type GithubRepo = {
  id: number;
  full_name: string;
  url: string;
  default_branch: string;
  description: string | null;
  private: boolean;
};

type SentinelRepo = {
  id: number;
  github_repo_id: number;
  full_name: string;
  status: string;
};

type CrawlJob = {
  id: number;
  repository_id: number;
  status: string;
};

type IssueCounts = {
  critical: number;
  high: number;
  medium: number;
  low: number;
};

function CrawlDot({ status }: { status: string }) {
  if (status === "completed") return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />;
  if (status === "failed") return <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />;
  if (status === "running") return <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0 animate-pulse" />;
  return <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />;
}

export default function Sidebar({ activeRepoId }: { activeRepoId?: number }) {
  const pathname = usePathname();
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [sentinelRepos, setSentinelRepos] = useState<SentinelRepo[]>([]);
  const [crawlJobs, setCrawlJobs] = useState<CrawlJob[]>([]);
  const [issueCounts, setIssueCounts] = useState<Record<number, IssueCounts>>({});
  const [adding, setAdding] = useState<number | null>(null);
  const [crawling, setCrawling] = useState<number | null>(null);

  async function load() {
    const [gh, sr, cj] = await Promise.all([
      getGithubRepos(),
      getRepositories(),
      getCrawlJobs(),
    ]);
    setGithubRepos(gh);
    setSentinelRepos(sr);
    setCrawlJobs(cj);

    // Load issue counts for each tracked repo
    const counts: Record<number, IssueCounts> = {};
    await Promise.all(
      sr.map(async (repo: SentinelRepo) => {
        const issues = await getIssues(repo.id);
        counts[repo.id] = {
          critical: issues.filter((i: { severity: string }) => i.severity === "critical").length,
          high: issues.filter((i: { severity: string }) => i.severity === "high").length,
          medium: issues.filter((i: { severity: string }) => i.severity === "medium").length,
          low: issues.filter((i: { severity: string }) => i.severity === "low").length,
        };
      })
    );
    setIssueCounts(counts);
  }

  useEffect(() => { load(); }, []);

  function latestJob(sentinelId: number) {
    return crawlJobs
      .filter((j) => j.repository_id === sentinelId)
      .sort((a, b) => b.id - a.id)[0];
  }

  function sentinelRepoFor(ghId: number) {
    return sentinelRepos.find((r) => r.github_repo_id === ghId);
  }

  async function handleAdd(repo: GithubRepo) {
    setAdding(repo.id);
    await createRepository({
      github_repo_id: repo.id,
      full_name: repo.full_name,
      url: repo.url,
      default_branch: repo.default_branch,
    });
    await load();
    setAdding(null);
  }

  async function handleCrawl(e: React.MouseEvent, sentinelId: number) {
    e.preventDefault();
    setCrawling(sentinelId);
    await triggerCrawl(sentinelId);
    await load();
    setCrawling(null);
  }

  const isHome = pathname === "/";

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col h-screen sticky top-0 overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-zinc-800">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
            <ShieldCheck size={13} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-zinc-100">SentinelAI</span>
        </Link>
      </div>

      {/* Nav */}
      <div className="px-2 py-3 border-b border-zinc-800">
        <Link
          href="/"
          className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
            isHome
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <ShieldCheck size={14} />
          Assistant
        </Link>
      </div>

      {/* Repos */}
      <div className="flex-1 overflow-y-auto py-3">
        <p className="px-4 text-xs font-medium text-zinc-600 uppercase tracking-wider mb-2">
          Repositories
        </p>

        {githubRepos.length === 0 ? (
          <p className="px-4 text-xs text-zinc-600">Loading…</p>
        ) : (
          <div className="flex flex-col gap-0.5 px-2">
            {githubRepos.map((repo) => {
              const sentinel = sentinelRepoFor(repo.id);
              const job = sentinel ? latestJob(sentinel.id) : null;
              const counts = sentinel ? issueCounts[sentinel.id] : null;
              const isActive = sentinel?.id === activeRepoId;
              const name = repo.full_name.split("/")[1];

              return (
                <div key={repo.id}>
                  {sentinel ? (
                    <Link
                      href={`/repos/${sentinel.id}`}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors group ${
                        isActive
                          ? "bg-zinc-800 text-zinc-100"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                      }`}
                    >
                      <GitFork size={13} className="shrink-0 text-zinc-600" />
                      <span className="truncate flex-1 text-xs">{name}</span>
                      {job && <CrawlDot status={job.status} />}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-zinc-600 group">
                      {repo.private ? <Lock size={13} className="shrink-0" /> : <Globe size={13} className="shrink-0" />}
                      <span className="truncate flex-1 text-xs">{name}</span>
                      <button
                        onClick={() => handleAdd(repo)}
                        disabled={adding === repo.id}
                        className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-all"
                        title="Add to SentinelAI"
                      >
                        {adding === repo.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Plus size={12} />
                        }
                      </button>
                    </div>
                  )}

                  {/* Issue count pills */}
                  {counts && (counts.critical + counts.high + counts.medium + counts.low) > 0 && (
                    <div className="flex gap-1 pl-7 pb-1">
                      {counts.critical > 0 && (
                        <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                          {counts.critical}C
                        </span>
                      )}
                      {counts.high > 0 && (
                        <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
                          {counts.high}H
                        </span>
                      )}
                      {counts.medium > 0 && (
                        <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                          {counts.medium}M
                        </span>
                      )}
                    </div>
                  )}

                  {/* Crawl button for tracked repos */}
                  {sentinel && (
                    <div className="pl-7 pb-1">
                      <button
                        onClick={(e) => handleCrawl(e, sentinel.id)}
                        disabled={crawling === sentinel.id}
                        className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                      >
                        <RefreshCw size={10} className={crawling === sentinel.id ? "animate-spin" : ""} />
                        {crawling === sentinel.id ? "Running…" : "Run crawl"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-800">
        <p className="text-[10px] text-zinc-700">Hover a repo to add it</p>
      </div>
    </aside>
  );
}
