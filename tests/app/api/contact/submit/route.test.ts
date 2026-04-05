import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/contact/submit/route';

const ORIGINAL_FETCH = global.fetch;
const CONTACT_SUBMIT_URL = 'http://localhost:3000/api/contact/submit';
const SUPABASE_CONTACT_PATH = '/rest/v1/contact_submissions';
const RESEND_EMAIL_PATH = '/emails';

type FetchCall = [RequestInfo | URL, RequestInit?];

function createRequest(body: Record<string, unknown>) {
  return new Request(CONTACT_SUBMIT_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

function expectMeta(meta: unknown) {
  const maybeMeta = meta as { requestId?: unknown; timestamp?: unknown };

  expect(typeof maybeMeta.requestId).toBe('string');
  expect(typeof maybeMeta.timestamp).toBe('string');
}

function createJsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  });
}

function installFetchMock(responses: Array<{ status: number; body: unknown }>) {
  const fetchMock = vi.fn().mockImplementation(() => {
    throw new Error('Unexpected fetch call');
  });

  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(createJsonResponse(response.status, response.body));
  }

  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function normalizeUrl(input: RequestInfo | URL): URL {
  if (input instanceof URL) {
    return input;
  }

  if (typeof input === 'string') {
    return new URL(input, 'http://localhost:3000');
  }

  return new URL(input.url);
}

function getCallPath(call: FetchCall): string {
  return normalizeUrl(call[0]).pathname;
}

function getCallBody(call: FetchCall): Record<string, unknown> {
  const init = call[1];
  const rawBody = init?.body;

  if (typeof rawBody !== 'string') {
    return {};
  }

  return JSON.parse(rawBody) as Record<string, unknown>;
}

function getCallsByPath(fetchMock: ReturnType<typeof vi.fn>, pathname: string) {
  return (fetchMock.mock.calls as FetchCall[]).filter((call) => getCallPath(call) === pathname);
}

function getRecipients(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  return [];
}

function getEmailContent(body: Record<string, unknown>): string {
  const sections = [body.subject, body.text, body.html, body.body].filter(
    (value): value is string => typeof value === 'string'
  );

  return sections.join('\n');
}

async function invoke(body: Record<string, unknown>) {
  const response = await POST(createRequest(body));
  const payload = (await response.json()) as Record<string, unknown>;

  return { response, payload };
}

