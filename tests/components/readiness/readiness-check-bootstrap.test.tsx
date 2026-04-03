import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadinessCheck } from '@/components/readiness/ReadinessCheck';

const EXPECTED_FIRST_QUESTION_TEXT = 'What best describes your business sector?';
const EXPECTED_FIRST_QUESTION_OPTION_LABELS = [
  'Engineering or Manufacturing',
  'Construction or Electrical',
  'Professional Services',
  'Retail or Hospitality',
  'Other'
];

const ORIGINAL_FETCH = global.fetch;

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function createQuestionSetResponse() {
  return {
    success: true,
    data: {
      version: '1.0',
      totalQuestions: 7,
      estimatedMinutes: 2,
      questions: [
        {
          id: 'q1',
          order: 1,
          text: EXPECTED_FIRST_QUESTION_TEXT,
          type: 'single_choice',
          options: EXPECTED_FIRST_QUESTION_OPTION_LABELS.map((label, index) => ({
            id: `q1-o${index + 1}`,
            label
          }))
        },
        {
          id: 'q2',
          order: 2,
          text: 'How many people work in your business?',
          type: 'single_choice',
          options: [{ id: 'q2-o1', label: 'Just me' }]
        },
        {
          id: 'q3',
          order: 3,
          text: "How would you describe your business's current relationship with AI?",
          type: 'single_choice',
          options: [{ id: 'q3-o1', label: "We haven't looked at it yet" }]
        },
        {
          id: 'q4',
          order: 4,
          text: 'Where does your business most feel the pressure to do things better or faster?',
          type: 'single_choice',
          options: [{ id: 'q4-o1', label: 'Reporting and data analysis' }]
        },
        {
          id: 'q5',
          order: 5,
          text: 'How well does your business currently capture and use data?',
          type: 'single_choice',
          options: [{ id: 'q5-o1', label: 'We do not really track data systematically' }]
        },
        {
          id: 'q6',
          order: 6,
          text: 'If a low-risk AI pilot were available for your business, how likely would you be to try it?',
          type: 'single_choice',
          options: [{ id: 'q6-o1', label: 'Possibly - if the case was clear' }]
        },
        {
          id: 'q7',
          order: 7,
          text: 'What feels like the biggest barrier to adopting AI in your business right now?',
          type: 'single_choice',
          options: [
            { id: 'q7-o1', label: 'Cost and ROI uncertainty' },
            { id: 'q7-o2', label: "We don't know where to start" },
            { id: 'q7-o3', label: "We don't have the time to figure it out" },
            { id: 'q7-o4', label: "We're not sure we can trust AI outputs" },
            { id: 'q7-o5', label: 'No major barrier - we are ready to move' }
          ]
        }
      ]
    },
    meta: {
      requestId: 'req_test_001',
      timestamp: '2026-03-15T10:30:00Z'
    }
  };
}

describe('ReadinessCheck bootstrap', () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    fetchMock.mockReset();
  });

  it('shows a loading state while the question fetch is unresolved and calls the questions route once', async () => {
    const deferred = createDeferred<Response>();

    fetchMock.mockReturnValueOnce(deferred.promise);

    render(<ReadinessCheck />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/readiness-check/questions');
    expect(screen.getByText(/loading/i)).toBeVisible();
  });

  it('renders the readiness heading, first question, summary, and first question options after a successful fetch', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(createQuestionSetResponse()), {
        status: 200,
        headers: {
          'content-type': 'application/json'
        }
      })
    );

    render(<ReadinessCheck />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /readiness/i })).toBeVisible();
    });

    expect(screen.getByText(EXPECTED_FIRST_QUESTION_TEXT)).toBeVisible();
    expect(screen.getByText(/7\s+questions/i)).toBeVisible();
    expect(screen.getByText(/2\s+minutes/i)).toBeVisible();

    for (const label of EXPECTED_FIRST_QUESTION_OPTION_LABELS) {
      expect(screen.getByText(label)).toBeVisible();
    }

    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });

  it('renders a user-safe error state when the fetch fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    render(<ReadinessCheck />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeVisible();
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/unable|couldn't|try again|something went wrong/i);
    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });
});
