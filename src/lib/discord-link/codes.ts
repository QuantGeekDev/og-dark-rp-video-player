const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function generateCode(rng: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(rng() * ALPHABET.length)];
  }
  return out;
}

const CODE_PATTERN = new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`);

export function isValidCode(s: unknown): s is string {
  return typeof s === "string" && CODE_PATTERN.test(s);
}

export function codeKey(serverSaveId: string, code: string): string {
  return `link:code:${serverSaveId}:${code}`;
}

export function rewardLedgerDiscordKey(discordId: string): string {
  return `link:rewarded:discord:${discordId}`;
}

export function rewardLedgerSteamKey(serverSaveId: string, steamId: string): string {
  return `link:rewarded:steam:${serverSaveId}:${steamId}`;
}

export function rateLimitSteamKey(serverSaveId: string, steamId: string): string {
  return `link:rl:steam:${serverSaveId}:${steamId}`;
}

export function pendingBySteamKey(serverSaveId: string, steamId: string): string {
  return `link:pending:steam:${serverSaveId}:${steamId}`;
}
