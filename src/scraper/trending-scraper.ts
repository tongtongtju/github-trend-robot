import * as cheerio from "cheerio";
import type { TrendingRepo } from "../types/index.js";

const BASE_URL = "https://github.com/trending";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

function parseNumber(text: string): number {
  if (!text) return 0;
  const cleaned = text.trim().replace(/,/g, "");
  const match = cleaned.match(/([\d.]+)\s*k/i);
  if (match) {
    return Math.round(parseFloat(match[1]) * 1000);
  }
  return parseInt(cleaned, 10) || 0;
}

function extractRepoPath(el: cheerio.Cheerio<cheerio.Element>): {
  owner: string;
  name: string;
} {
  const link = el.find("h2 a").first();
  const href = link.attr("href") ?? "";
  // href format: /owner/name
  const parts = href.replace(/^\//, "").split("/");
  return {
    owner: parts[0] ?? "",
    name: parts[1] ?? "",
  };
}

export async function scrapeTrending(
  language?: string,
  since: "daily" | "weekly" | "monthly" = "daily"
): Promise<TrendingRepo[]> {
  const langPath = language ? `/${language}` : "";
  const url = `${BASE_URL}${langPath}?since=${since}`;

  console.log(`Fetching: ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const rows = $("article.Box-row");
  console.log(`  Found ${rows.length} repositories`);

  if (rows.length < 5) {
    console.warn(
      `  Warning: Only ${rows.length} repos found. The page structure may have changed.`
    );
  }

  const repos: TrendingRepo[] = [];

  rows.each((_, el) => {
    const $el = $(el);
    const { owner, name } = extractRepoPath($el);

    if (!owner || !name) return;

    const description = $el.find("p.col-9").text().trim();
    const language = $el.find('[itemprop="programmingLanguage"]').text().trim();
    const languageColor =
      $el.find(".repo-language-color").attr("style")?.replace("background-color:", "").trim() ?? "";

    // Stars: find link containing /stargazers
    const starsText =
      $el
        .find("a.Link--muted")
        .filter((_, a) => $(a).attr("href")?.includes("stargazers"))
        .text()
        .trim() ?? "0";

    // Forks: find link containing /forks
    const forksText =
      $el
        .find("a.Link--muted")
        .filter((_, a) => $(a).attr("href")?.includes("forks"))
        .text()
        .trim() ?? "0";

    // Stars today/this week/this month
    const starsTodayText = $el.find(".float-sm-right").text().trim();

    // Built by: avatar images
    const builtBy: string[] = [];
    $el.find("img.avatar.mb-1").each((_, img) => {
      const alt = $(img).attr("alt") ?? "";
      if (alt.startsWith("@")) {
        builtBy.push(alt.replace("@", ""));
      }
    });

    repos.push({
      owner,
      name,
      fullName: `${owner}/${name}`,
      url: `https://github.com/${owner}/${name}`,
      description,
      language,
      languageColor,
      stars: parseNumber(starsText),
      forks: parseNumber(forksText),
      starsToday: parseNumber(starsTodayText),
      topics: [],
      license: "",
      builtBy,
    });
  });

  return repos;
}
