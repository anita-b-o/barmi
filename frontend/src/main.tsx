import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { appConfig } from './app/config/env'
import { initSentry } from './app/observability/sentry'
import { AppProviders } from './app/providers'

initSentry(appConfig.sentryDsn)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <App />
  </AppProviders>,
)
