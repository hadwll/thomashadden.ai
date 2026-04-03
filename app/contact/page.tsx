import * as contentApi from '@/lib/content/api';
import ContactPageClient from './ContactPageClient';
import {
  CONTACT_FALLBACK_INTRO,
  loadAuthenticatedContactIdentity,
  readCurrentRouteContext,
  splitParagraphs,
  type ContactSearchParamsValue
} from './contact-helpers';

export const dynamic = 'force-dynamic';

type ContactPageProps = {
  searchParams?: Record<string, ContactSearchParamsValue>;
};

async function loadContactIntroParagraphs(): Promise<string[]> {
  try {
    const content = await contentApi.getContactContent();
    const introParagraphs = content.sections.flatMap((section) => splitParagraphs(section.summary));
    return introParagraphs.length > 0 ? introParagraphs : [CONTACT_FALLBACK_INTRO];
  } catch {
    return [CONTACT_FALLBACK_INTRO];
  }
}

export default async function ContactPage({ searchParams }: ContactPageProps = {}) {
  const { source, result } = readCurrentRouteContext(searchParams);
  const [introParagraphs, initialIdentity] = await Promise.all([
    loadContactIntroParagraphs(),
    loadAuthenticatedContactIdentity()
  ]);

  return (
    <ContactPageClient
      source={source}
      result={result}
      initialIdentity={initialIdentity}
      introParagraphs={introParagraphs}
    />
  );
}
