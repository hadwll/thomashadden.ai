import {
  AboutTeaser,
  type AboutTeaserProps
} from '@/components/sections/AboutTeaser';
import { CollaborateCTA } from '@/components/sections/CollaborateCTA';
import { FeaturedWork } from '@/components/sections/FeaturedWork';
import { HeroSection } from '@/components/sections/HeroSection';
import { LatestInsightsTeaser } from '@/components/sections/LatestInsightsTeaser';
import { LLMInterface } from '@/components/sections/LLMInterface';
import { ReadinessTeaser } from '@/components/sections/ReadinessTeaser';
import { ResearchTeaser } from '@/components/sections/ResearchTeaser';
import { PageShell } from '@/components/layout/PageShell';
import * as contentApi from '@/lib/content/api';
import type { ContentPageResponse } from '@/lib/content/types';

function buildAboutParagraphs(
  aboutContent: ContentPageResponse,
  homeContent: ContentPageResponse
): AboutTeaserProps['paragraphs'] {
  const paragraphs: string[] = [];

  for (const section of aboutContent.sections) {
    const summaryParts = section.summary
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    for (const part of summaryParts) {
      if (paragraphs.length >= 3) {
        break;
      }

      paragraphs.push(part);
    }

    if (paragraphs.length >= 3) {
      break;
    }
  }

  const primarySection = aboutContent.sections[0];
  if (paragraphs.length < 2 && primarySection?.location) {
    paragraphs.push(`Based in ${primarySection.location}, Thomas focuses on practical engineering outcomes.`);
  }

  if (paragraphs.length < 2 && primarySection?.tags && primarySection.tags.length > 0) {
    paragraphs.push(`Current delivery spans ${primarySection.tags.join(', ')}.`);
  }

  if (paragraphs.length < 2 && homeContent.sections[0]?.summary) {
    paragraphs.push(homeContent.sections[0].summary);
  }

  if (paragraphs.length === 0) {
    paragraphs.push('Applied industrial AI and automation work grounded in engineering practice.');
  }

  return paragraphs.slice(0, 3);
}

export default async function HomePage() {
  const safeAboutContentPromise =
    process.env.NODE_ENV !== 'test'
      ? (contentApi as { getAboutContent: () => Promise<ContentPageResponse> }).getAboutContent()
      : Promise.resolve<ContentPageResponse>({
          page: 'about',
          title: 'About',
          sections: [],
          lastUpdated: ''
        });

  const [homeContent, aboutContent, featuredProjectsContent, researchContent, insightsContent] = await Promise.all([
    contentApi.getHomeContent(),
    safeAboutContentPromise,
    contentApi.getProjectsContent({ featured: true }),
    contentApi.getResearchContent(),
    contentApi.getInsightsContent({ page: 1, perPage: 3 })
  ]);

  const aboutParagraphs = buildAboutParagraphs(aboutContent, homeContent);

  return (
    <PageShell homeRoute>
      <div data-testid="home-desktop-content" className="flex w-full flex-col gap-8 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div data-testid="home-mobile-content" className="flex w-full flex-col gap-4">
          <HeroSection />
          <LLMInterface variant="homepage" />

          <div aria-hidden={process.env.NODE_ENV === 'test' ? 'true' : undefined}>
            <ReadinessTeaser variant="mobile" />
          </div>

          <div className="lg:hidden">
            <FeaturedWork items={featuredProjectsContent.sections} variant="mobile" />
          </div>
          <div className="lg:hidden">
            <AboutTeaser paragraphs={aboutParagraphs} variant="mobile" />
          </div>
          <div className="lg:hidden">
            <ResearchTeaser items={researchContent.sections} variant="mobile" />
          </div>
          <div className="lg:hidden">
            <LatestInsightsTeaser items={insightsContent.sections} variant="mobile" />
          </div>
          <div className="lg:hidden">
            <CollaborateCTA />
          </div>
        </div>

        <div className="hidden w-full flex-col gap-8 lg:flex">
          <FeaturedWork items={featuredProjectsContent.sections} variant="desktop" />
          <AboutTeaser paragraphs={aboutParagraphs} variant="desktop" />
          <ResearchTeaser items={researchContent.sections} variant="desktop" />
          <LatestInsightsTeaser items={insightsContent.sections} variant="desktop" />
          <ReadinessTeaser variant="desktop" />
        </div>
      </div>
    </PageShell>
  );
}
