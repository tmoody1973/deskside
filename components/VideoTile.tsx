"use client";

import Image from "next/image";
import Link from "next/link";
import { GenreBadge } from "./GenreBadge";

interface VideoTileProps {
  youtubeId: string;
  artist: string;
  songTitle: string;
  thumbnailUrl: string;
  primaryGenre: string;
}

export function VideoTile({
  youtubeId,
  artist,
  songTitle,
  thumbnailUrl,
  primaryGenre,
}: VideoTileProps) {
  return (
    <Link
      href={`/watch/${youtubeId}`}
      className="group block border-[3px] border-border shadow-retro bg-bg-surface transition-all duration-200 ease-retro hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-retro-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={thumbnailUrl}
          alt={`${artist} concert thumbnail`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          className="object-cover"
        />
        {/* Genre badge floats bottom-left of thumbnail */}
        <div className="absolute bottom-2 left-2">
          <GenreBadge genre={primaryGenre} />
        </div>
      </div>

      {/* Card content */}
      <div className="p-4">
        <p className="font-sans font-bold text-text-primary text-sm leading-tight truncate">
          {artist}
        </p>
        {songTitle && (
          <p className="font-sans text-text-secondary text-xs mt-1 truncate">
            {songTitle}
          </p>
        )}
      </div>
    </Link>
  );
}
