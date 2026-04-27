export default function NotFound() {
  return (
    <main className="kiosk">
      <section className="status status-error">
        <div className="status-title">No Signal</div>
        <div className="status-detail">Unknown kiosk route.</div>
      </section>
    </main>
  );
}
