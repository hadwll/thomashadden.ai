import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LLMInterface } from '@/components/sections/LLMInterface';
import { buildLLMQueryRequest, validateLLMQuery } from '@/lib/llm/query';
import { getOrCreateLLMSession } from '@/lib/llm/session';
import type { LLMQueryRequest, LLMQueryResponse } from '@/lib/llm/types';

vi.mock('@/lib/llm/session', () => ({
  getOrCreateLLMSession: vi.fn()
}));

vi.mock('@/lib/llm/query', async () => {
  const actual = await vi.importActual<typeof import('@/lib/llm/query')>('@/lib/llm/query');

  return {
    ...actual,
    buildLLMQueryRequest: vi.fn(),
    validateLLMQuery: vi.fn()
  };
});

const HOMEPAGE_CHIPS = [
  'How can AI help an engineering business?',
  'What is Thomas working on?',
  'Where does AI fit into industry?'
] as const;

const STATIC_PREVIEW_BULLETS = [
  'Automate repetitive reporting, data entry, and compliance documentation.',
  'Improve quality control through computer vision and predictive analytics.',
  'Optimise scheduling, resource allocation, and energy consumption.',
  'Analyse operational data to identify cost savings and efficiency gains.',
  'Enhance maintenance planning with condition-based monitoring.',
  'Support faster, better-informed decision-making with real-time dashboards.'
] as const;

const DEFAULT_SESSION_ID = '123e4567-e89b-12d3-a456-426614174000';

const mockedBuildLLMQueryRequest = vi.mocked(buildLLMQueryRequest);
const mockedGetOrCreateLLMSession = vi.mocked(getOrCreateLLMSession);
const mockedValidateLLMQuery = vi.mocked(validateLLMQuery);

const fetchMock = vi.fn<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
>();

function installViewportMediaQuery(viewportWidth: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: viewportWidth
  });

  const evaluateMediaQuery = (query: string) => {
    const minMatches = [...query.matchAll(/\(min-width:\s*(\d+)px\)/g)].map((match) => Number(match[1]));
    const maxMatches = [...query.matchAll(/\(max-width:\s*(\d+)px\)/g)].map((match) => Number(match[1]));

    let matches = false;

    if (minMatches.length > 0 || maxMatches.length > 0) {
      matches = true;

      if (minMatches.length > 0) {
        matches = matches && viewportWidth >= Math.max(...minMatches);
      }

      if (maxMatches.length > 0) {
        matches = matches && viewportWidth <= Math.min(...maxMatches);
      }
    }

    return matches;
  };

  const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
    matches: evaluateMediaQuery(query),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: matchMediaMock
  });

  return matchMediaMock;
}

function createLLMResponseData(overrides: Partial<LLMQueryResponse> = {}): LLMQueryResponse {
  return {
    answer: 'AI can improve delivery throughput by automating repetitive engineering workflows.',
    queryType: 'general_ai',
    sources: [
      {
        title: 'AI in Engineering Delivery',
        url: '/insights/ai-in-engineering-delivery',
        relevance: 0.95
      }
    ],
    suggestedActions: [
      {
        type: 'readiness_check',
        label: 'Take the AI Readiness Check',
        url: '/readiness'
      }
    ],
    queryId: 'qry_test_001',
    ...overrides
  };
}

function createJsonQueryResponse(responseData: LLMQueryResponse, status = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      data: responseData
    }),
    {
      status,
      headers: {
        'content-type': 'application/json'
      }
    }
  );
}

function createJsonErrorResponse(status = 500) {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'LLM_ERROR',
        message: "I'm having a moment - please try again in a few seconds."
      }
    }),
    {
      status,
      headers: {
        'content-type': 'application/json'
      }
    }
  );
}

function createStreamingResponse(chunks: string[]) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let index = 0;

      const pushChunk = () => {
        if (index >= chunks.length) {
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode(chunks[index]));
        index += 1;

        setTimeout(pushChunk, 0);
      };

      pushChunk();
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream'
    }
  });
}

function configureDefaultQueryMocks(stream = false) {
  mockedGetOrCreateLLMSession.mockReturnValue(DEFAULT_SESSION_ID);
  mockedValidateLLMQuery.mockReturnValue({ ok: true });
  mockedBuildLLMQueryRequest.mockImplementation((input) => ({
    query: input.query.trim(),
    stream,
    sessionId: input.sessionId,
    context: {
      source: input.source
    }
  }));
}

function renderDesktopHomepageLLM() {
  installViewportMediaQuery(1280);

  return render(<LLMInterface variant="homepage" />);
}

