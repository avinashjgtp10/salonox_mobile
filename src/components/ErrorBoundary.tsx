import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          height: "100vh", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: "#f8fafc", padding: 24,
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: "36px 40px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            border: "1px solid #e2e8f0", maxWidth: 480, width: "100%", textAlign: "center",
          }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>Something went wrong</h2>
            <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: 13.5 }}>
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <p style={{ margin: "0 0 24px", color: "#94a3b8", fontSize: 12 }}>
              If this keeps happening, try restarting the dev server.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 28px", background: "#6366f1", color: "#fff", border: "none",
                borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
