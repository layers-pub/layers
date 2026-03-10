/**
 * Composite view combining a media player with a tier timeline.
 *
 * Manages shared playback state so that the timeline cursor follows
 * the player position, and clicking timeline segments seeks the player.
 *
 * @module
 */

'use client';

import * as React from 'react';

import { Separator } from '@/components/ui/separator';

import type { AnnotationLayerData } from '../annotations/types';

import type { MediaPlayerHandle } from './media-player';
import { MediaPlayer } from './media-player';
import { TierTimeline } from './tier-timeline';

interface MediaExpressionViewProps {
  /** URL of the audio or video media file. */
  mediaUrl: string;
  /** MIME type of the media (e.g., "audio/wav", "video/mp4"). */
  mimeType?: string;
  /** Annotation layers containing tier data to display below the player. */
  tierLayers: AnnotationLayerData[];
}

/**
 * Combined media player and tier timeline for audio/video expressions.
 *
 * The player's time updates drive the timeline cursor position. Clicking
 * a tier segment or empty space in the timeline seeks the player to that time.
 */
function MediaExpressionView({
  mediaUrl,
  mimeType,
  tierLayers,
}: MediaExpressionViewProps): React.JSX.Element {
  const playerRef = React.useRef<MediaPlayerHandle>(null);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);

  const handleTimeUpdate = React.useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleReady = React.useCallback((dur: number) => {
    setDuration(dur);
  }, []);

  const handleSeek = React.useCallback((time: number) => {
    playerRef.current?.seekTo(time);
  }, []);

  return (
    <div className="flex flex-col gap-0">
      <MediaPlayer
        ref={playerRef}
        mediaUrl={mediaUrl}
        mimeType={mimeType}
        onTimeUpdate={handleTimeUpdate}
        onReady={handleReady}
      />

      {tierLayers.length > 0 && duration > 0 ? (
        <>
          <Separator className="my-2" />
          <TierTimeline
            layers={tierLayers}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
          />
        </>
      ) : null}
    </div>
  );
}

export type { MediaExpressionViewProps };
export { MediaExpressionView };
