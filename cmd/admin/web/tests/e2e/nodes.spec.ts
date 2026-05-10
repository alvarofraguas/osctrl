import { test, expect } from '@playwright/test';

const BOOTSTRAP_PAYLOAD = { user: 'alice', envs: ['dev'] };

const NODES_PAYLOAD = {
  draw: 1,
  recordsTotal: 2,
  recordsFiltered: 2,
  data: [
    {
      uuid: 'node-aaaa-aaaa', username: 'u1', localname: 'host-a',
      ip: '1.1.1.1', platform: 'linux', version: '1.0', osquery: '5.x',
      lastseen: { display: '1m ago', timestamp: '1' },
      firstseen: { display: '1d', timestamp: '0' },
      checkbox: ''
    },
    {
      uuid: 'node-bbbb-bbbb', username: 'u2', localname: 'host-b',
      ip: '2.2.2.2', platform: 'darwin', version: '1.0', osquery: '5.x',
      lastseen: { display: '5m ago', timestamp: '1' },
      firstseen: { display: '2d', timestamp: '0' },
      checkbox: ''
    }
  ]
};

const FILTERED_PAYLOAD = {
  draw: 1,
  recordsTotal: 2,
  recordsFiltered: 1,
  data: [NODES_PAYLOAD.data[0]]
};

test('nodes page renders rows, debounces search, and refetches', async ({ page }) => {
  await page.route('**/ui/api/bootstrap', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(BOOTSTRAP_PAYLOAD) })
  );

  let searchCalls = 0;
  await page.route('**/paginated-json/environment/**', (route) => {
    searchCalls++;
    const url = new URL(route.request().url());
    const search = url.searchParams.get('search') ?? '';
    const body = search === '' ? NODES_PAYLOAD : FILTERED_PAYLOAD;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.goto('/ui/');
  // After client-side redirect, we land on /ui/nodes/.
  await expect(page).toHaveURL(/\/ui\/nodes\/?$/);

  // Both rows visible after the bootstrap + first nodes call resolve.
  await expect(page.getByText('host-a')).toBeVisible();
  await expect(page.getByText('host-b')).toBeVisible();
  expect(searchCalls).toBeGreaterThan(0);

  const callsBeforeSearch = searchCalls;

  // Type into the search box; debounce window is 250ms in the component.
  await page.getByPlaceholder(/search/i).fill('host-a');

  // Wait long enough for the debounce + refetch to complete.
  // 250ms debounce + buffer for network and render on loaded CI runners.
  await page.waitForTimeout(750);

  // Verify a refetch happened and the table updated.
  expect(searchCalls).toBeGreaterThan(callsBeforeSearch);
  await expect(page.getByText('host-a')).toBeVisible();
  await expect(page.getByText('host-b')).toHaveCount(0);
});

test('clicking a column header updates the URL with sort and dir', async ({ page }) => {
  await page.route('**/ui/api/bootstrap', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(BOOTSTRAP_PAYLOAD) })
  );
  await page.route('**/paginated-json/environment/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(NODES_PAYLOAD) })
  );

  await page.goto('/ui/nodes/');
  await expect(page.getByText('host-a')).toBeVisible();

  await page.getByRole('button', { name: /host/i }).click();

  // The URL should now have ?sort=localname&dir=asc (the first click sets asc).
  await expect(page).toHaveURL(/sort=localname/);
  await expect(page).toHaveURL(/dir=asc/);
});
