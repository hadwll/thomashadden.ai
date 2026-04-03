import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContactPage from '@/app/contact/page';
import { ResultScreen } from '@/components/readiness/ResultScreen';

const READINESS_RESULT_PATH = '/contact?source=readiness_check&result=early_stage';
const AUTH_NAME = 'Jane Reviewer';
const AUTH_EMAIL = 'jane@example.com';
const AUTH_RESULT = {
  data: {
    user: {
      email: AUTH_EMAIL,
      user_metadata: {
        name: AUTH_NAME
      }
    }
  },
  error: null
};
const ANONYMOUS_RESULT = {
  data: {
    user: null
  },
  error: null
};

const supabaseMocks = vi.hoisted(() => ({
  getUserMock: vi.fn()
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: supabaseMocks.getUserMock
    }
  }))
}));

type ContactPageSearchParams = Record<string, string>;

function mockAuthenticatedSession() {
  supabaseMocks.getUserMock.mockResolvedValue(AUTH_RESULT);
}

function mockAnonymousSession() {
  supabaseMocks.getUserMock.mockResolvedValue(ANONYMOUS_RESULT);
}

function setContactUrl(searchParams: ContactPageSearchParams) {
  window.history.replaceState({}, '', `/contact?${new URLSearchParams(searchParams).toString()}`);
}

async function renderContactPage(searchParams: ContactPageSearchParams) {
  setContactUrl(searchParams);

  const ContactPageWithSearchParams = ContactPage as unknown as (
    props: { searchParams: ContactPageSearchParams }
  ) => JSX.Element | Promise<JSX.Element>;

  render(await ContactPageWithSearchParams({ searchParams }));
}

async function expectEditableTextInput(label: RegExp | string, nextValue: string) {
  const user = userEvent.setup();
  const input = screen.getByLabelText(label) as HTMLInputElement;

  await user.clear(input);
  await user.type(input, nextValue);

  expect(input).toHaveValue(nextValue);
}

describe('/contact readiness bridge contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/contact');
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/contact');
  });

  it('renders the readiness result CTA with a /contact target that carries source and result only', () => {
    render(
      <ResultScreen
        categoryLabel="Early-Stage"
        ctaLabel="Start with a conversation — get in touch"
        ctaUrl={READINESS_RESULT_PATH}
        nextStep="A short conversation about your business and the areas where you are feeling the most pressure is the best place to start."
        score={18}
        summary="Your business is at the beginning of the AI journey."
      />
    );

    const cta = screen.getByRole('link', { name: 'Start with a conversation — get in touch' });
    const href = cta.getAttribute('href') ?? '';

    expect(cta).toHaveAttribute('href', READINESS_RESULT_PATH);
    expect(href).not.toContain('name=');
    expect(href).not.toContain('email=');
  });

  it('prefills readiness context from query params and uses the authenticated session for name and email', async () => {
    mockAuthenticatedSession();

    await renderContactPage({
      source: 'readiness_check',
      result: 'early_stage',
      name: 'Bad Actor',
      email: 'bad-actor@example.com'
    });

    const form = screen.getByTestId('contact-form-shell');
    const nameInput = within(form).getByLabelText('Name') as HTMLInputElement;
    const emailInput = within(form).getByLabelText('Email') as HTMLInputElement;
    const subjectInput = within(form).getByLabelText('Subject') as HTMLInputElement;
    const enquiryTypeInput = within(form).getByLabelText('Enquiry type') as HTMLSelectElement;
    const sourceField = form.querySelector('input[name="source"]') as HTMLInputElement | null;

    expect(sourceField).not.toBeNull();
    expect(sourceField).toHaveValue('readiness_check');
    expect(nameInput).toHaveValue(AUTH_NAME);
    expect(emailInput).toHaveValue(AUTH_EMAIL);
    expect(subjectInput).toHaveValue('AI Readiness follow-up');
    expect(enquiryTypeInput).toHaveValue('business_enquiry');
    expect(nameInput).not.toHaveValue('Bad Actor');
    expect(emailInput).not.toHaveValue('bad-actor@example.com');
  });

  it('keeps readiness context when no session is available, but leaves identity blank instead of using URL params', async () => {
    mockAnonymousSession();

    await renderContactPage({
      source: 'readiness_check',
      result: 'early_stage',
      name: 'Bad Actor',
      email: 'bad-actor@example.com'
    });

    const form = screen.getByTestId('contact-form-shell');
    const nameInput = within(form).getByLabelText('Name') as HTMLInputElement;
    const emailInput = within(form).getByLabelText('Email') as HTMLInputElement;
    const subjectInput = within(form).getByLabelText('Subject') as HTMLInputElement;
    const enquiryTypeInput = within(form).getByLabelText('Enquiry type') as HTMLSelectElement;
    const sourceField = form.querySelector('input[name="source"]') as HTMLInputElement | null;

    expect(sourceField).not.toBeNull();
    expect(sourceField).toHaveValue('readiness_check');
    expect(nameInput).toHaveValue('');
    expect(emailInput).toHaveValue('');
    expect(subjectInput).toHaveValue('AI Readiness follow-up');
    expect(enquiryTypeInput).toHaveValue('business_enquiry');
    expect(nameInput).not.toHaveValue('Bad Actor');
    expect(emailInput).not.toHaveValue('bad-actor@example.com');
  });

  it('keeps all prefilled readiness contact fields editable', async () => {
    mockAuthenticatedSession();

    await renderContactPage({
      source: 'readiness_check',
      result: 'early_stage'
    });

    const form = screen.getByTestId('contact-form-shell');
    const sourceField = form.querySelector('input[name="source"]') as HTMLInputElement | null;

    expect(sourceField).not.toBeNull();
    expect(sourceField).toHaveValue('readiness_check');

    await expectEditableTextInput('Name', 'Alex Reviewer');
    await expectEditableTextInput('Email', 'alex@example.com');
    await expectEditableTextInput('Subject', 'Follow up on the AI assessment');

    const user = userEvent.setup();
    const enquiryTypeInput = within(form).getByLabelText('Enquiry type') as HTMLSelectElement;
    await user.selectOptions(enquiryTypeInput, 'technical_enquiry');

    expect(enquiryTypeInput).toHaveValue('technical_enquiry');
  });
});
