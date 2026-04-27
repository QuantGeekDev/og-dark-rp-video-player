import { parseKioskQuery } from "@/lib/kiosk-query";
import YoutubeKioskPlayer from "./YoutubeKioskPlayer";

type YoutubePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function YoutubePage({ searchParams }: YoutubePageProps) {
  const parsed = parseKioskQuery(await searchParams);

  if (!parsed.ok) {
    return (
      <main className="kiosk">
        <section className="status status-error" aria-live="polite">
          <div className="status-title">Unavailable</div>
          <div className="status-detail">{parsed.reason}</div>
        </section>
      </main>
    );
  }

  return <YoutubeKioskPlayer request={parsed} />;
}
