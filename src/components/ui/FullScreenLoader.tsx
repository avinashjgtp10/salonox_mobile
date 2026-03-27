export const FullScreenLoader = ({ message }: { message?: string }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(255, 255, 255, 0.8)', zIndex: 9999,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
  }}>
    <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
      <span className="visually-hidden">Loading...</span>
    </div>
    {message && <div className="mt-3 fw-semibold text-dark">{message}</div>}
  </div>
);
