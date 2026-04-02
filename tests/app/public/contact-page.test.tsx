import { render, screen, within } from '@testing-library/react';
import ContactPage from '@/app/contact/page';
import * as contentApi from '@/lib/content/api';

vi.mock('@/lib/content/api', () => ({
  getHomeContent: vi.fn(),
  getAboutContent: vi.fn(),
  getProjectsContent: vi.fn(),
  getResearchContent: vi.fn(),
  getInsightsContent: vi.fn()
}));

async function renderContactPage() {
  render(await ContactPage());
}

describe('/contact page contract', () => {
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
    expect(
      within(main).getByText(/ai in business|industrial.*ai|collaboration|research|technical enquiries/i)
    ).toBeInTheDocument();
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

  it('does not rely on public content fetch helpers for contact route rendering', async () => {
    await renderContactPage();

    expect(contentApi.getHomeContent).not.toHaveBeenCalled();
    expect(contentApi.getAboutContent).not.toHaveBeenCalled();
    expect(contentApi.getProjectsContent).not.toHaveBeenCalled();
    expect(contentApi.getResearchContent).not.toHaveBeenCalled();
    expect(contentApi.getInsightsContent).not.toHaveBeenCalled();
  });

  it('does not keep RoutePlaceholder copy once implemented', async () => {
    await renderContactPage();

    expect(screen.queryByText('Placeholder route for SPR-01 bootstrap.')).not.toBeInTheDocument();
  });
});
