import type { Metadata } from "next";
import { codeKey, isValidCode } from "@/lib/discord-link/codes";
import { kv } from "@/lib/discord-link/kv";
import type { LinkRecord } from "@/lib/discord-link/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Link Discord | OG Dark RP",
  description: "Verify your Discord membership and claim your in-game reward.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams?: Promise<{
    code?: string;
    serverSaveId?: string;
    status?: string;
    error?: string;
  }>;
}

const DISCORD_INVITE = "https://discord.gg/b2ursP823g";
// Keep in sync with `drp.discord_link_reward_amount` (default 12000) on the
// gamemode side. If the in-game reward changes, update this value too.
const REWARD_DISPLAY = "$12,000";

export default async function LinkDiscordPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const code = typeof params.code === "string" ? params.code : "";
  const serverSaveId =
    typeof params.serverSaveId === "string" ? params.serverSaveId : "";
  const explicitStatus = typeof params.status === "string" ? params.status : "";
  const explicitError = typeof params.error === "string" ? params.error : "";

  let view: ViewState;
  if (explicitStatus) {
    view = mapStatusOverride(explicitStatus, code, serverSaveId);
  } else if (explicitError) {
    view = { kind: "error", title: "Something went wrong", reason: explicitError };
  } else if (!code || !isValidCode(code)) {
    view = {
      kind: "error",
      title: "Missing pairing code",
      reason: "no_code",
    };
  } else {
    const lookup = await kv.get<LinkRecord>(codeKey(serverSaveId, code));
    if (!lookup.ok) {
      view = { kind: "error", title: "Service unavailable", reason: "kv_unavailable" };
    } else if (!lookup.value) {
      view = { kind: "error", title: "Code not found", reason: "not_found" };
    } else if (lookup.value.expiresAt < Date.now()) {
      view = { kind: "error", title: "Code expired", reason: "expired" };
    } else if (lookup.value.status === "verified") {
      view = {
        kind: "verified",
        rewardEligible: lookup.value.rewardEligible ?? false,
        discordUsername: lookup.value.discordUsername ?? "",
      };
    } else {
      view = {
        kind: "pending",
        code,
        serverSaveId,
        displayName: lookup.value.displayName,
      };
    }
  }

  return <LinkDiscordView view={view} />;
}

interface PendingView {
  kind: "pending";
  code: string;
  serverSaveId: string;
  displayName: string;
}
interface VerifiedView {
  kind: "verified";
  rewardEligible: boolean;
  discordUsername: string;
}
interface ErrorView {
  kind: "error";
  title: string;
  reason: string;
}
type ViewState = PendingView | VerifiedView | ErrorView;

function mapStatusOverride(
  status: string,
  code: string,
  serverSaveId: string,
): ViewState {
  switch (status) {
    case "verified":
      return { kind: "verified", rewardEligible: true, discordUsername: "" };
    case "verified_no_reward":
      return { kind: "verified", rewardEligible: false, discordUsername: "" };
    case "not_in_guild":
      return {
        kind: "error",
        title: "Join the Discord server first",
        reason: "not_in_guild",
      };
    case "expired":
      return { kind: "error", title: "Code expired", reason: "expired" };
    case "already_used":
      return { kind: "error", title: "Code already used", reason: "already_used" };
    case "invalid_state":
      return {
        kind: "error",
        title: "Invalid request",
        reason: "invalid_state",
      };
    case "discord_denied":
      return {
        kind: "error",
        title: "Authorization cancelled",
        reason: "discord_denied",
      };
    default:
      return {
        kind: "pending",
        code,
        serverSaveId,
        displayName: "",
      };
  }
}

const ERROR_BLURBS: Record<string, string> = {
  no_code: "Run /linkdiscord in the game to get a fresh pairing link.",
  not_found: "We couldn't find that pairing code. Run /linkdiscord again in the game.",
  expired: "Pairing codes are good for 15 minutes. Run /linkdiscord in the game for a new one.",
  already_used: "This pairing code has already been used. Run /linkdiscord again in the game.",
  invalid_state: "The verification request was tampered with or expired. Run /linkdiscord in the game for a new one.",
  invalid_code: "The pairing code looks malformed. Run /linkdiscord in the game for a new one.",
  kv_unavailable: "Our reward database is temporarily unreachable. Try again in a minute.",
  server_misconfigured: "The reward service isn't configured. Ping a server admin in Discord.",
  token_exchange_failed: "Discord rejected the auth code. Try /linkdiscord again.",
  discord_invalid_client: "Discord rejected the app credentials (DISCORD_CLIENT_SECRET on Vercel doesn't match the Discord developer portal). Ping a server admin.",
  discord_invalid_grant: "Discord rejected the auth code (already used, or redirect_uri mismatch). Run /linkdiscord again.",
  discord_invalid_request: "Discord rejected the OAuth request shape. Ping a server admin — the redirect URI registered in the developer portal probably doesn't match DISCORD_REDIRECT_URI.",
  discord_invalid_redirect_uri: "DISCORD_REDIRECT_URI doesn't match what's registered in the Discord developer portal. Ping a server admin.",
  discord_unauthorized_client: "The Discord app is not authorized for this OAuth grant. Ping a server admin.",
  discord_user_failed: "We couldn't read your Discord profile. Try /linkdiscord again.",
  discord_guilds_failed: "We couldn't read your Discord server list. Try /linkdiscord again.",
  not_in_guild: "You need to be in our Discord server before linking.",
  discord_denied: "You declined the Discord authorization.",
};

