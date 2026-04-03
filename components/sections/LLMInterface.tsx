'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  buildLLMQueryRequest,
  isLLMChunkEvent,
  isLLMDoneEvent,
  isLLMErrorEvent,
  validateLLMQuery
} from '@/lib/llm/query';
import { getOrCreateLLMSession } from '@/lib/llm/session';
import { consumeSSEStream } from '@/lib/llm/sse';
import type { LLMQuerySource, LLMQueryResponse, LLMSourceLink, LLMSuggestedAction } from '@/lib/llm/types';

export type LLMInterfaceProps = {
  variant: 'homepage' | 'standalone';
};

type AnswerPreview = {
  id: string;
  prompt: string;
  answer: string;
  sources: LLMSourceLink[];
  suggestedActions: LLMSuggestedAction[];
};

const HOMEPAGE_PROMPTS = [
  'How can AI help an engineering business?',
  'What is Thomas working on?',
  'Where does AI fit into industry?',
  'What is RAG?'
] as const;

const DEFAULT_SAFE_ERROR_MESSAGE = "I'm having a moment - please try again in a few seconds.";

const STATIC_PREVIEW_BULLETS = [
  'Automate repetitive reporting and data entry tasks.',
  'Improve quality control through predictive analytics.',
  'Optimize scheduling and resource allocation.',
  'Analyze operational data to identify cost savings.'
];

function isDesktopViewport() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  return window.matchMedia('(min-width: 1024px)').matches;
}

function filterRenderableSources(sources: LLMSourceLink[]) {
  return sources.filter((source) => source.relevance > 0.8 && source.url.startsWith('/'));
}

function renderSuggestedActionVariant(action: LLMSuggestedAction): 'secondary' | 'ghost' {
  return action.type === 'readiness_check' ? 'secondary' : 'ghost';
}

