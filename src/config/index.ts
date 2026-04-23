import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AppConfig } from "../types/index.js";

const DEFAULT_CONFIG: AppConfig = {
  languages: ["", "python", "typescript"],
  since: "daily",
  maxReposPerSection: 25,
  outputDir: "./output",
  focusTopics: [
    "ai",
    "agent",
    "llm",
    "mcp",
    "knowledge-base",
    "rag",
    "deep-learning",
    "machine-learning",
    "nlp",
    "chatbot",
    "openai",
    "embedding",
    "vector-database",
  ],
};

export function loadConfig(): AppConfig {
  let fileConfig: Partial<AppConfig> = {};

  try {
    const configPath = resolve(process.cwd(), "config.json");
    const raw = readFileSync(configPath, "utf-8");
    fileConfig = JSON.parse(raw);
  } catch {
    // config.json not found or invalid, use defaults
  }

  // Environment variable overrides
  const envToken = process.env.GITHUB_TOKEN;
  const envSince = process.env.TREND_SINCE as AppConfig["since"] | undefined;
  const envLanguages = process.env.TREND_LANGUAGES?.split(",").filter(Boolean);

  return {
    languages: envLanguages ?? fileConfig.languages ?? DEFAULT_CONFIG.languages,
    since: envSince ?? fileConfig.since ?? DEFAULT_CONFIG.since,
    maxReposPerSection:
      fileConfig.maxReposPerSection ?? DEFAULT_CONFIG.maxReposPerSection,
    outputDir: fileConfig.outputDir ?? DEFAULT_CONFIG.outputDir,
    focusTopics: fileConfig.focusTopics ?? DEFAULT_CONFIG.focusTopics,
    githubToken: envToken ?? fileConfig.githubToken,
  };
}
