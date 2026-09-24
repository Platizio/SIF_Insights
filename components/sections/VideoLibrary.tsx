import { ArrowIcon } from "@/components/icons";
import { LineReveal } from "@/components/motion/LineReveal";
import { Group, GroupItem, Rise } from "@/components/motion/Reveal";
import { Eyebrow, Section, Shell } from "@/components/primitives";
import { VideoCard } from "@/components/video/VideoCard";
import { featuredVideos, videoTitle } from "@/lib/content";
import { SITE } from "@/lib/site";

import { VideoCarousel, type CarouselVideo } from "./VideoLibraryClient";

/* ============================================================
   SIF INSIGHT VIDEO LIBRARY — home, PRD p.14.

   A CURATED selection, never "latest": the order is the catalogue's
   `featuredOrder` (lib/content/videos.json), picked by the client, and
   nothing here sorts by date or says "new".

   Server wrapper. It reads the featured list and hands the carousel
   plain { id, title, durationSec } props. With fewer than two featured
   videos a carousel is pointless chrome, so it renders a static grid;
   with none, it says honestly where the videos are.
   ============================================================ */

export function VideoLibrary() {
  const videos: CarouselVideo[] = featuredVideos.slice(0, 4).map((v) => ({
    id: v.id,
    title: videoTitle(v),
    durationSec: v.durationSec,
  }));
  const youtube = SITE.socials.youtube;

  return (
    <Section id="videos" className="bg-surface">
      <Shell>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
          <div>
            <Rise>
              <Eyebrow>Watch and learn</Eyebrow>
            </Rise>
            <LineReveal
              as="h2"
              className="mt-5 text-[clamp(30px,3.4vw,44px)] font-medium leading-[1.2] text-ink"
              lines={["SIF Insight Video Library"]}
            />
          </div>
          <Rise delay={0.08}>
            <p className="max-w-[52ch] text-[17px] leading-[30px] text-body">
              A curated selection of SIF Insight videos covering SIF education,
              strategy explainers, fund insights and market analysis.
            </p>
          </Rise>
        </div>

        <div className="mt-12">
          {videos.length >= 2 ? (
            <VideoCarousel videos={videos} />
          ) : videos.length === 1 ? (
            <Group className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {videos.map((v) => (
                <GroupItem key={v.id} className="h-full border border-hairline bg-ground">
                  <VideoCard
                    id={v.id}
                    title={v.title}
                    durationSec={v.durationSec}
                    sizes="(min-width: 768px) 50vw, 100vw"
                  />
                </GroupItem>
              ))}
            </Group>
          ) : (
            <p className="text-[15px] leading-[26px] text-body">
              Our explainers and fund insights are published on the SIF Insight
              YouTube channel.
            </p>
          )}
        </div>

        {youtube ? (
          <Rise delay={0.1} className="mt-10">
            <a
              href={youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 text-[15px] font-medium leading-[22px] text-accent transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-accent-dim"
            >
              View All Videos on YouTube
              <ArrowIcon
                size={14}
                className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1"
              />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Rise>
        ) : null}
      </Shell>
    </Section>
  );
}
