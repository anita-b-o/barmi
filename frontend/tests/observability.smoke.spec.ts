import { expect, test } from '@playwright/test'

test('observability smoke validates release metadata and FE↔BE correlation', async ({ page }) => {
  let sentryRequestSeen = false
  const sentryHost = process.env.SENTRY_EXPECT_DSN_HOST
  const expectSentryEvent = process.env.SENTRY_SMOKE_EXPECT_EVENT === 'true'
  const expectedReleaseId = process.env.EXPECT_FRONTEND_RELEASE_ID

  if (sentryHost) {
    page.on('request', (request) => {
      if (request.url().includes(sentryHost)) {
        sentryRequestSeen = true
      }
    })
  }

  await page.goto('/__observability')

  await expect(page.getByTestId('observability-release-id')).not.toContainText('unknown')
  if (expectedReleaseId) {
    await expect(page.getByTestId('observability-release-id')).toContainText(expectedReleaseId)
  }
  await expect(page.getByTestId('observability-commit')).not.toContainText('unknown')
  await expect(page.getByTestId('observability-build-timestamp')).not.toContainText('unknown')
  await expect(page.getByTestId('observability-environment')).not.toContainText('development')
  await expect(page.getByTestId('observability-sentry-smoke')).toContainText(expectSentryEvent ? 'enabled' : 'disabled')

  await page.getByRole('button', { name: 'Trigger Backend 503' }).click()
  await expect(page.getByTestId('observability-http-status')).toContainText('503')

  const headerRequestId = await page.getByTestId('observability-header-request-id').textContent()
  const bodyRequestId = await page.getByTestId('observability-body-request-id').textContent()

  expect(headerRequestId).toBeTruthy()
  expect(bodyRequestId).toBeTruthy()
  expect(headerRequestId?.split(': ').at(1)).toBe(bodyRequestId?.split(': ').at(1))

  if (expectSentryEvent) {
    await page.getByRole('button', { name: 'Trigger Frontend Crash' }).click()
    await expect(page.getByText(/No pudimos cargar esta pantalla/)).toBeVisible()
  }

  if (sentryHost && expectSentryEvent) {
    await expect.poll(() => sentryRequestSeen).toBeTruthy()
  }
})
