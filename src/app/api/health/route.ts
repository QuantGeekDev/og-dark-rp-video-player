export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    ok: true,
    service: "darkrp-tv-kiosk",
    version: process.env.NEXT_PUBLIC_BUILD_ID ?? "local",
    time: new Date().toISOString(),
  });
}