function renderMobileHomepageLLM() {
  installViewportMediaQuery(390);

  return render(<LLMInterface variant="homepage" />);
}

async function submitFromDesktopPromptRow(prompt: string) {
  const user = userEvent.setup();
  const promptRow = screen.getByTestId('home-llm-prompt-row');
  const input = within(promptRow).getByRole('textbox');

  await user.clear(input);
  await user.type(input, prompt);
  await user.click(within(promptRow).getByRole('button', { name: /^ask$/i }));
}

describe('LLMInterface homepage variant', () => {
  beforeAll(() => {
    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);

    fetchMock.mockResolvedValue(createJsonQueryResponse(createLLMResponseData()));
    configureDefaultQueryMocks(false);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  describe('desktop contract', () => {
    it('renders the homepage shell, heading, desktop prompt row, and exactly four homepage chips', () => {
      renderDesktopHomepageLLM();

      expect(screen.getByTestId('home-llm-shell')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Targeted answers on AI, industry, and my work' })).toBeVisible();

      const promptRow = screen.getByTestId('home-llm-prompt-row');
      const input = within(promptRow).getByRole('textbox');
      expect(input).toBeEnabled();
      expect(input).not.toHaveAttribute('readonly');
      expect(within(promptRow).getByRole('button', { name: /^ask$/i })).toBeVisible();

      const chipRail = screen.getByTestId('home-llm-chip-rail');
      const chipButtons = within(chipRail).getAllByRole('button');

      expect(chipButtons).toHaveLength(3);

      for (const chipCopy of HOMEPAGE_CHIPS) {
        expect(within(chipRail).getByRole('button', { name: chipCopy })).toBeVisible();
      }

      for (const previewBullet of STATIC_PREVIEW_BULLETS) {
        expect(screen.getByText(previewBullet)).toBeVisible();
      }
    });

    it('submits through the homepage chip contract when a chip is clicked', async () => {
      renderDesktopHomepageLLM();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Where does AI fit into industry?' }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      const [requestUrl, requestInit] = fetchMock.mock.calls[0];
      expect(String(requestUrl)).toContain('/api/llm/query');

      const submittedBody = JSON.parse(String(requestInit?.body ?? '{}')) as LLMQueryRequest;
      expect(submittedBody.query).toBe('Where does AI fit into industry?');
      expect(submittedBody.context?.source).toBe('homepage_chip');
      expect(mockedGetOrCreateLLMSession).toHaveBeenCalled();
    });

    it('reflects loading state and blocks repeat submission while a query is in flight', async () => {
      let resolveRequest: ((value: Response) => void) | undefined;

      fetchMock.mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            resolveRequest = resolve;
          })
      );

      renderDesktopHomepageLLM();

      await submitFromDesktopPromptRow('How can AI improve maintenance scheduling?');

      const promptRow = screen.getByTestId('home-llm-prompt-row');
      const askButton = within(promptRow).getByRole('button', { name: /ask|loading/i });

      expect(askButton).toBeDisabled();

      const user = userEvent.setup();
      await user.click(askButton);

      expect(fetchMock).toHaveBeenCalledTimes(1);

      resolveRequest?.(createJsonQueryResponse(createLLMResponseData()));
    });

    it('renders non-stream answers with sources and suggested actions when present', async () => {
      fetchMock.mockResolvedValue(
        createJsonQueryResponse(
          createLLMResponseData({
            answer: 'A focused implementation path is automation first, then decision support.',
            sources: [
              {
                title: 'Park Engineering Automation Case Study',
                url: '/projects/park-automation-case-study',
                relevance: 0.94
              }
            ],
            suggestedActions: [
              {
                type: 'readiness_check',
                label: 'Start the AI Readiness Check',
                url: '/readiness'
              }
            ]
          })
        )
      );

      renderDesktopHomepageLLM();
      await submitFromDesktopPromptRow('Where does AI fit into industry?');

      expect(await screen.findByText('A focused implementation path is automation first, then decision support.')).toBeVisible();

      const sourcesRegion = screen.getByTestId('home-llm-sources');
      expect(within(sourcesRegion).getByRole('link', { name: 'Park Engineering Automation Case Study' })).toBeVisible();

      const suggestedActionsRegion = screen.getByTestId('home-llm-suggested-actions');
      expect(within(suggestedActionsRegion).getByRole('link', { name: 'Start the AI Readiness Check' })).toHaveAttribute(
        'href',
        '/readiness'
      );
    });

    it('renders progressive text for streaming responses, then completion metadata', async () => {
      configureDefaultQueryMocks(true);

      fetchMock.mockResolvedValue(
        createStreamingResponse([
          'data: {"chunk":"AI can support","queryId":"qry_stream_home_1"}\n\n',
          'data: {"chunk":" operations and planning.","queryId":"qry_stream_home_1"}\n\n',
          'data: {"done":true,"queryType":"general_ai","sources":[{"title":"Operations AI Guide","url":"/insights/operations-ai-guide","relevance":0.9}],"suggestedActions":[{"type":"readiness_check","label":"Take the readiness assessment","url":"/readiness"}],"queryId":"qry_stream_home_1"}\n\n'
        ])
      );

      renderDesktopHomepageLLM();
      await submitFromDesktopPromptRow('How can AI support operations?');

      expect(await screen.findByText(/AI can support/i)).toBeVisible();
      expect(await screen.findByText(/AI can support operations and planning\./i)).toBeVisible();

      const sourcesRegion = screen.getByTestId('home-llm-sources');
      expect(within(sourcesRegion).getByRole('link', { name: 'Operations AI Guide' })).toBeVisible();

      const suggestedActionsRegion = screen.getByTestId('home-llm-suggested-actions');
      expect(within(suggestedActionsRegion).getByRole('link', { name: 'Take the readiness assessment' })).toHaveAttribute(
        'href',
        '/readiness'
      );
    });

    it('shows a safe error message and keeps the interface usable for another attempt', async () => {
      fetchMock
        .mockResolvedValueOnce(createJsonErrorResponse())
        .mockResolvedValueOnce(
          createJsonQueryResponse(
            createLLMResponseData({
              answer: 'A second attempt should still work after an error.',
              queryId: 'qry_retry_2'
            })
          )
        );

      renderDesktopHomepageLLM();
      await submitFromDesktopPromptRow('First request should fail');

      expect(await screen.findByText(/try again/i)).toBeVisible();

      await submitFromDesktopPromptRow('Second request should succeed');
      expect(await screen.findByText('A second attempt should still work after an error.')).toBeVisible();

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('mobile contract', () => {
    it('renders compact mobile launcher instead of desktop prompt-row-first layout', () => {
      renderMobileHomepageLLM();

      expect(screen.getByTestId('home-llm-mobile-launcher')).toBeVisible();
      expect(screen.queryByTestId('home-llm-prompt-row')).not.toBeInTheDocument();
      expect(screen.queryByTestId('home-llm-chip-rail')).not.toBeInTheDocument();
    });

    it('shows one launcher suggestion at a time and renders carousel answer + dots', async () => {
      fetchMock.mockResolvedValue(
        createJsonQueryResponse(
          createLLMResponseData({
            answer: 'Mobile launcher answer one.',
            queryId: 'qry_mobile_1'
          })
        )
      );

      renderMobileHomepageLLM();
      const user = userEvent.setup();

      const visibleSuggestionButtons = HOMEPAGE_CHIPS.flatMap((chip) => screen.queryAllByRole('button', { name: chip }));
      expect(visibleSuggestionButtons).toHaveLength(1);

      await user.click(visibleSuggestionButtons[0]);

      expect(await screen.findByText('Mobile launcher answer one.')).toBeVisible();
      expect(screen.getByTestId('home-llm-answer-carousel')).toBeVisible();
      expect(screen.getByTestId('home-llm-carousel-dots')).toBeVisible();
    });

    it('updates active carousel state when a second mobile answer card is added', async () => {
      fetchMock
        .mockResolvedValueOnce(
          createJsonQueryResponse(
            createLLMResponseData({
              answer: 'Mobile answer one.',
              queryId: 'qry_mobile_a'
            })
          )
        )
        .mockResolvedValueOnce(
          createJsonQueryResponse(
            createLLMResponseData({
              answer: 'Mobile answer two.',
              queryId: 'qry_mobile_b'
            })
          )
        );

      renderMobileHomepageLLM();
      const user = userEvent.setup();

      const firstLauncherChip = screen.getByRole('button', { name: HOMEPAGE_CHIPS[0] });
      await user.click(firstLauncherChip);
      expect(await screen.findByText('Mobile answer one.')).toBeVisible();

      const secondLauncherChip = screen.getByRole('button', { name: HOMEPAGE_CHIPS[1] });
      await user.click(secondLauncherChip);
      expect(await screen.findByText('Mobile answer two.')).toBeVisible();

      const dots = screen.getByTestId('home-llm-carousel-dots');
      const dotButtons = within(dots).getAllByRole('button');

      expect(dotButtons).toHaveLength(2);
      expect(dotButtons.filter((dot) => dot.getAttribute('aria-current') === 'true')).toHaveLength(1);
      expect(dotButtons[1]).toHaveAttribute('aria-current', 'true');
    });
  });
});
