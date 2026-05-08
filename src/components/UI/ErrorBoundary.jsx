import { Component } from 'react'

/**
 * ErrorBoundary — catches React render errors and shows a fallback UI.
 * Prevents a single broken component from crashing the entire dashboard.
 * 
 * Usage: <ErrorBoundary><MyComponent /></ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error.message, errorInfo?.componentStack?.slice(0, 300))
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 48, textAlign: 'center', background: '#FEE8E7', borderRadius: 12, margin: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#E10600', marginBottom: 8 }}>Une erreur est survenue</div>
          <p style={{ fontSize: 14, color: '#666666', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            Ce module a rencontré un problème. Vos données sont en sécurité.
          </p>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            style={{ background: '#000091', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>
            Réessayer
          </button>
          {this.props.showDetails && this.state.error && (
            <pre style={{ marginTop: 16, padding: 12, background: '#F5F5F5', borderRadius: 8, fontSize: 12, color: '#666', textAlign: 'left', overflow: 'auto', maxHeight: 120 }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