function LinkDiscordView({ view }: { view: ViewState }) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at top, #1a0d0d 0%, #0b0606 60%, #050202 100%)",
        color: "#f5e7e7",
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          padding: "2rem 1.75rem",
          borderRadius: 18,
          background: "rgba(20, 8, 8, 0.85)",
          border: "1px solid rgba(255, 77, 77, 0.35)",
          boxShadow: "0 30px 80px -20px rgba(255, 77, 77, 0.35)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#ff8a8a",
            marginBottom: 8,
          }}
        >
          OG Dark RP · Discord Link
        </div>

        {view.kind === "pending" && <PendingPanel view={view} />}
        {view.kind === "verified" && <VerifiedPanel view={view} />}
        {view.kind === "error" && <ErrorPanel view={view} />}
      </div>
    </main>
  );
}

function PendingPanel({ view }: { view: PendingView }) {
  const startUrl = buildStartUrl(view.code, view.serverSaveId);
  return (
    <>
      <h1 style={{ fontSize: 28, margin: "0 0 12px", color: "#fff" }}>
        Link your Discord
      </h1>
      <p style={{ lineHeight: 1.55, margin: "0 0 16px" }}>
        Click the button below. Discord will ask you to authorize{" "}
        <strong>OG Dark RP Link</strong> with the <em>identify</em> and{" "}
        <em>servers</em> scopes only — we never read messages or post on your
        behalf.
      </p>
      <p style={{ lineHeight: 1.55, margin: "0 0 24px", color: "#cab" }}>
        After Discord redirects you back here, you can close the tab and switch
        back to the game. Your <strong>+{REWARD_DISPLAY}</strong> reward will arrive
        automatically.
      </p>
      <a
        href={startUrl}
        style={{
          display: "block",
          textAlign: "center",
          textDecoration: "none",
          padding: "14px 18px",
          borderRadius: 12,
          background: "#5865F2",
          color: "#fff",
          fontWeight: 700,
          letterSpacing: "0.02em",
        }}
      >
        Authorize with Discord
      </a>
      <p style={{ marginTop: 18, fontSize: 12, color: "#a99" }}>
        Not in our Discord yet?{" "}
        <a href={DISCORD_INVITE} style={{ color: "#ffb3b3" }}>
          Join here first
        </a>
        , then come back and click the button above.
      </p>
    </>
  );
}

function VerifiedPanel({ view }: { view: VerifiedView }) {
  return (
    <>
      <h1 style={{ fontSize: 28, margin: "0 0 12px", color: "#9bf3a8" }}>
        {view.rewardEligible ? "Reward unlocked!" : "Linked"}
      </h1>
      <p style={{ lineHeight: 1.55, margin: "0 0 16px" }}>
        {view.rewardEligible
          ? `Your Discord is now linked to your OG Dark RP character. The ${REWARD_DISPLAY} reward will hit your wallet within a few seconds. Switch back to the game.`
          : `Your Discord is linked, but this Discord account already claimed the +${REWARD_DISPLAY} reward on a previous Steam account, so no extra cash this time. You can return to the game.`}
      </p>
      <p style={{ fontSize: 12, color: "#a99" }}>
        You can close this tab.
      </p>
    </>
  );
}

function ErrorPanel({ view }: { view: ErrorView }) {
  const blurb = ERROR_BLURBS[view.reason] ?? "Try /linkdiscord again in the game.";
  return (
    <>
      <h1 style={{ fontSize: 26, margin: "0 0 12px", color: "#ff8a8a" }}>
        {view.title}
      </h1>
      <p style={{ lineHeight: 1.55, margin: "0 0 16px" }}>{blurb}</p>
      {view.reason === "not_in_guild" && (
        <a
          href={DISCORD_INVITE}
          style={{
            display: "block",
            textAlign: "center",
            textDecoration: "none",
            padding: "12px 16px",
            borderRadius: 12,
            background: "#5865F2",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          Join the Discord server
        </a>
      )}
    </>
  );
}

function buildStartUrl(code: string, serverSaveId: string): string {
  const params = new URLSearchParams({ code });
  if (serverSaveId) params.set("serverSaveId", serverSaveId);
  return `/api/link-discord/oauth/start?${params.toString()}`;
}
