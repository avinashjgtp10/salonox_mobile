// Shared empty-state shell for Branch Owner pages whose content hasn't been
// specified yet. Each of these will very likely become its own dedicated
// file once real content is defined — this just keeps the routes/sidebar
// navigable in the meantime instead of 404ing.
export default function BranchOwnerPlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ padding: "28px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{title}</h1>
      <div style={{
        marginTop: 20, background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 14,
        padding: "60px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13.5,
      }}>
        Content coming soon.
      </div>
    </div>
  );
}
