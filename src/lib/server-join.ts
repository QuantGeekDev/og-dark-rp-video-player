export const sboxPackageUrl = "https://sbox.game/artisan/darkrpog";
export const joinServerPath = "/join-server";
export const joinServerUrl = "https://ogdarkrp.com/join-server";
export const serverSteamId = "90285151248296973";
export const serverConsoleCommand = `connect ${serverSteamId}`;

const defaultSteamJoinUrl =
  `steam://run/590830//+connect%20${serverSteamId}/`;

export function getSteamJoinUrl(): string {
  return process.env.NEXT_PUBLIC_OG_DARKRP_JOIN_URL?.trim() || defaultSteamJoinUrl;
}