export function LLMInterface({ variant }: LLMInterfaceProps) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<LLMSourceLink[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<LLMSuggestedAction[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => isDesktopViewport());
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState('How can AI help an engineering business?');
  const [launcherPromptIndex, setLauncherPromptIndex] = useState(0);
  const [mobileHistory, setMobileHistory] = useState<AnswerPreview[]>([]);
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);

  const sessionIdRef = useRef<string | null>(null);

  const mobileActivePreview = mobileHistory[activeMobileIndex];
  const visibleLauncherPrompt = HOMEPAGE_PROMPTS[launcherPromptIndex % HOMEPAGE_PROMPTS.length];
  const isHomepageDesktop = variant === 'homepage' && isDesktop;
  const isHomepageMobile = variant === 'homepage' && !isDesktop;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const onChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    }

    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!sessionIdRef.current) {
      sessionIdRef.current = getOrCreateLLMSession();
    }
  }, []);

  const answerPreviewQuestion = useMemo(() => {
    if (answer.length > 0 || errorMessage) {
      return lastSubmittedPrompt;
    }

    return 'How can AI help an engineering business?';
  }, [answer.length, errorMessage, lastSubmittedPrompt]);

  const handleSuccessfulResponse = (responseData: LLMQueryResponse, submittedPrompt: string) => {
    const filteredSources = filterRenderableSources(responseData.sources ?? []);
    const nextSuggestedActions = responseData.suggestedActions ?? [];

    setAnswer(responseData.answer ?? '');
    setSources(filteredSources);
    setSuggestedActions(nextSuggestedActions);
    setLastSubmittedPrompt(submittedPrompt);
    setErrorMessage(null);

    if (isHomepageMobile) {
      const nextPreview: AnswerPreview = {
        id: responseData.queryId || `${Date.now()}`,
        prompt: submittedPrompt,
        answer: responseData.answer ?? '',
        sources: filteredSources,
        suggestedActions: nextSuggestedActions
      };

      setMobileHistory((previous) => [...previous, nextPreview]);
      setActiveMobileIndex(mobileHistory.length);
    }
  };

  const submitQuery = async (nextQuery: string, source: LLMQuerySource) => {
    if (isSubmitting) {
      return;
    }

    const validationResult = validateLLMQuery(nextQuery);
    if (!validationResult.ok) {
      setErrorMessage(validationResult.reason);
      return;
    }

    if (!sessionIdRef.current) {
      sessionIdRef.current = getOrCreateLLMSession();
    }

    const requestBody = buildLLMQueryRequest({
      query: nextQuery,
      stream: false,
      sessionId: sessionIdRef.current,
      source
    });

    setIsSubmitting(true);
    setErrorMessage(null);
    setLastSubmittedPrompt(nextQuery.trim());

    try {
      const response = await fetch('/api/llm/query', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseContentType = response.headers.get('content-type') ?? '';
      if (requestBody.stream || responseContentType.includes('text/event-stream')) {
        if (!response.body) {
          throw new Error('Missing stream body.');
        }

        const streamEvents = await consumeSSEStream(response.body);
        let nextAnswer = '';
        let completionSources: LLMSourceLink[] = [];
        let completionSuggestedActions: LLMSuggestedAction[] = [];
        let completionQueryId = `${Date.now()}`;
        let sawDoneEvent = false;

        for (const event of streamEvents) {
          if (isLLMErrorEvent(event)) {
            setErrorMessage(event.message || DEFAULT_SAFE_ERROR_MESSAGE);
            setAnswer('');
            setSources([]);
            setSuggestedActions([]);
            return;
          }

          if (isLLMChunkEvent(event)) {
            nextAnswer += event.chunk;
            completionQueryId = event.queryId;
            setAnswer(nextAnswer);
          }

          if (isLLMDoneEvent(event)) {
            sawDoneEvent = true;
            completionSources = event.sources;
            completionSuggestedActions = event.suggestedActions;
            completionQueryId = event.queryId;
          }
        }

        if (!sawDoneEvent && nextAnswer.length > 0) {
          setErrorMessage('I was interrupted - try asking again.');
          setAnswer(nextAnswer);
          setSources([]);
          setSuggestedActions([]);
          return;
        }

        handleSuccessfulResponse(
          {
            answer: nextAnswer,
            queryType: 'general_ai',
            sources: completionSources,
            suggestedActions: completionSuggestedActions,
            queryId: completionQueryId
          },
          nextQuery.trim()
        );

        return;
      }

      const parsedResponse = (await response.json()) as
        | { success?: true; data?: LLMQueryResponse }
        | { success?: false; error?: { message?: string } };

      if (!response.ok || !parsedResponse.success || !parsedResponse.data) {
        const safeMessage =
          'error' in parsedResponse && parsedResponse.error?.message
            ? parsedResponse.error.message
            : DEFAULT_SAFE_ERROR_MESSAGE;
        throw new Error(safeMessage);
      }

      handleSuccessfulResponse(parsedResponse.data, nextQuery.trim());
    } catch (error) {
      const fallbackMessage = DEFAULT_SAFE_ERROR_MESSAGE;
      if (error instanceof Error && error.message.trim().length > 0) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(fallbackMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHomepagePromptSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitQuery(query, 'homepage_input');
  };

  const handleStandalonePromptSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitQuery(query, 'llm_page');
  };

  const baseClassName =
    variant === 'homepage'
      ? 'rounded-vessel border border-border-accent bg-bg-surface/90 p-4 shadow-card sm:p-6 lg:p-8'
      : 'rounded-content border border-border-default bg-bg-surface p-4 shadow-card sm:p-6';

  return (
    <section
      id={variant === 'homepage' ? 'ask-thomas-ai' : undefined}
      data-testid={variant === 'homepage' ? 'home-llm-shell' : 'standalone-llm-shell'}
      className={baseClassName}
      aria-label="AI assistant"
    >
      <div className="space-y-5">
        <header className="space-y-2">
          <h2 className="text-xl font-semibold text-text-primary">Targeted answers on AI, industry, and my work</h2>
          <p className="text-sm text-text-secondary">
            Ask a focused question and explore practical directions in automation, research, and deployment.
          </p>
        </header>

        {isHomepageDesktop ? (
          <>
            <form
              data-testid="home-llm-prompt-row"
              className="rounded-pill border border-border-accent bg-bg-primary/70 px-2 py-2 sm:px-3"
              onSubmit={handleHomepagePromptSubmit}
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Ask Thomas AI"
                  disabled={isSubmitting}
                  placeholder="How can AI help with industrial automation?"
                  className="h-11 flex-1 border-0 bg-transparent px-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
                />
                <Button variant="primary" size="sm" type="submit" ariaLabel="Ask" loading={isSubmitting}>
                  Ask
                </Button>
              </div>
            </form>

            <div data-testid="home-llm-chip-rail" className="flex flex-wrap gap-2">
              {HOMEPAGE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isSubmitting}
                  className="rounded-pill border border-border-accent bg-accent-subtle px-3 py-1.5 text-xs text-accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => {
                    setQuery(prompt);
                    void submitQuery(prompt, 'homepage_chip');
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {isHomepageMobile ? (
          <div
            data-testid="home-llm-mobile-launcher"
            className="rounded-pill border border-border-accent bg-bg-primary/75 px-2 py-2"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                className="flex-1 truncate rounded-pill border border-border-default bg-bg-primary px-3 py-2 text-left text-xs text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  void submitQuery(visibleLauncherPrompt, 'homepage_chip');
                  setLauncherPromptIndex((current) => (current + 1) % HOMEPAGE_PROMPTS.length);
                }}
              >
                {visibleLauncherPrompt}
              </button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                ariaLabel="Ask"
                loading={isSubmitting}
                onClick={() => {
                  void submitQuery(visibleLauncherPrompt, 'homepage_chip');
                  setLauncherPromptIndex((current) => (current + 1) % HOMEPAGE_PROMPTS.length);
                }}
              >
                Ask
              </Button>
            </div>
          </div>
        ) : null}

        {variant === 'standalone' ? (
          <form className="space-y-3" onSubmit={handleStandalonePromptSubmit}>
            <div className="rounded-pill border border-border-default bg-bg-primary/70 px-2 py-2 sm:px-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Ask Thomas AI"
                  disabled={isSubmitting}
                  placeholder="Ask a question..."
                  className="h-11 flex-1 border-0 bg-transparent px-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
                />
                <Button variant="primary" size="sm" type="submit" ariaLabel="Ask" loading={isSubmitting}>
                  Ask
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {HOMEPAGE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isSubmitting}
                  className="rounded-pill border border-border-default bg-bg-primary px-3 py-1.5 text-xs text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => {
                    setQuery(prompt);
                    void submitQuery(prompt, 'llm_page');
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </form>
        ) : null}

        {isHomepageMobile && mobileHistory.length > 0 ? (
          <div className="space-y-3">
            <article
              data-testid="home-llm-answer-carousel"
              className="rounded-content border border-border-default bg-bg-primary/80 p-4"
              aria-live="polite"
            >
              {mobileHistory.map((preview, index) => (
                <div key={preview.id} hidden={index !== activeMobileIndex} aria-hidden={index !== activeMobileIndex}>
                  <h3 className="text-sm font-semibold text-text-primary">{preview.prompt}</h3>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">{preview.answer}</p>
                </div>
              ))}

              <div data-testid="home-llm-sources" className="mt-4 flex flex-wrap gap-2">
                {(mobileActivePreview?.sources ?? []).map((source) => (
                  <a
                    key={`${mobileActivePreview.id}-${source.url}`}
                    href={source.url}
                    rel="noopener noreferrer"
                    className="rounded-pill border border-border-default px-3 py-1 text-xs text-text-muted hover:text-text-primary"
                  >
                    {source.title}
                  </a>
                ))}
              </div>

              <div data-testid="home-llm-suggested-actions" className="mt-3 flex flex-wrap gap-2">
                {(mobileActivePreview?.suggestedActions ?? []).map((action) => (
                  <Button key={`${mobileActivePreview.id}-${action.url}`} href={action.url} variant={renderSuggestedActionVariant(action)} size="sm">
                    {action.label}
                  </Button>
                ))}
              </div>
            </article>

            <div data-testid="home-llm-carousel-dots" className="flex items-center justify-center gap-2">
              {mobileHistory.map((preview, index) => (
                <button
                  key={`${preview.id}-dot`}
                  type="button"
                  aria-label={`Show answer ${index + 1}`}
                  aria-current={index === activeMobileIndex ? 'true' : undefined}
                  className={[
                    'h-2 w-2 rounded-full border border-border-default',
                    index === activeMobileIndex ? 'bg-accent-primary' : 'bg-bg-primary'
                  ].join(' ')}
                  onClick={() => setActiveMobileIndex(index)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {isHomepageDesktop || variant === 'standalone' ? (
          <article className="rounded-content border border-border-default bg-bg-primary/80 p-4" aria-live="polite">
            <h3 className="text-sm font-semibold text-text-primary">{answerPreviewQuestion}</h3>

            {isSubmitting ? (
              <p className="mt-3 text-sm text-text-secondary">Thinking...</p>
            ) : null}

            {!isSubmitting && errorMessage ? <p className="mt-3 text-sm text-text-secondary">{errorMessage}</p> : null}

            {!isSubmitting && !errorMessage && answer.length > 0 ? (
              <p className="mt-3 text-sm leading-6 text-text-secondary">{answer}</p>
            ) : null}

            {!isSubmitting && !errorMessage && answer.length === 0 ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-secondary">
                {STATIC_PREVIEW_BULLETS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}

            <div data-testid="home-llm-sources" className="mt-4 flex flex-wrap gap-2">
              {sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  rel="noopener noreferrer"
                  className="rounded-pill border border-border-default px-3 py-1 text-xs text-text-muted hover:text-text-primary"
                >
                  {source.title}
                </a>
              ))}
            </div>

            <div data-testid="home-llm-suggested-actions" className="mt-3 flex flex-wrap gap-2">
              {suggestedActions.map((action) => (
                <Button key={action.url} href={action.url} variant={renderSuggestedActionVariant(action)} size="sm">
                  {action.label}
                </Button>
              ))}
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
