const API_BASE = "http://localhost:8000";

export async function getGithubRepos() {
  const res = await fetch(`${API_BASE}/github/repos`);
  return res.json();
}

export async function getRepositories() {
  const res = await fetch(`${API_BASE}/repositories/`);
  return res.json();
}

export async function createRepository(data: {
  github_repo_id: number;
  full_name: string;
  url: string;
  default_branch: string;
}) {
  const res = await fetch(`${API_BASE}/repositories/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function triggerCrawl(repository_id: number) {
  const res = await fetch(`${API_BASE}/crawl-jobs/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repository_id }),
  });
  return res.json();
}

export async function getCrawlJobs() {
  const res = await fetch(`${API_BASE}/crawl-jobs/`);
  return res.json();
}

export async function getIssues(repository_id: number, severity?: string, category?: string) {
  const params = new URLSearchParams({ repository_id: String(repository_id) });
  if (severity) params.append("severity", severity);
  if (category) params.append("category", category);
  const res = await fetch(`${API_BASE}/issues/?${params}`);
  return res.json();
}

export async function getIssue(issue_id: number) {
  const res = await fetch(`${API_BASE}/issues/${issue_id}`);
  return res.json();
}

export async function streamGeneralChat(
  message: string,
  history: { role: string; content: string }[],
  onChunk: (chunk: string) => void
) {
  const res = await fetch(`${API_BASE}/chat/general/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.content) onChunk(parsed.content);
      } catch {}
    }
  }
}

export async function streamChatMessage(
  issue_id: number,
  message: string,
  history: { role: string; content: string }[],
  onChunk: (chunk: string) => void
) {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issue_id, message, history }),
  });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.content) onChunk(parsed.content);
      } catch {}
    }
  }
}
