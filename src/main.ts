import { loadConfig } from "./config/index.js";
import { scrapeTrending } from "./scraper/trending-scraper.js";
import { enrichRepoDetails } from "./scraper/github-api.js";
import { saveReport } from "./generator/markdown-generator.js";
import type { DailyReport, ReportSection, TrendingRepo, AppConfig } from "./types/index.js";

function findHighlights(allRepos: TrendingRepo[], config: AppConfig): TrendingRepo[] {
  const topicSet = new Set(config.focusTopics.map((t) => t.toLowerCase()));
  const seen = new Set<string>();

  return allRepos.filter((repo) => {
    if (seen.has(repo.fullName)) return false;
    seen.add(repo.fullName);

    // Match by topics (from API enrichment)
    if (repo.topics.some((t) => topicSet.has(t.toLowerCase()))) {
      return true;
    }

    // Fallback: keyword match in description
    const descLower = repo.description.toLowerCase();
    return config.focusTopics.some(
      (topic) =>
        descLower.includes(topic.replace(/-/g, " ")) ||
        descLower.includes(topic)
    );
  });
}

async function main() {
  console.log("=== GitHub Trending Robot ===\n");

  const config = loadConfig();
  const date = new Date().toISOString().split("T")[0];

  console.log(`Date: ${date}`);
  console.log(`Languages: [${config.languages.map((l) => l || "overall").join(", ")}]`);
  console.log(`Since: ${config.since}`);
  console.log(`Token: ${config.githubToken ? "provided" : "not provided"}\n`);

  const sections: ReportSection[] = [];
  const allRepos: TrendingRepo[] = [];

  for (const language of config.languages) {
    const label = language || "overall";
    const langName = language.charAt(0).toUpperCase() + language.slice(1);
    const title = language
      ? `${langName === "Typescript" ? "TypeScript" : langName} Trending`
      : "Overall Trending";

    try {
      let repos = await scrapeTrending(language || undefined, config.since);

      // Enrich with GitHub API
      repos = await enrichRepoDetails(repos, config.githubToken);

      // Cap repos per section
      repos = repos.slice(0, config.maxReposPerSection);

      sections.push({ title, language, repos });
      allRepos.push(...repos);

      console.log(`  [${label}] ${repos.length} repos collected\n`);
    } catch (err) {
      console.error(`  [${label}] Failed: ${(err as Error).message}\n`);
    }
  }

  if (sections.length === 0) {
    console.error("No data collected. Exiting.");
    process.exit(1);
  }

  // Find AI/Agent highlights
  const highlights = findHighlights(allRepos, config);
  console.log(`Highlights: ${highlights.length} AI/Agent related repos\n`);

  // Build report
  const report: DailyReport = {
    date,
    sections,
    highlights,
  };

  const filePath = saveReport(report, config);
  console.log(`\nDone! Report: ${filePath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
