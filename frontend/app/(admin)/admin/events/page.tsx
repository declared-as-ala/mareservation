'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminEvents } from '@/lib/api/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ExternalLink } from 'lucide-react';

type AdminEventRow = { _id: string; title: string; type: string; startAt: string; venueId?: { name?: string; _id?: string } };

function EventTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    concert: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    conference: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    workshop: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    exhibition: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  
  const style = styles[type.toLowerCase()] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700';
  
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border ${style}`}>
      {type}
    </span>
  );
}

export default function AdminEventsPage() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: fetchAdminEvents,
  });
  const list = events as AdminEventRow[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Événements</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {list.length} événement{list.length !== 1 ? 's' : ''} au total
          </p>
        </div>
      </div>

      {/* Table */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-4 border-b border-zinc-800">
          <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
            <Calendar className="size-4 text-amber-400" />
            Liste des événements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900/80">
                  <TableHead className="text-zinc-400">Titre</TableHead>
                  <TableHead className="text-zinc-400">Type</TableHead>
                  <TableHead className="text-zinc-400">Date</TableHead>
                  <TableHead className="text-zinc-400">Lieu</TableHead>
                  <TableHead className="text-right text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-zinc-800">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full bg-zinc-800" /></TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <Calendar className="size-12 mb-3" />
              <p className="text-sm font-medium">Aucun événement</p>
              <p className="text-xs mt-1">Les événements créés apparaîtront ici</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900/80">
                  <TableHead className="text-zinc-400">Titre</TableHead>
                  <TableHead className="text-zinc-400">Type</TableHead>
                  <TableHead className="text-zinc-400">Date</TableHead>
                  <TableHead className="text-zinc-400">Lieu</TableHead>
                  <TableHead className="text-right text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((e) => (
                  <TableRow key={e._id} className="border-zinc-800 hover:bg-zinc-800/40 transition-colors duration-150">
                    <TableCell className="font-medium text-zinc-100">{e.title}</TableCell>
                    <TableCell>
                      <EventTypeBadge type={e.type} />
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-zinc-500" />
                        {new Date(e.startAt).toLocaleString('fr-FR', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400">
                      {typeof e.venueId === 'object' ? e.venueId?.name : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                        className="border-zinc-700 bg-zinc-800/50 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100 hover:border-zinc-600 transition-all duration-200"
                      >
                        <Link href={`/admin/events/${e._id}`} className="flex items-center gap-1.5">
                          <ExternalLink className="size-3.5" />
                          Modifier
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
