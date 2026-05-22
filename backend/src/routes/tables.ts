import { Router } from 'express';
import { Table } from '../models/Table';
import { Reservation } from '../models/Reservation';
import { TableBlock } from '../models/TableBlock';

const router = Router();

// GET /api/tables/venue/:venueId — tables for a venue; optional startAt, endAt for availability
router.get('/venue/:venueId', async (req, res) => {
  try {
    const { venueId } = req.params;
    const { startAt, endAt } = req.query;

    const tables = await Table.find({ venueId }).sort({ tableNumber: 1 }).lean();

    if (startAt && endAt) {
      const start = new Date(startAt as string);
      const end = new Date(endAt as string);
      const [overlapping, blocks] = await Promise.all([
        Reservation.find({
          venueId,
          status: { $in: ['PENDING', 'CONFIRMED'] },
          $or: [{ startAt: { $lt: end }, endAt: { $gt: start } }],
        }),
        TableBlock.find({
          venueId,
          isActive: true,
          startsAt: { $lt: end },
          endsAt: { $gt: start },
        }).select('tableId'),
      ]);
      const reservedIds = new Set(
        overlapping.filter((r) => r.tableId != null).map((r) => r.tableId!.toString())
      );
      const blockedIds = new Set(
        blocks.filter((b: any) => b.tableId != null).map((b: any) => String(b.tableId))
      );
      const venueBlocked = blocks.some((b: any) => !b.tableId);
      const withStatus = tables.map((t) => ({
        ...t,
        status: venueBlocked || blockedIds.has((t as any)._id.toString())
          ? 'blocked'
          : reservedIds.has((t as any)._id.toString())
            ? 'reserved'
            : 'available',
      }));
      return res.json(withStatus);
    }

    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

export default router;
