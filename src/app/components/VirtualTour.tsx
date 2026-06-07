import { useState } from 'react';
import { MousePointer, Info } from 'lucide-react';
import { Table } from '../services/api';

interface VirtualTourProps {
  backgroundImage: string;
  tables: Table[];
  onTableSelect: (table: Table) => void;
}

export function VirtualTour({ backgroundImage, tables, onTableSelect }: VirtualTourProps) {
  const [hoveredTable, setHoveredTable] = useState<Table | null>(null);

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden">
      {/* Background Image */}
      <img
        src={backgroundImage}
        alt="Vue 360° du lieu"
        className="w-full h-full object-cover"
      />

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />

      {/* Instruction Text */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/60 backdrop-blur-sm text-white rounded-lg flex items-center gap-2">
        <MousePointer className="w-5 h-5" />
        <span className="text-sm">Explorez le lieu en vue 360° et sélectionnez votre table</span>
      </div>

      {/* Interactive Tables */}
      {tables.map((table) => {
        const tableId = table._id || table.id || '';
        const hoveredId = hoveredTable?._id || hoveredTable?.id || '';
        const isVip = (table.price || 0) >= 100;
        const isReserved = table.status === 'reserved';
        const coordinates = table.coordinates || { x: 50, y: 50 };

        return (
          <div
            key={tableId}
            className="absolute cursor-pointer group"
            style={{
              left: `${coordinates.x}%`,
              top: `${coordinates.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onMouseEnter={() => setHoveredTable(table)}
            onMouseLeave={() => setHoveredTable(null)}
            onClick={() => onTableSelect(table)}
          >
            {/* Table Marker */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                isVip
                  ? 'bg-accent text-accent-foreground border-2 border-accent shadow-lg shadow-accent/50'
                  : isReserved
                  ? 'bg-muted text-muted-foreground border-2 border-muted cursor-not-allowed opacity-50'
                  : 'bg-success text-success-foreground border-2 border-success hover:scale-125 hover:shadow-lg'
              }`}
            >
              <span className="text-sm font-bold">{table.number}</span>
            </div>

            {/* Tooltip on Hover */}
            {hoveredId === tableId && !isReserved && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-4 py-3 bg-black/90 backdrop-blur-sm text-white rounded-lg shadow-xl whitespace-nowrap z-10 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1 text-sm">
                <div className="font-medium">Table {table.number}</div>
                <div className="text-white/80">Capacité: {table.capacity} personnes</div>
                <div className="text-white/80">{table.location}</div>
                <div className="text-accent font-medium">{table.price} TND</div>
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-black/90 rotate-45" />
            </div>
            )}
          </div>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-6 right-6 px-4 py-3 bg-black/60 backdrop-blur-sm rounded-lg">
        <div className="flex items-center gap-4 text-white text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-success" />
            <span>Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-accent" />
            <span>VIP</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-muted opacity-50" />
            <span>Réservée</span>
          </div>
        </div>
      </div>

      {/* Info Badge */}
      <div className="absolute top-6 right-6 px-3 py-2 bg-black/60 backdrop-blur-sm text-white rounded-lg flex items-center gap-2 text-sm">
        <Info className="w-4 h-4" />
        <span>Vue immersive 360°</span>
      </div>
    </div>
  );
}
