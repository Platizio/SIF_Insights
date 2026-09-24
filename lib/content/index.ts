import videosRaw from "./videos.json";
import expertsRaw from "./experts.json";
import articlesRaw from "./articles.json";

/* ============================================================
   Editorial content: the video library, expert conversations and
   articles.

   Kept out of lib/data on purpose. None of it is a market fact and
   none of it changes with the nightly NAV run — it is ours, written
   or recorded by SIF Insight — so it has its own module and its own
   rule: only what has been SIGNED OFF is exported. An article with
   `approved: false` exists in the file for review and nowhere else.
   ============================================================ */

export type Video = {
  /** YouTube video id. */
  id: string;
  /** The video's own title, verbatim. */
  title: string;
  /**
   * The neutral title the site prints instead, where the verbatim one makes
   * a return or outcome claim ("Beat the Market", "Steady Returns") or uses
   * banned words ("Best"). Read through `videoTitle`, never directly.
   */
  displayTitle?: string;
  /** Null until read from YouTube — never estimated. */
  durationSec: number | null;
  publishedAt: string | null;
  /** 1–4 places the video on the home page; null keeps it to the library. */
  featuredOrder: number | null;
};

export type Channel = { url: string; handle: string };

export type Expert = {
  id: string;
  name: string;
  role: string;
  organisation: string | null;
  /** The conversation, when it is on the channel. */
  videoId: string | null;
  topic: string | null;
  approved: boolean;
};

export type ArticleBlock =
  | { type: "p" | "h2" | "quote"; text: string }
  | { type: "ul"; items: string[] };

export type Article = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  readingMinutes: number;
  category: string;
  body: ArticleBlock[];
  /** Where the text came from — e.g. "Old site, recovered via the Wayback Machine". */
  provenance: string;
  approved: boolean;
};

const videoFile = videosRaw as {
  channel: Channel;
  videos: Video[];
  excluded: { id: string; reason: string }[];
};

/** Ids that must never be shown, whatever the catalogue says. */
export const excludedVideoIds: ReadonlySet<string> = new Set(
  videoFile.excluded.map((v) => v.id),
);

export const channel: Channel = videoFile.channel;

/** The title a page prints: the neutral `displayTitle` where one is set. */
export function videoTitle(v: Video): string {
  return v.displayTitle ?? v.title;
}

/** The library, in catalogue order, minus anything excluded. */
export const videos: Video[] = videoFile.videos.filter((v) => !excludedVideoIds.has(v.id));

/** The home-page selection, in `featuredOrder`. */
export const featuredVideos: Video[] = videos
  .filter((v): v is Video & { featuredOrder: number } => v.featuredOrder !== null)
  .sort((a, b) => a.featuredOrder - b.featuredOrder);

/** Approved entries only. The /learn#experts section says so honestly while this is empty. */
export const experts: Expert[] = (expertsRaw as Expert[]).filter((e) => e.approved === true);

/** Approved articles only, newest first. */
export const articles: Article[] = (articlesRaw as Article[])
  .filter((a) => a.approved === true)
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export function articleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}
