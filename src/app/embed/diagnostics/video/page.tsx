export const metadata = {
  title: "drp-tv:diagnostic:t=0:d=0",
};

export default function VideoDiagnosticPage() {
  return (
    <main className="kiosk">
      <div className="diagnostic-bars" />
      <section className="status" aria-live="polite">
        <div className="status-title">TV Diagnostic</div>
        <div className="status-detail">Color bars are rendering on the web surface.</div>
      </section>
    </main>
  );
}
