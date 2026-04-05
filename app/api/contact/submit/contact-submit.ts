import { NextResponse } from 'next/server';

type ContactEnquiryType = 'business_enquiry' | 'research_collaboration' | 'technical_enquiry' | 'general';
type ContactSubmitSource = 'contact_page' | 'readiness_check' | 'llm';

type ContactSubmissionInput = {
  name: string;
  email: string;
  subject?: string;
  message: string;
  type: ContactEnquiryType;
  source?: ContactSubmitSource;
  honeypot: string;
  readinessSessionId?: string;
  resultCategory?: string;
  resultScore?: number;
};

type ParsedBodyResult =
  | {
      kind: 'valid';
      data: ContactSubmissionInput;
    }
  | {
      kind: 'honeypot';
      response: NextResponse;
    }
  | {
      kind: 'validation_error';
      response: NextResponse;
    }

type InsertContactSubmissionResult = {
  submissionId: string;
};

const CONTACT_SUBMIT_PATH = '/rest/v1/contact_submissions';
const RESEND_EMAIL_URL = 'https://api.resend.com/emails';
const DEFAULT_SUPABASE_BASE_URL = 'http://localhost:3000';
const DEFAULT_CONTACT_NOTIFICATION_EMAIL = 'thomas@ia-2.com';
const DEFAULT_EMAIL_FROM_NAME = 'Thomas Hadden';
const DEFAULT_EMAIL_FROM_ADDRESS = 'thomas@ia-2.com';

const ENQUIRY_TYPE_LABELS: Record<ContactEnquiryType, string> = {
  business_enquiry: 'AI in my business',
  research_collaboration: 'Research collaboration',
  technical_enquiry: 'Technical enquiry',
  general: 'General enquiry'
};

const AUTO_REPLY_SUBJECTS: Record<ContactEnquiryType, string> = {
  business_enquiry: 'Got your message - AI in your business',
  research_collaboration: 'Thanks for reaching out - research collaboration',
  technical_enquiry: 'Got your technical enquiry',
  general: 'Thanks for getting in touch'
};

const READINESS_RESULT_LABELS: Record<string, string> = {
  early_stage: 'Early-Stage',
  foundational: 'Foundational',
  ready_to_pilot: 'Ready to Pilot',
  ready_to_scale: 'Ready to Scale'
};

const HONORIFICS = new Set(['mr', 'mrs', 'ms', 'miss', 'mx', 'dr', 'prof', 'professor', 'sir', 'dame']);

function createMeta(timestamp = new Date().toISOString()) {
  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return {
    requestId,
    timestamp
  };
}

function ok(data: unknown, timestamp?: string) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: createMeta(timestamp)
    },
    { status: 200 }
  );
}

function error(
  status: number,
  code: 'VALIDATION_ERROR' | 'INTERNAL_ERROR',
  message: string,
  details?: Record<string, unknown>,
  timestamp?: string
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {})
      },
      meta: createMeta(timestamp)
    },
    { status }
  );
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function trimString(value: unknown): string | null {
  if (!isString(value)) {
    return null;
  }

  return value.trim();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function parseStringField(value: unknown): string | null {
  const trimmed = trimString(value);
  if (trimmed === null || trimmed.length === 0) {
    return null;
  }

  return trimmed;
}

function extractFirstName(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return '';
  }

  const firstToken = parts[0].replace(/\.$/, '');
  if (HONORIFICS.has(firstToken.toLowerCase()) && parts[1]) {
    return parts[1];
  }

  return parts[0];
}

function buildSuccessMessage(name: string): string {
  const firstName = extractFirstName(name);
  if (!firstName) {
    return 'Thanks, Thomas will be in touch shortly.';
  }

  return `Thanks ${firstName}, Thomas will be in touch shortly.`;
}

function buildHoneypotSubmissionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `spam_${crypto.randomUUID()}`;
  }

  return `spam_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildFallbackSubmissionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `sub_${crypto.randomUUID()}`;
  }

  return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function titleCase(value: string): string {
  return value
    .split(/[_\s-]+/g)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function getReadinessResultLabel(value: string): string {
  return READINESS_RESULT_LABELS[value] ?? titleCase(value);
}

function buildNotificationSubject(name: string, type: ContactEnquiryType): string {
  return `[thomashadden.ai] ${ENQUIRY_TYPE_LABELS[type]} from ${name}`;
}

function buildReadinessBlock(input: ContactSubmissionInput): string {
  const readinessFields: string[] = [];

  if (input.resultCategory !== undefined) {
    readinessFields.push(`Category: ${getReadinessResultLabel(input.resultCategory)}`);
  }

  if (input.resultScore !== undefined) {
    readinessFields.push(`Score: ${input.resultScore}/100`);
  }

  if (input.readinessSessionId !== undefined) {
    readinessFields.push(`Session: ${input.readinessSessionId}`);
  }

  if (readinessFields.length === 0) {
    return '';
  }

  return ['AI Readiness Result:', ...readinessFields].join('\n');
}

function buildNotificationText(input: ContactSubmissionInput, timestamp: string): string {
  const subjectLine = input.subject ?? 'Not provided';
  const readinessBlock = buildReadinessBlock(input);

  const sections = [
    'New contact form submission on thomashadden.ai',
    '',
    `Name:         ${input.name}`,
    `Email:        ${input.email}`,
    `Enquiry type: ${ENQUIRY_TYPE_LABELS[input.type]}`,
    `Subject:      ${subjectLine}`,
    '',
    'Message:',
    input.message
  ];

  if (readinessBlock) {
    sections.push('');
    sections.push(readinessBlock);
  }

  sections.push('');
  sections.push(`Submitted: ${timestamp}`);

  return sections.join('\n');
}

function buildAutoReplyText(input: ContactSubmissionInput): { subject: string; text: string } {
  const firstName = extractFirstName(input.name) || 'there';
  const signature = ' - Thomas | thomashadden.ai';

  switch (input.type) {
    case 'business_enquiry':
      return {
        subject: AUTO_REPLY_SUBJECTS.business_enquiry,
        text: [
          `Hi ${firstName},`,
          '',
          'Thanks for getting in touch. It\'s always good to hear from someone thinking seriously about where AI fits in their business.',
          '',
          "I'll take a read through what you've shared and come back to you shortly. If there's anything useful I can point you to in the meantime, the AI Readiness Check on the site is worth a look if you haven't already tried it.",
          '',
          'Talk soon.',
          '',
          signature
        ].join('\n')
      };
    case 'research_collaboration':
      return {
        subject: AUTO_REPLY_SUBJECTS.research_collaboration,
        text: [
          `Hi ${firstName},`,
          '',
          "Thanks for getting in touch about collaboration. I'm always interested in connecting with people working on applied research in this space.",
          '',
          "I'll have a read through your message and get back to you. Looking forward to the conversation.",
          '',
          signature
        ].join('\n')
      };
    case 'technical_enquiry':
      return {
        subject: AUTO_REPLY_SUBJECTS.technical_enquiry,
        text: [
          `Hi ${firstName},`,
          '',
          "Thanks for reaching out. Technical questions are always welcome - I'll take a look at what you've sent and come back to you with something useful.",
          '',
          signature
        ].join('\n')
      };
    case 'general':
    default:
      return {
        subject: AUTO_REPLY_SUBJECTS.general,
        text: [
          `Hi ${firstName},`,
          '',
          "Thanks for the message - I'll get back to you shortly.",
          '',
          signature
        ].join('\n')
      };
  }
}

function buildPersistencePayload(input: ContactSubmissionInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: input.name,
    email: input.email,
    enquiry_type: input.type,
    message: input.message,
    source: input.source ?? 'contact_page'
  };

  if (input.subject !== undefined) {
    payload.subject = input.subject;
  }

  if (input.readinessSessionId !== undefined) {
    payload.readiness_session_id = input.readinessSessionId;
  }

  if (input.resultCategory !== undefined) {
    payload.result_category = input.resultCategory;
  }

  if (input.resultScore !== undefined) {
    payload.result_score = input.resultScore;
  }

  return payload;
}

function buildSupabaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_BASE_URL;
  return new URL(CONTACT_SUBMIT_PATH, baseUrl).toString();
}

function buildSupabaseHeaders() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';

  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    accept: 'application/json',
    'content-type': 'application/json',
    prefer: 'return=representation'
  };
}

async function readJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractSubmissionId(body: unknown): string | null {
  if (Array.isArray(body)) {
    for (const row of body) {
      if (isObjectRecord(row) && typeof row.id === 'string' && row.id.trim().length > 0) {
        return row.id.trim();
      }
    }
  }

  if (isObjectRecord(body)) {
    if (typeof body.id === 'string' && body.id.trim().length > 0) {
      return body.id.trim();
    }

    const data = body.data;
    if (Array.isArray(data)) {
      for (const row of data) {
        if (isObjectRecord(row) && typeof row.id === 'string' && row.id.trim().length > 0) {
          return row.id.trim();
        }
      }
    } else if (isObjectRecord(data) && typeof data.id === 'string' && data.id.trim().length > 0) {
      return data.id.trim();
    }
  }

  return null;
}

async function insertContactSubmission(payload: Record<string, unknown>): Promise<InsertContactSubmissionResult> {
  const response = await fetch(buildSupabaseUrl(), {
    method: 'POST',
    headers: buildSupabaseHeaders(),
    body: JSON.stringify(payload)
  });

  const responseBody = await readJsonSafely(response);
  if (!response.ok) {
    const failure = new Error(`Supabase insert failed with status ${response.status}`);
    (failure as Error & { body?: unknown }).body = responseBody;
    throw failure;
  }

  return {
    submissionId: extractSubmissionId(responseBody) ?? buildFallbackSubmissionId()
  };
}

type ResendEmailPayload = {
  to: string | string[];
  subject: string;
  text: string;
};

async function sendResendEmail(payload: ResendEmailPayload) {
  const fromName = process.env.EMAIL_FROM_NAME?.trim() || DEFAULT_EMAIL_FROM_NAME;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS?.trim() || DEFAULT_EMAIL_FROM_ADDRESS;
  const apiKey = process.env.SMTP_PASS?.trim() ?? '';

  const response = await fetch(RESEND_EMAIL_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      from: `${fromName} <${fromAddress}>`,
      to: payload.to,
      subject: payload.subject,
      text: payload.text
    })
  });

  const responseBody = await readJsonSafely(response);
  if (!response.ok) {
    const failure = new Error(`Resend email failed with status ${response.status}`);
    (failure as Error & { body?: unknown }).body = responseBody;
    throw failure;
  }
}

function validateContactSubmissionBody(body: unknown): ParsedBodyResult {
  if (!isObjectRecord(body)) {
    return {
      kind: 'validation_error',
      response: error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'body',
        reason: 'Body must be a JSON object.'
      })
    };
  }

  if (!isString(body.honeypot)) {
    return {
      kind: 'validation_error',
      response: error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
        field: 'honeypot',
        reason: 'Honeypot is required and must be a string.'
      })
    };
  }

  const honeypot = body.honeypot.trim();
  if (honeypot.length > 0) {
    const name = parseStringField(body.name);
    return {
      kind: 'honeypot',
      response: ok(
        {
          submissionId: buildHoneypotSubmissionId(),
          message: buildSuccessMessage(name ?? '')
        },
        new Date().toISOString()
      )
    };
  }

  const details: Record<string, string> = {};

  const name = parseStringField(body.name);
  if (!name) {
    details.name = 'Name must be between 2 and 100 characters.';
  } else if (name.length < 2 || name.length > 100) {
    details.name = 'Name must be between 2 and 100 characters.';
  }

  const email = parseStringField(body.email);
  if (!email) {
    details.email = 'Email is required and must be a valid address.';
  } else if (!isValidEmail(email)) {
    details.email = 'Email is required and must be a valid address.';
  }

  const message = parseStringField(body.message);
  if (!message) {
    details.message = 'Message must be between 20 and 2000 characters.';
  } else if (message.length < 20 || message.length > 2000) {
    details.message = 'Message must be between 20 and 2000 characters.';
  }

  const typeValue = parseStringField(body.type);
  if (!typeValue || !['business_enquiry', 'research_collaboration', 'technical_enquiry', 'general'].includes(typeValue)) {
    details.type =
      'Type must be one of business_enquiry, research_collaboration, technical_enquiry, or general.';
  }

  let source: ContactSubmitSource | undefined;
  if (body.source !== undefined) {
    const sourceValue = parseStringField(body.source);
    if (!sourceValue || !['contact_page', 'readiness_check', 'llm'].includes(sourceValue)) {
      details.source = 'Source must be one of contact_page, readiness_check, or llm.';
    } else {
      source = sourceValue as ContactSubmitSource;
    }
  }

  let subject: string | undefined;
  if (body.subject !== undefined) {
    const subjectValue = parseStringField(body.subject);
    if (subjectValue === null) {
      subject = undefined;
    } else if (subjectValue.length > 200) {
      details.subject = 'Subject must be 200 characters or fewer.';
    } else {
      subject = subjectValue;
    }
  }

  let readinessSessionId: string | undefined;
  if (body.readinessSessionId !== undefined) {
    if (!isString(body.readinessSessionId)) {
      details.readinessSessionId = 'readinessSessionId must be a string when provided.';
    } else {
      const trimmed = body.readinessSessionId.trim();
      if (trimmed.length > 0) {
        readinessSessionId = trimmed;
      }
    }
  }

  let resultCategory: string | undefined;
  if (body.resultCategory !== undefined) {
    if (!isString(body.resultCategory)) {
      details.resultCategory = 'resultCategory must be a string when provided.';
    } else {
      const trimmed = body.resultCategory.trim();
      if (trimmed.length > 0) {
        resultCategory = trimmed;
      }
    }
  }

  let resultScore: number | undefined;
  if (body.resultScore !== undefined) {
    if (typeof body.resultScore !== 'number' || !Number.isInteger(body.resultScore) || body.resultScore < 0 || body.resultScore > 100) {
      details.resultScore = 'resultScore must be an integer between 0 and 100.';
    } else {
      resultScore = body.resultScore;
    }
  }

  if (Object.keys(details).length > 0 || !name || !email || !message || !typeValue) {
    return {
      kind: 'validation_error',
      response: error(422, 'VALIDATION_ERROR', 'Request body failed validation.', details)
    };
  }

  return {
    kind: 'valid',
    data: {
      name,
      email,
      message,
      type: typeValue as ContactEnquiryType,
      honeypot,
      ...(subject !== undefined ? { subject } : {}),
      ...(source !== undefined ? { source } : {}),
      ...(readinessSessionId !== undefined ? { readinessSessionId } : {}),
      ...(resultCategory !== undefined ? { resultCategory } : {}),
      ...(resultScore !== undefined ? { resultScore } : {})
    }
  };
}

async function dispatchSubmissionEmails(input: ContactSubmissionInput, timestamp: string) {
  const notification = {
    to: process.env.CONTACT_NOTIFICATION_EMAIL?.trim() || DEFAULT_CONTACT_NOTIFICATION_EMAIL,
    subject: buildNotificationSubject(input.name, input.type),
    text: buildNotificationText(input, timestamp)
  };

  const autoReply = buildAutoReplyText(input);

  try {
    await sendResendEmail(notification);
  } catch (error) {
    console.error('Failed to send contact notification email.', error);
  }

  try {
    await sendResendEmail({
      to: input.email,
      subject: autoReply.subject,
      text: autoReply.text
    });
  } catch (error) {
    console.error('Failed to send contact auto-reply email.', error);
  }
}

export async function handleContactSubmit(request: Request) {
  const timestamp = new Date().toISOString();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(422, 'VALIDATION_ERROR', 'Request body failed validation.', {
      field: 'body',
      reason: 'Malformed JSON body.'
    }, timestamp);
  }

  const parsed = validateContactSubmissionBody(body);
  if (parsed.kind === 'validation_error') {
    return parsed.response;
  }

  if (parsed.kind === 'honeypot') {
    return parsed.response;
  }

  const input = parsed.data;
  const persistencePayload = buildPersistencePayload(input);

  try {
    const { submissionId } = await insertContactSubmission(persistencePayload);
    await dispatchSubmissionEmails(input, timestamp);

    return ok(
      {
        submissionId,
        message: buildSuccessMessage(input.name)
      },
      timestamp
    );
  } catch (storageError) {
    console.error('Failed to store contact submission.', storageError);

    try {
      await dispatchSubmissionEmails(input, timestamp);
    } catch {
      // dispatchSubmissionEmails handles its own email-level failures.
    }

    return error(
      500,
      'INTERNAL_ERROR',
      'An internal error occurred while saving the contact submission.',
      undefined,
      timestamp
    );
  }
}
