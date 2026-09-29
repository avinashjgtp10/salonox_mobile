import { BRAND_NAME } from "./seo.config";

export function NotFoundPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#111827" }}>Page not found</h1>
        <p style={{ margin: "12px 0 24px", color: "#6b7280" }}>
          The page you are looking for does not exist or has moved.
        </p>
        <a href="/" className="btn btn-dark">{`Go to the ${BRAND_NAME} home page`}</a>
      </div>
    </main>
  );
}
