export type LinkStatus =
  | "pending"
  | "verified"
  | "expired"
  | "not_found"
  | "error";

export interface LinkRecord {
  steamId: string;
  serverSaveId: string;
  displayName: string;
  issuedAt: number;
  expiresAt: number;
  status: Exclude<LinkStatus, "expired" | "not_found">;
  discordId?: string;
  discordUsername?: string;
  rewardEligible?: boolean;
  nicknameSyncAllowed?: boolean;
  nicknameSyncBlockedReason?: string;
  error?: string;
}

export interface IssueRequest {
  steamId: string;
  serverSaveId: string;
  displayName: string;
}

export interface IssueResponse {
  code: string;
  verifyUrl: string;
  expiresInSeconds: number;
}

export interface StatusResponse {
  status: LinkStatus;
  discordId?: string;
  discordUsername?: string;
  rewardEligible?: boolean;
  nicknameSyncAllowed?: boolean;
  nicknameSyncBlockedReason?: string;
  error?: string;
}

export interface RewardLedgerEntry {
  firstSteamId: string;
  firstClaimAtUtc: string;
  serverSaveId: string;
}

export type NicknameSyncReason =
  | "linked"
  | "rpname_changed"
  | "join_reconcile"
  | "admin_manual"
  | "admin_force_link";

export interface NicknameSyncRequest {
  serverSaveId: string;
  steamId: string;
  discordId: string;
  displayName: string;
  reason: NicknameSyncReason;
}

export interface NicknameSyncResponse {
  ok: boolean;
  status:
    | "synced"
    | "dry_run"
    | "disabled"
    | "skipped"
    | "forbidden"
    | "not_found"
    | "rate_limited"
    | "bad_request"
    | "server_misconfigured"
    | "discord_error"
    | "nickname_sync_not_allowed";
  appliedNick?: string;
  error?: string;
  retryAfterSeconds?: number;
}

export interface KvOk<T> {
  ok: true;
  value: T;
}

export interface KvErr {
  ok: false;
  error: string;
}

export type KvResult<T> = KvOk<T> | KvErr;

export const PAIRING_TTL_SECONDS = 900;
export const RATE_LIMIT_WINDOW_SECONDS = 60;
export const RATE_LIMIT_MAX_PER_WINDOW = 5;
