import { render, screen, within } from '@testing-library/react';
import ContactPage from '@/app/contact/page';
import * as contentApi from '@/lib/content/api';

vi.mock('@/lib/content/api', () => ({
  getContactContent: vi.fn()
}));

const CONTACT_SUMMARY =
  "If you're thinking about where AI fits in your business, exploring automation for an engineering or process environment, or interested in research collaboration, I'd like to hear from you. I work across industrial automation, applied AI, and control systems, and I'm always open to conversations with business owners, integrators, and fellow engineers who are working through similar problems. Whether it's a specific technical question, a project you're considering, or a broader conversation about AI readiness, drop me a message below and I'll get back to you.";

async function renderContactPage() {
  render(await ContactPage());
}

describe('/contact page contract', () => {
  beforeEach(() => {
    vi.mocked(contentApi.getContactContent).mockResolvedValue({
      page: 'contact',
      title: 'Contact',
      sections: [
        {
          id: 'contact-intro',
          title: 'Contact Introduction',
          slug: 'contact-intro',
          summary: CONTACT_SUMMARY,
          updatedAt: '2026-03-12T10:30:00Z'
        }
      ],
      lastUpdated: '2026-03-12T10:30:00Z'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders inside PageShell with Contact heading', async () => {
    await renderContactPage();

    const main = screen.getByTestId('shell-main-content');
    expect(screen.getByTestId('page-shell')).toBeInTheDocument();
    expect(within(main).getByRole('heading', { level: 1, name: 'Contact' })).toBeInTheDocument();
  });

  it('renders content-backed introduction/framing copy for contact intent', async () => {
    await renderContactPage();

    const main = screen.getByTestId('shell-main-content');
    expect(within(main).getByText(/where AI fits in your business/i)).toBeInTheDocument();
    expect(within(main).getByText(/research collaboration/i)).toBeInTheDocument();
  });

  it('renders a visible contact-form shell area', async () => {
    await renderContactPage();

    const main = screen.getByTestId('shell-main-content');
    const hasFormShell =
      within(main).queryByRole('form') !== null ||
      within(main).queryByTestId('contact-form') !== null ||
      within(main).queryByTestId('contact-form-shell') !== null ||
      within(main).queryByText(/contact form/i) !== null ||
      within(main).queryAllByRole('textbox').length > 0;

    expect(hasFormShell).toBe(true);
  });

  it('fetches contact content through the public content helper', async () => {
    await renderContactPage();

    expect(contentApi.getContactContent).toHaveBeenCalledTimes(1);
  });

  it('does not keep RoutePlaceholder copy once implemented', async () => {
    await renderContactPage();

    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });
});
