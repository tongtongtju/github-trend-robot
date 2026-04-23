export interface TrendingRepo {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string;
  language: string;
  languageColor: string;
  stars: number;
  forks: number;
  starsToday: number;
  topics: string[];
  license: string;
  builtBy: string[];
}

export interface AppConfig {
  languages: string[];
  since: "daily" | "weekly" | "monthly";
  maxReposPerSection: number;
  outputDir: string;
  focusTopics: string[];
  githubToken?: string;
}

export interface ReportSection {
  title: string;
  language: string;
  repos: TrendingRepo[];
}

export interface DailyReport {
  date: string;
  sections: ReportSection[];
  highlights: TrendingRepo[];
}
