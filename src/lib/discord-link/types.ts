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
  error?: string;
}

export interface RewardLedgerEntry {
  firstSteamId: string;
  firstClaimAtUtc: string;
  serverSaveId: string;
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
