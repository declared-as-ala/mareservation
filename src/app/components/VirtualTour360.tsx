import { useState, useRef, useEffect, useCallback } from 'react';
import { MousePointer, Info, Maximize2, RotateCw, Users, MapPin, Star, X } from 'lucide-react';
import { Table, TableHotspot } from '../services/api';

interface VirtualTour360Props {
  backgroundImage: string;
  tables: Table[];
  hotspots?: TableHotspot[];
  onTableSelect: (table: Table) => void;
  selectedTableId?: string;
}

export function VirtualTour360({
  backgroundImage,
  tables,
  hotspots = [],
  onTableSelect,
  selectedTableId,
}: VirtualTour360Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredTable, setHoveredTable] = useState<Table | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panX, setPanX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, panX: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, panX });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const container = containerRef.current;
    if (!container) return;
    const deltaX = e.clientX - dragStart.x;
    const maxPan = container.offsetWidth * 3;
    const newPanX = Math.max(-maxPan, Math.min(0, dragStart.panX + deltaX));
    setPanX(newPanX);
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, panX });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const deltaX = e.touches[0].clientX - dragStart.x;
      const container = containerRef.current;
      if (!container) return;
      const maxPan = container.offsetWidth * 3;
      const newPanX = Math.max(-maxPan, Math.min(0, dragStart.panX + deltaX));
      setPanX(newPanX);
      setDragStart({ x: e.touches[0].clientX, panX: dragStart.panX });
    }
  };

  const handleTouchEnd = () => setIsDragging(false);

  const tableById = new Map(tables.map((t) => [t._id, t]));

  type Item = { table: Table; x: number; y: number };
  const items: Item[] = (() => {
    const container = containerRef.current;
    if (!container) return [];
    const W = container.offsetWidth;
    const H = container.offsetHeight;
    const panoWidth = 4 * W;

    if (hotspots.length > 0) {
      return hotspots
        .map((h) => {
          const table = typeof h.tableId === 'object' ? h.tableId : tableById.get(h.tableId as string);
          if (!table) return null;
          const xPano = ((h.yaw + Math.PI) / (2 * Math.PI)) * panoWidth;
          const x = xPano + panX;
          const y = (0.5 - h.pitch / Math.PI) * H;
          return { table, x, y };
        })
        .filter((x): x is Item => x != null);
    }

    return tables.map((table) => {
      const coords = (table as any).coordinates || { x: 50, y: 50 };
      const panPercent = (Math.abs(panX) / (W * 3)) * 100;
      const adjustedX = (coords.x + panPercent) % 100;
      return {
        table,
        x: (adjustedX / 100) * W,
        y: (coords.y / 100) * H,
      };
    });
  })();

  const isPointNear = (clientX: number, clientY: number, item: Item, threshold = 40) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return false;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const d = Math.sqrt((x - item.x) ** 2 + (y - item.y) ** 2);
    return d < threshold;
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    for (const item of items) {
      if (item.table.status === 'reserved') continue;
      if (isPointNear(e.clientX, e.clientY, item)) {
        onTableSelect(item.table);
        return;
      }
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (isDragging) return;
    let found: Table | null = null;
    for (const item of items) {
      if (isPointNear(e.clientX, e.clientY, item)) {
        found = item.table;
        break;
      }
    }
    setHoveredTable(found);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!isFullscreen && container.requestFullscreen) container.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onClick={handleContainerClick}
      onMouseMove={handleContainerMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `translateX(${panX}px)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          willChange: 'transform',
        }}
      >
        <img
          src={backgroundImage}
          alt="Vue 360° du lieu"
          className="h-full object-cover"
          draggable={false}
          style={{ width: '400%', height: '100%', display: 'block' }}
          onLoad={() => setImageLoaded(true)}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />

      {imageLoaded && items.map(({ table, x, y }) => {
        const tableId = table._id;
        const hoveredId = hoveredTable?._id;
        const isVip = !!table.isVip;
        const isReserved = table.status === 'reserved';
        const isSelected = selectedTableId === tableId;
        const isHovered = hoveredId === tableId;

        return (
          <div
            key={tableId}
            className="absolute pointer-events-auto cursor-pointer z-10"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            onMouseEnter={() => setHoveredTable(table)}
            onMouseLeave={() => hoveredId === tableId && setHoveredTable(null)}
            onClick={(e) => {
              e.stopPropagation();
              if (!isReserved) onTableSelect(table);
            }}
          >
            <div className={`relative transition-all duration-300 ${isHovered ? 'scale-150 z-20' : 'scale-100 z-10'} ${isSelected ? 'ring-4 ring-accent ring-offset-2 rounded-full' : ''}`}>
              {!isReserved && <div className="absolute inset-0 rounded-full bg-current animate-ping opacity-30" />}
              <div
                className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 border-2 shadow-lg ${
                  isVip ? 'bg-accent text-accent-foreground border-accent'
                  : isReserved ? 'bg-muted text-muted-foreground border-muted opacity-50 cursor-not-allowed'
                  : 'bg-success text-success-foreground border-success hover:scale-110'
                }`}
              >
                <span className="text-sm font-bold">{table.tableNumber}</span>
                {isVip && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full border-2 border-background flex items-center justify-center">
                    <Star className="w-2.5 h-2.5 fill-current" />
                  </div>
                )}
              </div>
              {isHovered && !isReserved && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-4 py-3 bg-black/95 backdrop-blur-md text-white rounded-xl shadow-2xl z-30 animate-in fade-in slide-in-from-top-2 duration-200 min-w-[220px]">
                  <div className="space-y-2 text-sm">
                    <div className="font-semibold text-lg flex items-center gap-2">
                      Table {table.tableNumber}
                      {isVip && <Star className="w-4 h-4 fill-accent text-accent" />}
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <Users className="w-4 h-4" />
                      <span>{table.capacity} personnes</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <MapPin className="w-4 h-4" />
                      <span>{table.locationLabel}</span>
                    </div>
                    <div className="pt-2 border-t border-white/20">
                      <div className="text-accent font-semibold text-lg">{table.price} TND</div>
                    </div>
                    <div className="text-xs text-white/60 mt-2">Cliquez pour sélectionner</div>
                  </div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-black/95 rotate-45" />
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
        <div className="px-4 py-2 bg-black/60 backdrop-blur-sm text-white rounded-lg flex items-center gap-2 text-sm">
          <MousePointer className="w-4 h-4" />
          <span className="hidden sm:inline">Glissez pour explorer • Cliquez sur une table</span>
          <span className="sm:hidden">Touchez pour explorer</span>
        </div>
      </div>
      <button onClick={toggleFullscreen} className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-sm text-white rounded-lg hover:bg-black/80 transition-colors z-20" aria-label="Plein écran">
        {isFullscreen ? <X className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </button>
      <div className="absolute bottom-4 right-4 px-4 py-3 bg-black/60 backdrop-blur-sm rounded-lg z-20">
        <div className="flex flex-col gap-2 text-white text-sm">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-success animate-pulse" /><span>Disponible</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-accent" /><span>VIP</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-muted opacity-50" /><span>Réservée</span></div>
        </div>
      </div>
      <div className="absolute bottom-4 left-4 px-3 py-2 bg-black/60 backdrop-blur-sm text-white rounded-lg flex items-center gap-2 text-sm z-20">
        <Info className="w-4 h-4" /><span>Vue VR 360° Interactive</span>
      </div>
      {isDragging && (
        <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col items-center gap-2 text-white/60 z-20">
          <RotateCw className="w-5 h-5 animate-spin" /><div className="text-xs">Rotation</div>
        </div>
      )}
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-30">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-4" />
            <p className="text-white">Chargement de la vue 360°...</p>
          </div>
        </div>
      )}
    </div>
  );
}
