export {};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }

  type YouTubePlayerEvent = {
    target: YouTubePlayer;
    data?: number;
  };

  type YouTubePlayer = {
    destroy: () => void;
    getVideoData: () => { video_id?: string };
    getCurrentTime: () => number;
    mute: () => void;
    unMute: () => void;
    playVideo: () => void;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
    stopVideo: () => void;
    setVolume: (volume: number) => void;
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
