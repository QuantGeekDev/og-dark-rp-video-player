export const sboxPackageUrl = "https://sbox.game/artisan/darkrpog";
export const joinServerPath = "/join-server";
export const joinServerUrl = "https://ogdarkrp.com/join-server";

const defaultSteamJoinUrl =
  "steam://connect/79.155.36.215:27016?appid=590830";

export function getSteamJoinUrl(): string {
  return process.env.NEXT_PUBLIC_OG_DARKRP_JOIN_URL?.trim() || defaultSteamJoinUrl;
}
