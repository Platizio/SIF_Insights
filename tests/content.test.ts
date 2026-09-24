/**
 * Editorial content: the video library, expert conversations, articles, FAQs.
 *
 * The rule under test is the export gate, not the copy: only what is signed
 * off leaves lib/content, an excluded video can never come back through a
 * copy-paste, and every id a page keys a list on is unique. The raw JSON is
 * read directly so the gate is checked against the file, not against itself.
 */
import { describe, expect, it } from "vitest";

import {
  articleBySlug,
  articles,
  channel,
  excludedVideoIds,
  experts,
  featuredVideos,
  videos,
  videoTitle,
} from "@/lib/content";
import articlesJson from "@/lib/content/articles.json";
import expertsJson from "@/lib/content/experts.json";
import videosJson from "@/lib/content/videos.json";
import { BANNED_COPY } from "@/lib/compliance";
import { faqs } from "@/lib/data";

import { rawFaqs } from "./raw-source";

const RICKROLL = "dQw4w9WgXcQ";
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

const rawVideos = videosJson as {
  videos: { id: string; title: string; featuredOrder: number | null }[];
  excluded: { id: string; reason: string }[];
};
const rawArticles = articlesJson as { slug: string; approved: boolean }[];
const rawExperts = expertsJson as { id: string; approved: boolean }[];

describe("videos", () => {
  it("every id is a well-formed YouTube id, listed once", () => {
    for (const v of rawVideos.videos) expect(v.id, v.title).toMatch(YOUTUBE_ID);
    expect(new Set(rawVideos.videos.map((v) => v.id)).size).toBe(rawVideos.videos.length);
  });

  it("every video carries its own non-empty title", () => {
    for (const v of videos) expect(v.title.trim().length, v.id).toBeGreaterThan(0);
  });

  it("the mislabelled Rick Astley video is excluded, and stays out", () => {
    expect(excludedVideoIds.has(RICKROLL)).toBe(true);
    expect(videos.some((v) => v.id === RICKROLL)).toBe(false);
    expect(featuredVideos.some((v) => v.id === RICKROLL)).toBe(false);
    for (const x of rawVideos.excluded) {
      expect(x.reason.trim().length).toBeGreaterThan(0);
      expect(videos.some((v) => v.id === x.id)).toBe(false);
    }
  });

  it("the library is the catalogue minus the exclusions, in catalogue order", () => {
    const expected = rawVideos.videos.filter((v) => !excludedVideoIds.has(v.id)).map((v) => v.id);
    expect(videos.map((v) => v.id)).toEqual(expected);
  });

  it("featured videos are the ones with a featuredOrder, in that order, each slot once", () => {
    const orders = featuredVideos.map((v) => v.featuredOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a! - b!));
    expect(new Set(orders).size).toBe(orders.length);
    expect(featuredVideos.length).toBeLessThanOrEqual(4);
    for (const o of orders) expect([1, 2, 3, 4]).toContain(o);
    const expected = videos
      .filter((v) => v.featuredOrder !== null)
      .sort((a, b) => a.featuredOrder! - b.featuredOrder!)
      .map((v) => v.id);
    expect(featuredVideos.map((v) => v.id)).toEqual(expected);
  });

  /* The titles a page prints are on-page copy: a distributor's site may not
     call a fund the best, or promise it beats the market or pays a steady
     income. Anything the channel titled that way carries a `displayTitle`. */
  it("no title a page prints makes a banned or return-promising claim", () => {
    const PROMISES = [
      /\bbest\b/i,
      /beat the market/i,
      /fastest-growing/i,
      /right for you/i,
      /steady returns/i,
      /monthly income/i,
      /consistent performer/i,
      /stable income/i,
      /alpha-returns/i,
    ];
    for (const v of videos) {
      const title = videoTitle(v);
      for (const phrase of BANNED_COPY) {
        expect(title.toLowerCase().includes(phrase.toLowerCase()), `${v.id}: "${title}"`).toBe(false);
      }
      for (const re of PROMISES) expect(re.test(title), `${v.id}: "${title}"`).toBe(false);
    }
  });

  it("a display title is never empty and never the verbatim title again", () => {
    for (const v of videos) {
      if (v.displayTitle === undefined) continue;
      expect(v.displayTitle.trim().length, v.id).toBeGreaterThan(0);
      expect(v.displayTitle, v.id).not.toBe(v.title);
    }
  });

  it("durations and dates are null or real — never estimated placeholders", () => {
    for (const v of videos) {
      if (v.durationSec !== null) expect(v.durationSec).toBeGreaterThan(0);
      if (v.publishedAt !== null) expect(v.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
    }
  });

  it("points at the channel over https", () => {
    expect(channel.url).toMatch(/^https:\/\/www\.youtube\.com\/@/);
    expect(channel.url.endsWith(channel.handle)).toBe(true);
  });
});

describe("experts", () => {
  it("exports approved entries only, each id once", () => {
    const approved = rawExperts.filter((e) => e.approved === true).map((e) => e.id);
    expect(experts.map((e) => e.id)).toEqual(approved);
    expect(new Set(experts.map((e) => e.id)).size).toBe(experts.length);
  });
});

describe("articles", () => {
  it("exports approved articles only", () => {
    for (const a of articles) expect(a.approved).toBe(true);
    const unapproved = rawArticles.filter((a) => a.approved !== true).map((a) => a.slug);
    for (const slug of unapproved) {
      expect(articles.some((a) => a.slug === slug)).toBe(false);
      expect(articleBySlug(slug)).toBeUndefined();
    }
    expect(articles.length).toBe(rawArticles.filter((a) => a.approved === true).length);
  });

  it("slugs are unique and URL-safe, and articleBySlug finds each one", () => {
    expect(new Set(rawArticles.map((a) => a.slug)).size).toBe(rawArticles.length);
    for (const a of articles) {
      expect(a.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(articleBySlug(a.slug)).toBe(a);
    }
    expect(articleBySlug("no-such-article")).toBeUndefined();
  });

  it("is ordered newest first, and every article says where its text came from", () => {
    const dates = articles.map((a) => a.publishedAt);
    expect(dates).toEqual([...dates].sort().reverse());
    for (const a of articles) {
      expect(a.provenance.trim().length).toBeGreaterThan(0);
      expect(a.body.length).toBeGreaterThan(0);
    }
  });
});

describe("faqs", () => {
  it("ids are unique, and every entry has a question and an answer", () => {
    expect(new Set(rawFaqs.map((f) => f.id)).size).toBe(rawFaqs.length);
    for (const f of faqs) {
      expect(f.question.trim().length).toBeGreaterThan(0);
      expect(f.answer.trim().length).toBeGreaterThan(0);
    }
  });

  it("exports every FAQ except those awaiting sign-off (approved: false)", () => {
    const expected = rawFaqs.filter((f) => f.approved !== false).map((f) => f.id);
    expect(faqs.map((f) => f.id)).toEqual(expected);
    for (const f of faqs) expect(f.approved).not.toBe(false);
  });

  it("carries the optional sign-off fields with the right types when present", () => {
    for (const f of rawFaqs) {
      if (f.approved !== undefined) expect(typeof f.approved).toBe("boolean");
      if (f.category !== undefined) expect(f.category.trim().length).toBeGreaterThan(0);
    }
  });
});
