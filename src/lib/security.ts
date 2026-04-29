export const referrerPolicy = "strict-origin-when-cross-origin";

export function contentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-src https://www.youtube.com https://*.youtube.com https://www.youtube-nocookie.com https://*.youtube-nocookie.com",
    "script-src 'self' 'unsafe-inline' https://www.youtube.com https://*.youtube.com https://s.ytimg.com https://*.ytimg.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://i.ytimg.com https://*.ytimg.com https://*.youtube.com https://*.googleusercontent.com https://cdn.discordapp.com",
    "connect-src 'self' https://www.youtube.com https://*.youtube.com https://*.googlevideo.com https://*.ytimg.com",
    "form-action 'self' https://discord.com",
    "media-src https://*.googlevideo.com blob:",
    "font-src 'self' data:",
  ].join("; ");
}
