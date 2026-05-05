export {};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }

  type YouTubePlayerEvent = {
    target: YouTubePlayer;
    data?: number | string;
  };

  type YouTubePlayer = {
    destroy: () => void;
    getVideoData: () => { video_id?: string };
    getCurrentTime: () => number;
    mute: () => void;
    unMute: () => void;
    playVideo: () => void;
    pauseVideo: () => void;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
    setPlaybackRate: (suggestedRate: number) => void;
    stopVideo: () => void;
    setVolume: (volume: number) => void;
    setPlaybackQuality: (suggestedQuality: string) => void;
    getPlaybackQuality: () => string;
  };

  type YouTubeNamespace = {
    Player: new (
      elementId: string,
      options: {
        width: string | number;
        height: string | number;
        videoId: string;
        playerVars: Record<string, string | number>;
        events: {
          onReady: (event: YouTubePlayerEvent) => void;
          onStateChange: (event: YouTubePlayerEvent) => void;
          onError: (event: YouTubePlayerEvent) => void;
          onAutoplayBlocked?: (event: YouTubePlayerEvent) => void;
          onPlaybackQualityChange?: (event: YouTubePlayerEvent) => void;
        };
      },
    ) => YouTubePlayer;
    PlayerState: {
      ENDED: number;
      PLAYING: number;
      BUFFERING: number;
    };
  };
}
