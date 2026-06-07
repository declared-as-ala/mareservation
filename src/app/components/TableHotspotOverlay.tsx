/**
 * Overlay of numbered table points above 360° iframe.
 * Positions derived from TableHotspot pitch/yaw (radians).
 * Equirectangular: x = (yaw + PI) / (2*PI), y = (PI/2 - pitch) / PI
 */

import type { Table } from '../services/api';

export interface HotspotWithTable {
  _id: string;
  tableId: string | Table;
  pitch: number;
  yaw: number;
  sceneId?: string;
}

type Props = {
  hotspots: HotspotWithTable[];
  tables: Table[];
  onTableSelect: (table: Table) => void;
  selectedTableId?: string;
  className?: string;
};

export function TableHotspotOverlay({ hotspots, tables, onTableSelect, selectedTableId, className = '' }: Props) {
  const tableMap = new Map(tables.map((t) => [t._id, t]));

  return (
    <div
      className={`absolute inset-0 pointer-events-auto ${className}`}
      style={{ minHeight: 430 }}
      aria-label="Points de sélection des tables"
    >
      {hotspots.map((h) => {
        const table = typeof h.tableId === 'object' ? h.tableId : tableMap.get(h.tableId);
        if (!table) return null;
        const isReserved = table.status === 'reserved';
        const isSelected = selectedTableId === table._id;
        // Equirectangular: x 0-1, y 0-1. yaw -PI..PI, pitch -PI/2..PI/2
        const x = ((h.yaw + Math.PI) / (2 * Math.PI)) * 100;
        const y = ((Math.PI / 2 - h.pitch) / Math.PI) * 100;
        return (
          <button
            key={h._id}
            type="button"
            onClick={() => !isReserved && onTableSelect(table)}
            disabled={isReserved}
            className={`absolute w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all
              ${isReserved ? 'bg-gray-600/80 text-gray-300 cursor-not-allowed' : 'bg-landing-gold text-[#161616] hover:scale-110 cursor-pointer'}
              ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110' : ''}`}
            style={{ left: `${Math.max(2, Math.min(98, x))}%`, top: `${Math.max(2, Math.min(98, y))}%`, transform: 'translate(-50%, -50%)' }}
            title={isReserved ? 'Réservée' : `Table ${table.tableNumber} — ${table.locationLabel}`}
          >
            {table.tableNumber}
          </button>
        );
      })}
    </div>
  );
}
