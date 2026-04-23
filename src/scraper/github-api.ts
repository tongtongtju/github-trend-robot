import type { TrendingRepo } from "../types/index.js";

const API_BASE = "https://api.github.com";
const USER_AGENT = "GitHub-Trend-Robot/1.0";
const DELAY_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RateLimitInfo {
  remaining: number;
  limit: number;
}

async function apiRequest(
  path: string,
  token?: string
): Promise<{ data: unknown; rateLimit: RateLimitInfo }> {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "application/vnd.github.v3+json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { headers });

  const rateLimit: RateLimitInfo = {
    remaining: parseInt(response.headers.get("x-ratelimit-remaining") ?? "0", 10),
    limit: parseInt(response.headers.get("x-ratelimit-limit") ?? "0", 10),
  };

  if (!response.ok) {
    if (response.status === 403 && rateLimit.remaining === 0) {
      throw new Error(`Rate limit exceeded. Limit: ${rateLimit.limit}`);
    }
    throw new Error(`API error ${response.status} for ${path}`);
  }

  const data = await response.json();
  return { data, rateLimit };
}

export async function enrichRepoDetails(
  repos: TrendingRepo[],
  token?: string
): Promise<TrendingRepo[]> {
  if (!token) {
    console.log("No GITHUB_TOKEN provided, skipping API enrichment.");
    return repos;
  }

  console.log(`Enriching ${repos.length} repos via GitHub API...`);
  let remaining: number | null = null;

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];

    try {
      if (remaining !== null && remaining < 5) {
        console.warn(`  Rate limit low (${remaining} remaining), stopping enrichment.`);
        break;
      }

      const { data, rateLimit } = await apiRequest(
        `/repos/${repo.owner}/${repo.name}`,
        token
      );

      const repoData = data as {
        topics?: string[];
        license?: { spdx_id: string } | null;
        stargazers_count?: number;
      };

      repo.topics = repoData.topics ?? [];
      repo.license = repoData.license?.spdx_id ?? "";
      if (repoData.stargazers_count) {
        repo.stars = repoData.stargazers_count;
      }

      remaining = rateLimit.remaining;
    } catch (err) {
      console.warn(`  Failed to enrich ${repo.fullName}: ${(err as Error).message}`);
    }

    if (i < repos.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`  Enrichment complete. Rate limit remaining: ${remaining ?? "unknown"}`);
  return repos;
}

export async function checkRateLimit(
  token?: string
): Promise<RateLimitInfo> {
  try {
    const { rateLimit } = await apiRequest("/rate_limit", token);
    return rateLimit;
  } catch {
    return { remaining: 0, limit: 0 };
  }
}
