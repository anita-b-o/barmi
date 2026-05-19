import { GlobalErrorBoundary } from './observability/GlobalErrorBoundary'
import FrontendRuntimeMonitor from './observability/FrontendRuntimeMonitor'
import { AppRouter } from './router'
import BackendConnectionBanner from './connection/BackendConnectionBanner'

export default function App() {
  return (
    <GlobalErrorBoundary>
      <FrontendRuntimeMonitor />
      <BackendConnectionBanner />
      <AppRouter />
    </GlobalErrorBoundary>
  )
}
