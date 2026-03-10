/**
 * View-only media player backed by wavesurfer.js.
 *
 * Renders a waveform visualization for audio files, or a video element
 * with a synced waveform below it for video files. Provides playback
 * controls including play/pause, time display, and rate selection.
 *
 * @module
 */

'use client';

import * as React from 'react';
import { Pause, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type WaveSurfer from 'wavesurfer.js';

/**
 * Handle exposed by MediaPlayer via React.forwardRef/useImperativeHandle.
 */
interface MediaPlayerHandle {
  /** Seek to a specific time in seconds. */
  seekTo: (time: number) => void;
}

interface MediaPlayerProps {
  /** URL of the audio or video media file. */
  mediaUrl: string;
  /** MIME type of the media (e.g., "audio/wav", "video/mp4"). */
  mimeType?: string;
  /** Called on each animation frame during playback with the current time in seconds. */
  onTimeUpdate?: (currentTime: number) => void;
  /** Called when the media finishes loading with the total duration in seconds. */
  onReady?: (duration: number) => void;
}

const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;

/**
 * Formats a time value in seconds to a "m:ss.s" string.
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
}

/**
 * Determines whether a MIME type represents video.
 */
function isVideoMimeType(mimeType?: string): boolean {
  return mimeType?.startsWith('video/') ?? false;
}

/**
 * Waveform-based media player component.
 *
 * For audio, renders a clickable waveform with playback controls.
 * For video, renders an HTML5 video element above the waveform, with
 * wavesurfer synced to the video's playback position.
 *
 * Exposes a `seekTo(time)` method via ref for external seeking (e.g.,
 * from a tier timeline).
 */
const MediaPlayer = React.forwardRef<MediaPlayerHandle, MediaPlayerProps>(function MediaPlayer(
  { mediaUrl, mimeType, onTimeUpdate, onReady },
  ref,
): React.JSX.Element {
  const waveformRef = React.useRef<HTMLDivElement>(null);
  const wavesurferRef = React.useRef<WaveSurfer | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);

  const isVideo = isVideoMimeType(mimeType);

  React.useImperativeHandle(ref, () => ({
    seekTo(time: number) {
      const ws = wavesurferRef.current;
      if (!ws) return;
      const dur = ws.getDuration();
      if (dur <= 0) return;
      ws.seekTo(Math.max(0, Math.min(1, time / dur)));
    },
  }));

  // Stable callback refs to avoid re-creating the wavesurfer instance
  const onTimeUpdateRef = React.useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onReadyRef = React.useRef(onReady);
  onReadyRef.current = onReady;

  React.useEffect(() => {
    if (!waveformRef.current) return;

    let ws: WaveSurfer | null = null;
    let destroyed = false;

    async function init(): Promise<void> {
      const WaveSurferModule = (await import('wavesurfer.js')).default;
      if (destroyed) return;

      const options: Record<string, unknown> = {
        container: waveformRef.current!,
        height: 64,
        waveColor: 'oklch(0.6 0.05 260)',
        progressColor: 'oklch(0.5 0.15 260)',
        cursorColor: 'oklch(0.45 0.2 15)',
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        normalize: true,
        interact: true,
      };

      if (isVideo && videoRef.current) {
        options.media = videoRef.current;
      } else {
        options.url = mediaUrl;
      }

      ws = WaveSurferModule.create(options as Parameters<typeof WaveSurferModule.create>[0]);
      wavesurferRef.current = ws;

      ws.on('ready', () => {
        if (destroyed) return;
        const dur = ws!.getDuration();
        setDuration(dur);
        setIsLoading(false);
        onReadyRef.current?.(dur);
      });

      ws.on('play', () => {
        if (destroyed) return;
        setIsPlaying(true);
      });

      ws.on('pause', () => {
        if (destroyed) return;
        setIsPlaying(false);
      });

      ws.on('timeupdate', (time: number) => {
        if (destroyed) return;
        setCurrentTime(time);
        onTimeUpdateRef.current?.(time);
      });

      ws.on('finish', () => {
        if (destroyed) return;
        setIsPlaying(false);
      });
    }

    init();

    return () => {
      destroyed = true;
      if (ws) {
        ws.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [mediaUrl, isVideo]);

  const handlePlayPause = React.useCallback(() => {
    wavesurferRef.current?.playPause();
  }, []);

  const handleRateChange = React.useCallback((rate: number) => {
    setPlaybackRate(rate);
    wavesurferRef.current?.setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {/* Video element (rendered only for video MIME types) */}
      {isVideo ? (
        <video
          ref={videoRef}
          src={mediaUrl}
          className="w-full max-h-64 rounded-md bg-black"
          playsInline
          preload="metadata"
        />
      ) : null}

      {/* Waveform container */}
      <div className="relative">
        {isLoading ? (
          <div className="flex h-16 items-center justify-center rounded-md bg-muted/50">
            <span className="text-xs text-muted-foreground">Loading waveform...</span>
          </div>
        ) : null}
        <div
          ref={waveformRef}
          className={cn('w-full cursor-pointer rounded-md', isLoading && 'invisible absolute')}
        />
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={handlePlayPause}
          disabled={isLoading}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </Button>

        <span className="text-xs tabular-nums text-muted-foreground min-w-[7rem]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="flex items-center gap-0.5 ml-auto">
          {PLAYBACK_RATES.map((rate) => (
            <Button
              key={rate}
              variant={playbackRate === rate ? 'secondary' : 'ghost'}
              size="xs"
              onClick={() => handleRateChange(rate)}
              disabled={isLoading}
            >
              {rate}x
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
});

export type { MediaPlayerHandle, MediaPlayerProps };
export { MediaPlayer };
