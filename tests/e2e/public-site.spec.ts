import { expect, type Page, test } from '@playwright/test';

const PLACEHOLDER_COPY = 'Placeholder route for SPR-01 bootstrap.';
const READINESS_CTA_LABEL = 'Start the 2-minute assessment';

type RoutedExpectation = {
  path: string;
  heading: string;
};

const DESKTOP_NAV_ROUTES: RoutedExpectation[] = [
  { path: '/about', heading: 'About' },
  { path: '/projects', heading: 'Projects' },
  { path: '/research', heading: 'Research' },
  { path: '/insights', heading: 'Insights' },
  { path: '/contact', heading: 'Contact' }
];

const MOBILE_NAV_ROUTES: RoutedExpectation[] = [
  { path: '/', heading: 'Thomas Hadden' },
  { path: '/projects', heading: 'Projects' },
  { path: '/research', heading: 'Research' },
  { path: '/insights', heading: 'Insights' },
  { path: '/contact', heading: 'Contact' }
];

async function gotoAndAssertOk(page: Page, path: string) {
  const response = await page.goto(path);

  expect(response, `${path} should respond`).not.toBeNull();
  expect(response?.ok(), `${path} should respond with OK`).toBeTruthy();
}

test('desktop home renders Sprint 2 homepage composition', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only coverage');

  await gotoAndAssertOk(page, '/');

  const desktopNav = page.getByRole('navigation', { name: 'Main navigation' });

  await expect(desktopNav).toBeVisible();
  await expect(page.getByText(PLACEHOLDER_COPY)).toHaveCount(0);

  await expect(page.getByRole('heading', { level: 1, name: 'Thomas Hadden' })).toBeVisible();
  await expect(page.getByTestId('home-llm-shell')).toBeVisible();

  await expect(page.getByRole('heading', { level: 2, name: 'Featured Work' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'About Thomas' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Research' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Latest Insights' })).toBeVisible();

  await expect(page.getByTestId('readiness-strip')).toBeVisible();
  await expect(page.getByTestId('readiness-strip').getByRole('link', { name: READINESS_CTA_LABEL })).toBeVisible();
});

test('mobile home renders collapsed rows and mobile homepage controls', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only coverage');

  await gotoAndAssertOk(page, '/');

  await expect(page.getByRole('banner')).toBeVisible();

  const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(mobileNav).toBeVisible();

  await expect(page.getByRole('link', { name: 'Featured Work' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'About Thomas' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Current Research' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Latest Insights' })).toBeVisible();

  await expect(page.getByRole('heading', { level: 1, name: 'Thomas Hadden' })).toBeVisible();
  await expect(page.getByTestId('home-llm-shell')).toBeVisible();
  await expect(page.getByTestId('readiness-card')).toBeVisible();
  await expect(page.getByRole('link', { name: READINESS_CTA_LABEL })).toBeVisible();

  await expect(page.getByTestId('collaborate-row')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Collaborate on Research' })).toBeVisible();

  await expect(page.getByRole('contentinfo')).toHaveCount(0);
});

test('mobile home stays within a 375px viewport and keeps the compact launcher composition', async ({
  page,
  isMobile
}) => {
  test.skip(!isMobile, 'mobile-only coverage');

  await page.setViewportSize({ width: 375, height: 812 });
  await gotoAndAssertOk(page, '/');

  await expect(page.getByTestId('home-llm-mobile-launcher')).toBeVisible();
  await expect(page.getByTestId('home-llm-prompt-row')).toHaveCount(0);

  const layout = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const docScrollWidth = document.documentElement.scrollWidth;
    const pageShell = document.querySelector('[data-testid="page-shell"]');
    const homeStack = document.querySelector('[data-testid="home-mobile-content"]');

    const shellRect = pageShell?.getBoundingClientRect();
    const stackRect = homeStack?.getBoundingClientRect();

    return {
      docWidth,
      docScrollWidth,
      shellRight: shellRect?.right ?? null,
      stackRight: stackRect?.right ?? null
    };
  });

  expect(layout.docScrollWidth).toBeLessThanOrEqual(layout.docWidth);
  expect(layout.shellRight).not.toBeNull();
  expect(layout.shellRight).toBeLessThanOrEqual(layout.docWidth);
  expect(layout.stackRight).not.toBeNull();
  expect(layout.stackRight).toBeLessThanOrEqual(layout.docWidth);
});