describe('POST /api/contact/submit contract', () => {
  beforeEach(() => {
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = ORIGINAL_FETCH;
  });

  it('returns the success envelope, stores the submission, and sends notification plus auto-reply for a valid general submission', async () => {
    const fetchMock = installFetchMock([
      { status: 201, body: { id: 'sub_abc123' } },
      { status: 200, body: { id: 'email_notification_123' } },
      { status: 200, body: { id: 'email_reply_123' } }
    ]);

    const { response, payload } = await invoke({
      name: 'Jane Smith',
      email: 'jane@example.com',
      subject: 'AI in our engineering business',
      message: 'We are exploring AI adoption for our manufacturing workflow and want to talk next steps.',
      type: 'general',
      source: 'contact_page',
      honeypot: ''
    });

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        submissionId: expect.any(String),
        message: 'Thanks Jane, Thomas will be in touch shortly.'
      }
    });
    expectMeta(payload.meta);

    expect(fetchMock).toHaveBeenCalledTimes(3);

    const storageCalls = getCallsByPath(fetchMock, SUPABASE_CONTACT_PATH);
    const emailCalls = getCallsByPath(fetchMock, RESEND_EMAIL_PATH);

    expect(storageCalls).toHaveLength(1);
    expect(emailCalls).toHaveLength(2);

    const storageBody = getCallBody(storageCalls[0]);
    expect(storageBody).toMatchObject({
      name: 'Jane Smith',
      email: 'jane@example.com',
      subject: 'AI in our engineering business',
      message: 'We are exploring AI adoption for our manufacturing workflow and want to talk next steps.',
      enquiry_type: 'general',
      source: 'contact_page'
    });
    expect(storageBody).not.toHaveProperty('type');
    expect(storageBody).not.toHaveProperty('honeypot');

    const notificationBody =
      emailCalls.find((call) => getRecipients(getCallBody(call).to).includes('thomas@ia-2.com')) ?? null;
    const autoReplyBody = emailCalls.find((call) =>
      getRecipients(getCallBody(call).to).includes('jane@example.com')
    );

    expect(notificationBody).not.toBeNull();
    expect(autoReplyBody).toBeTruthy();
  });

  it('silently accepts a filled honeypot without storing the submission or sending emails', async () => {
    const fetchMock = installFetchMock([]);

    const { response, payload } = await invoke({
      name: 'Jane Smith',
      email: 'jane@example.com',
      subject: 'AI in our engineering business',
      message: 'We are exploring AI adoption for our manufacturing workflow and want to talk next steps.',
      type: 'general',
      source: 'contact_page',
      honeypot: 'I am a bot'
    });

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        submissionId: expect.any(String),
        message: expect.stringContaining('Jane')
      }
    });
    expectMeta(payload.meta);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 422 VALIDATION_ERROR with field-level details for invalid email, message, and enquiry type', async () => {
    const fetchMock = installFetchMock([]);

    const { response, payload } = await invoke({
      name: 'Jane Smith',
      email: 'not-an-email',
      subject: 'AI in our engineering business',
      message: 'Too short',
      type: 'not_a_real_type',
      source: 'contact_page',
      honeypot: ''
    });

    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR'
      }
    });
    expect(payload.error).toMatchObject({
      details: expect.objectContaining({
        email: expect.any(String),
        message: expect.any(String),
        type: expect.any(String)
      })
    });
    expectMeta(payload.meta);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('persists readiness metadata and surfaces it in the notification email when the request is sourced from readiness_check', async () => {
    const fetchMock = installFetchMock([
      { status: 201, body: { id: 'sub_readiness_123' } },
      { status: 200, body: { id: 'email_notification_123' } },
      { status: 200, body: { id: 'email_reply_123' } }
    ]);

    const { response, payload } = await invoke({
      name: 'Alex Taylor',
      email: 'alex@example.com',
      subject: 'AI Readiness follow-up',
      message: 'We would like to explore a practical pilot after the readiness assessment.',
      type: 'business_enquiry',
      source: 'readiness_check',
      honeypot: '',
      readinessSessionId: 'session_readiness_123',
      resultCategory: 'foundational',
      resultScore: 84
    });

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        submissionId: expect.any(String),
        message: 'Thanks Alex, Thomas will be in touch shortly.'
      }
    });
    expectMeta(payload.meta);

    const storageCalls = getCallsByPath(fetchMock, SUPABASE_CONTACT_PATH);
    const emailCalls = getCallsByPath(fetchMock, RESEND_EMAIL_PATH);

    expect(storageCalls).toHaveLength(1);
    expect(emailCalls).toHaveLength(2);

    expect(getCallBody(storageCalls[0])).toMatchObject({
      source: 'readiness_check',
      enquiry_type: 'business_enquiry',
      readiness_session_id: 'session_readiness_123',
      result_category: 'foundational',
      result_score: 84
    });

    const notificationCall = emailCalls.find((call) =>
      getRecipients(getCallBody(call).to).includes('thomas@ia-2.com')
    );
    expect(notificationCall).toBeTruthy();

    const notificationBody = getCallBody(notificationCall as FetchCall);
    const notificationContent = getEmailContent(notificationBody);

    expect(notificationContent).toContain('AI Readiness Result:');
    expect(notificationContent).toContain('Category: Foundational');
    expect(notificationContent).toContain('Score: 84/100');
    expect(notificationContent).toContain('Session: session_readiness_123');
  });

  it('keeps the stored submission even if the notification email fails and still attempts the auto-reply', async () => {
    const fetchMock = installFetchMock([
      { status: 201, body: { id: 'sub_abc123' } },
      { status: 500, body: { error: 'notification failed' } },
      { status: 200, body: { id: 'email_reply_123' } }
    ]);

    const { response, payload } = await invoke({
      name: 'Jane Smith',
      email: 'jane@example.com',
      subject: 'AI in our engineering business',
      message: 'We are exploring AI adoption for our manufacturing workflow and want to talk next steps.',
      type: 'general',
      source: 'contact_page',
      honeypot: ''
    });

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        submissionId: expect.any(String),
        message: 'Thanks Jane, Thomas will be in touch shortly.'
      }
    });
    expectMeta(payload.meta);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(getCallsByPath(fetchMock, SUPABASE_CONTACT_PATH)).toHaveLength(1);
    expect(
      getCallsByPath(fetchMock, RESEND_EMAIL_PATH).some((call) =>
        getRecipients(getCallBody(call).to).includes('jane@example.com')
      )
    ).toBe(true);
  });

  it('keeps the overall submission successful when the auto-reply email fails after storage and notification succeed', async () => {
    const fetchMock = installFetchMock([
      { status: 201, body: { id: 'sub_abc123' } },
      { status: 200, body: { id: 'email_notification_123' } },
      { status: 500, body: { error: 'auto reply failed' } }
    ]);

    const { response, payload } = await invoke({
      name: 'Jane Smith',
      email: 'jane@example.com',
      subject: 'AI in our engineering business',
      message: 'We are exploring AI adoption for our manufacturing workflow and want to talk next steps.',
      type: 'general',
      source: 'contact_page',
      honeypot: ''
    });

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        submissionId: expect.any(String),
        message: 'Thanks Jane, Thomas will be in touch shortly.'
      }
    });
    expectMeta(payload.meta);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(getCallsByPath(fetchMock, SUPABASE_CONTACT_PATH)).toHaveLength(1);
  });

  it('returns 500 INTERNAL_ERROR when storage fails while still attempting notification delivery', async () => {
    const fetchMock = installFetchMock([
      { status: 500, body: { error: 'storage failed' } },
      { status: 200, body: { id: 'email_notification_123' } },
      { status: 200, body: { id: 'email_reply_123' } }
    ]);

    const { response, payload } = await invoke({
      name: 'Jane Smith',
      email: 'jane@example.com',
      subject: 'AI in our engineering business',
      message: 'We are exploring AI adoption for our manufacturing workflow and want to talk next steps.',
      type: 'general',
      source: 'contact_page',
      honeypot: ''
    });

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: 'INTERNAL_ERROR'
      }
    });
    expectMeta(payload.meta);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(getCallsByPath(fetchMock, SUPABASE_CONTACT_PATH)).toHaveLength(1);
    expect(
      getCallsByPath(fetchMock, RESEND_EMAIL_PATH).some((call) =>
        getRecipients(getCallBody(call).to).includes('thomas@ia-2.com')
      )
    ).toBe(true);
  });
});
