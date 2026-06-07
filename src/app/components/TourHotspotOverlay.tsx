/**
 * Overlay for tour hotspots using xPercent/yPercent (no pitch/yaw).
 * Supports targetType: table, room, seat_zone — maps targetId to table/room/seat for selection.
 */

import type { Table, Room, Seat } from '../services/api';

export interface TourHotspotItem {
  _id: string;
  label: string;
  targetType: 'table' | 'room' | 'seat_zone' | 'info';
  targetId: string;
  xPercent: number;
  yPercent: number;
  tooltipText?: string;
  isActive?: boolean;
}

type Props = {
  hotspots: TourHotspotItem[];
  tables?: Table[];
  rooms?: Room[];
  seats?: Seat[];
  onTableSelect?: (table: Table) => void;
  onRoomSelect?: (room: Room) => void;
  onSeatSelect?: (seat: Seat) => void;
  selectedTableId?: string;
  selectedRoomId?: string;
  selectedSeatId?: string;
  className?: string;
};

export function TourHotspotOverlay({
  hotspots,
  tables = [],
  rooms = [],
  seats = [],
  onTableSelect,
  onRoomSelect,
  onSeatSelect,
  selectedTableId,
  selectedRoomId,
  selectedSeatId,
  className = '',
}: Props) {
  const tableMap = new Map(tables.map((t) => [t._id, t]));
  const roomMap = new Map(rooms.map((r) => [r._id, r]));
  const seatMap = new Map(seats.map((s) => [s._id, s]));

  return (
    <div
      className={`absolute inset-0 pointer-events-auto ${className}`}
      style={{ minHeight: 430 }}
      aria-label="Points de sélection"
    >
      {hotspots.filter((h) => h.isActive !== false).map((h) => {
        let label = h.label;
        let disabled = false;
        let onClick: (() => void) | undefined;
        let isSelected = false;

        if (h.targetType === 'table') {
          const table = tableMap.get(h.targetId);
          if (!table) return null;
          disabled = table.status === 'reserved';
          isSelected = selectedTableId === table._id;
          label = String((table as any).tableNumber ?? label);
          onClick = () => !disabled && onTableSelect?.(table);
        } else if (h.targetType === 'room') {
          const room = roomMap.get(h.targetId);
          if (!room) return null;
          disabled = (room as any).status === 'reserved';
          isSelected = selectedRoomId === room._id;
          label = String((room as any).roomNumber ?? label);
          onClick = () => !disabled && onRoomSelect?.(room);
        } else if (h.targetType === 'seat_zone' || h.targetType === 'seat') {
          const seat = seatMap.get(h.targetId);
          if (!seat) return null;
          disabled = (seat as any).status === 'reserved';
          isSelected = selectedSeatId === seat._id;
          label = String((seat as any).seatNumber ?? (seat as any).zone ?? label);
          onClick = () => !disabled && onSeatSelect?.(seat);
        } else {
          onClick = undefined;
        }

        const x = Math.max(2, Math.min(98, h.xPercent));
        const y = Math.max(2, Math.min(98, h.yPercent));

        return (
          <button
            key={h._id}
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`absolute w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all
              ${disabled ? 'bg-gray-600/80 text-gray-300 cursor-not-allowed' : 'bg-landing-gold text-[#161616] hover:scale-110 cursor-pointer'}
              ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110' : ''}`}
            style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
            title={h.tooltipText || (disabled ? 'Réservé' : h.label)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
