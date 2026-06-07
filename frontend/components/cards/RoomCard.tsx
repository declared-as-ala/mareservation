'use client';

import Link from 'next/link';
import { Bed } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface RoomCardData {
  _id: string;
  roomNumber?: number;
  roomType?: string;
  capacity?: number;
  pricePerNight?: number;
  venueId?: string | { _id: string; name: string; city?: string };
  venueName?: string;
}

interface RoomCardProps {
  room: RoomCardData;
  venueSlugOrId?: string;
  className?: string;
}

export function RoomCard({ room, venueSlugOrId, className }: RoomCardProps) {
  const href = venueSlugOrId ? `/accommodation/${venueSlugOrId}` : '#';
  const venueName =
    room.venueName ?? (typeof room.venueId === 'object' ? room.venueId?.name : undefined);

  return (
    <Link href={href} className={cn('block transition-shadow hover:shadow-lg', className)}>
      <Card className="h-full overflow-hidden bg-zinc-900/60 border-zinc-800 shadow-md hover:border-amber-400/30 transition-all">
        <div className="aspect-[16/10] w-full overflow-hidden bg-zinc-800">
          <div className="flex h-full items-center justify-center text-zinc-600">
            <Bed className="size-12" />
          </div>
        </div>
        <CardHeader className="pb-2">
          <h3 className="font-semibold text-zinc-100">
            Chambre {room.roomNumber ?? room._id}
            {room.roomType ? ` — ${room.roomType}` : ''}
          </h3>
          {venueName && <p className="text-sm text-zinc-400">{venueName}</p>}
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex flex-wrap gap-2">
            {room.capacity != null && (
              <Badge variant="secondary">Jusqu&apos;à {room.capacity} pers.</Badge>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-0 text-sm text-amber-400">
          Voir le lieu &rarr;
        </CardFooter>
      </Card>
    </Link>
  );
}