test('desktop main nav routes to all primary public pages', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only coverage');

  await gotoAndAssertOk(page, '/');

  const desktopNav = page.getByRole('navigation', { name: 'Main navigation' });

  for (const route of DESKTOP_NAV_ROUTES) {
    await Promise.all([
      page.waitForURL((url) => url.pathname === route.path),
      desktopNav.getByRole('link', { name: route.heading }).click()
    ]);

    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
    await expect(desktopNav).toBeVisible();
  }
});

test('mobile bottom nav routes through public pages and stays operational', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only coverage');

  await gotoAndAssertOk(page, '/');

  const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });

  for (const route of MOBILE_NAV_ROUTES) {
    const navLink = mobileNav.getByRole('link', {
      name: route.path === '/' ? 'Home' : route.heading
    });

    if (route.path === '/') {
      await navLink.click();
      await expect(page).toHaveURL(/\/$/);
    } else {
      await Promise.all([page.waitForURL((url) => url.pathname === route.path), navLink.click()]);
    }

    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
    await expect(mobileNav).toBeVisible();
    await expect(navLink).toHaveAttribute('aria-current', 'page');
  }
});

test('public detail routes are reachable with valid slugs and parent back-links', async ({ page }) => {
  await test.step('project detail route', async () => {
    await gotoAndAssertOk(page, '/projects/example-project');

    await expect(page.getByRole('heading', { level: 1, name: 'Example Project' })).toBeVisible();
    await expect(page.getByText('Reference implementation used for public content API contract coverage.')).toBeVisible();

    const backToProjects = page.getByRole('link', { name: '← Back to Projects' });
    await expect(backToProjects).toBeVisible();
    await expect(backToProjects).toHaveAttribute('href', '/projects');
  });

  await test.step('research detail route', async () => {
    await gotoAndAssertOk(page, '/research/example-research');

    await expect(page.getByRole('heading', { level: 1, name: 'Example Research' })).toBeVisible();
    await expect(page.getByText('Reference research item used for slug and list route coverage.')).toBeVisible();

    const backToResearch = page.getByRole('link', { name: '← Back to Research' });
    await expect(backToResearch).toBeVisible();
    await expect(backToResearch).toHaveAttribute('href', '/research');
  });

  await test.step('insight detail route', async () => {
    await gotoAndAssertOk(page, '/insights/example-insight');

    await expect(page.getByRole('heading', { level: 1, name: 'Example Insight' })).toBeVisible();
    await expect(page.getByText('Reference insight item used for slug and pagination contract coverage.')).toBeVisible();

    const backToInsights = page.getByRole('link', { name: '← Back to Insights' });
    await expect(backToInsights).toBeVisible();
    await expect(backToInsights).toHaveAttribute('href', '/insights');
  });
});

test('desktop home readiness CTA is visible and routes to readiness', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only coverage');

  await gotoAndAssertOk(page, '/');

  const readinessCta = page.getByTestId('readiness-strip').getByRole('link', { name: READINESS_CTA_LABEL });
  await expect(readinessCta).toBeVisible();

  await Promise.all([page.waitForURL((url) => url.pathname === '/readiness'), readinessCta.click()]);

  await expect(page.getByRole('heading', { level: 1, name: 'AI Readiness Check' })).toBeVisible();
});

test('mobile home readiness CTA is visible and routes to readiness', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only coverage');

  await gotoAndAssertOk(page, '/');

  const readinessCta = page.getByTestId('readiness-card').getByRole('link', { name: READINESS_CTA_LABEL });
  await expect(readinessCta).toBeVisible();

  await Promise.all([page.waitForURL((url) => url.pathname === '/readiness'), readinessCta.click()]);

  await expect(page.getByRole('heading', { level: 1, name: 'AI Readiness Check' })).toBeVisible();
});
