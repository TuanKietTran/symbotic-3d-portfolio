import { Component, type ErrorInfo, type ReactNode } from 'react'
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Interactive module failed', error, info) }
  render() { return this.state.failed ? <div className="fallback" role="status"><strong>Interactive renderer unavailable.</strong><p>The engineering case study remains fully accessible below.</p></div> : this.props.children }
}
