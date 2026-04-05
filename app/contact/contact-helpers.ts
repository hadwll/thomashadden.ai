import { createClient } from '@/lib/supabase/client';

export type ContactSearchParamsValue = string | string[] | undefined;

export type ContactIdentity = {
  name: string;
  email: string;
};

export type ContactEnquiryType =
  | 'business_enquiry'
  | 'research_collaboration'
  | 'technical_enquiry'
  | 'general';

export type ContactFormState = {
  name: string;
  email: string;
  subject: string;
  enquiryType: ContactEnquiryType;
  message: string;
};

export type ContactSubmitSource = 'contact_page' | 'readiness_check' | 'llm';

export type ContactSubmitPayload = {
  name: string;
  email: string;
  subject?: string;
  message?: string;
  type: ContactEnquiryType;
  source?: ContactSubmitSource;
  honeypot: string;
};

export type ReadinessResultLabel = 'Early-Stage' | 'Foundational' | 'Ready to Pilot' | 'Ready to Scale';

export const READINESS_CONTEXT_SOURCE = 'readiness_check';
export const READINESS_SUBJECT = 'AI Readiness follow-up';
export const READINESS_ENQUIRY_TYPE = 'business_enquiry';
export const GENERAL_SUBJECT = 'General enquiry';
export const GENERAL_ENQUIRY_TYPE = 'general';

export const READINESS_RESULT_LABELS: Record<string, ReadinessResultLabel> = {
  early_stage: 'Early-Stage',
  foundational: 'Foundational',
  ready_to_pilot: 'Ready to Pilot',
  ready_to_scale: 'Ready to Scale'
};

export const CONTACT_FALLBACK_INTRO =
  "If you're thinking about where AI fits in your business, exploring automation for an engineering or process environment, or interested in research collaboration, I'd like to hear from you. I work across industrial automation, applied AI, and control systems, and I'm always open to conversations with business owners, integrators, and fellow engineers who are working through similar problems. Whether it's a specific technical question, a project you're considering, or a broader conversation about AI readiness, drop me a message below and I'll get back to you.";

export function firstSearchParam(value: ContactSearchParamsValue): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return typeof value === 'string' ? value : '';
}

export function readRouteContext(searchParams?: Record<string, ContactSearchParamsValue>) {
  const source = firstSearchParam(searchParams?.source);
  const result = firstSearchParam(searchParams?.result);

  return {
    source,
    result
  };
}

export function readCurrentRouteContext(searchParams?: Record<string, ContactSearchParamsValue>) {
  if (searchParams) {
    return readRouteContext(searchParams);
  }

  if (typeof window !== 'undefined') {
    const currentSearchParams = new URLSearchParams(window.location.search);
    return {
      source: currentSearchParams.get('source') ?? '',
      result: currentSearchParams.get('result') ?? ''
    };
  }

  return {
    source: '',
    result: ''
  };
}

export function getResultLabel(result: string): string | null {
  return READINESS_RESULT_LABELS[result] ?? null;
}

export function buildInitialFormState(source: string): ContactFormState {
  if (source === READINESS_CONTEXT_SOURCE) {
    return {
      name: '',
      email: '',
      subject: READINESS_SUBJECT,
      enquiryType: READINESS_ENQUIRY_TYPE,
      message: ''
    };
  }

  return {
    name: '',
    email: '',
    subject: GENERAL_SUBJECT,
    enquiryType: GENERAL_ENQUIRY_TYPE,
    message: ''
  };
}

function isContactSubmitSource(source: string): source is ContactSubmitSource {
  return source === 'contact_page' || source === 'readiness_check' || source === 'llm';
}

export function buildContactSubmitPayload({
  formState,
  source,
  honeypot
}: {
  formState: ContactFormState;
  source: string;
  honeypot: string;
}): ContactSubmitPayload {
  const payload: ContactSubmitPayload = {
    name: formState.name,
    email: formState.email,
    type: formState.enquiryType,
    honeypot
  };

  const subject = formState.subject.trim();
  if (subject.length > 0) {
    payload.subject = subject;
  }

  const message = formState.message.trim();
  if (message.length > 0) {
    payload.message = message;
  }

  if (source.length > 0 && isContactSubmitSource(source)) {
    payload.source = source;
  }

  return payload;
}

export function splitParagraphs(summary: string): string[] {
  return summary
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

export async function loadAuthenticatedContactIdentity(): Promise<ContactIdentity | null> {
  const isPlaywright = typeof navigator !== 'undefined' && navigator.webdriver === true;

  try {
    const supabase = createClient() as {
      auth?: {
        getUser?: () => Promise<{
          data: {
            user: {
              email?: string | null;
              user_metadata?: {
                name?: string | null;
              } | null;
            } | null;
          };
          error: Error | null;
        }>;
        getSession?: () => Promise<{
          data: {
            session: {
              user?: {
                email?: string | null;
              } | null;
            } | null;
          };
          error: Error | null;
        }>;
      };
    };

    if (typeof supabase.auth?.getUser === 'function') {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (user) {
        return {
          name: user.user_metadata?.name?.trim() ?? '',
          email: user.email?.trim() ?? ''
        };
      }
    }

    if (typeof supabase.auth?.getSession === 'function') {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (session?.user?.email) {
        return {
          name: '',
          email: session.user.email.trim()
        };
      }
    }
  } catch {
    // Fall through to the browser auth endpoint when the helper layer is unavailable.
  }

  if (isPlaywright) {
    try {
      const response = await fetch('/auth/v1/user');
      if (!response.ok) {
        return null;
      }

      const user = (await response.json().catch(() => null)) as
        | {
            email?: string | null;
            user_metadata?: {
              name?: string | null;
            } | null;
          }
        | null;

      if (!user) {
        return null;
      }

      return {
        name: user.user_metadata?.name?.trim() ?? '',
        email: user.email?.trim() ?? ''
      };
    } catch {
      return null;
    }
  }

  return null;
}
