/**
 * Compatibility checks after the dependency upgrades
 * (zod 4, nodemailer 10, cloudinary 2 with a custom multer storage engine).
 */
import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import nodemailer from 'nodemailer';
import { z } from 'zod';

// Mock ONLY the network edge of Cloudinary; the storage engine itself is exercised for real.
const uploadStream = vi.fn();
vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload_stream: (opts: unknown, cb: (e: unknown, r?: unknown) => void) => {
        uploadStream(opts);
        const { PassThrough } = require('stream');
        const sink = new PassThrough();
        sink.resume();
        sink.on('end', () =>
          cb(null, { secure_url: 'https://res.cloudinary.test/exploria360/images/x.png', public_id: 'exploria360/images/x', bytes: 4 })
        );
        return sink;
      },
    },
  },
}));

describe('zod 4 validation paths', () => {
  it('password strength reports readable messages', async () => {
    const { validatePasswordStrength } = await import('../src/utils/password.util');
    const weak = validatePasswordStrength('abc');
    expect(weak.valid).toBe(false);
    expect(weak.errors.length).toBeGreaterThan(0);
    expect(weak.errors.every((m) => typeof m === 'string' && m.length > 0)).toBe(true);
    expect(validatePasswordStrength('Str0ng-Passw0rd!x').valid).toBe(true);
  });

  it('validate middleware answers 400 with field errors', async () => {
    const { validate } = await import('../src/middlewares/validate.middleware');
    const app = express();
    app.use(express.json());
    app.post('/t', validate(z.object({ email: z.string().email(), n: z.number().min(1) })), (_req, res) => {
      res.json({ ok: true });
    });
    const bad = await request(app).post('/t').send({ email: 'nope', n: 0 });
    expect(bad.status).toBe(400);
    expect(bad.body.errors).toBeTruthy();
    expect((await request(app).post('/t').send({ email: 'a@b.co', n: 2 })).status).toBe(200);
  });
});

describe('nodemailer 10', () => {
  it('builds and "sends" a message through the JSON transport', async () => {
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const info = await transport.sendMail({
      from: 'Exploria360 <no-reply@exploria360.com>',
      to: 'client@example.com',
      subject: 'Test',
      html: '<p>Bonjour</p>',
      attachments: [{ filename: 'a.txt', content: 'hello' }],
    });
    const msg = JSON.parse(String(info.message));
    expect(msg.subject).toBe('Test');
    expect(msg.to[0].address).toBe('client@example.com');
  });
});

describe('Cloudinary storage engine (replaces multer-storage-cloudinary)', () => {
  async function appWithUpload() {
    const { uploadImage } = await import('../src/middlewares/upload.middleware');
    const app = express();
    app.post('/up', uploadImage, (req, res) => {
      res.json({ path: (req as any).file?.path, filename: (req as any).file?.filename });
    });
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(400).json({ error: err.message });
    });
    return app;
  }

  it('streams an allowed image and exposes the secure URL as req.file.path', async () => {
    const app = await appWithUpload();
    const res = await request(app).post('/up').attach('file', Buffer.from([0x89, 0x50, 0x4e, 0x47]), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.path).toBe('https://res.cloudinary.test/exploria360/images/x.png');
    expect(uploadStream).toHaveBeenCalledWith(
      expect.objectContaining({ folder: 'exploria360/images', resource_type: 'image' })
    );
  });

  it('rejects disallowed file types before anything is uploaded', async () => {
    uploadStream.mockClear();
    const app = await appWithUpload();
    const res = await request(app).post('/up').attach('file', Buffer.from('<?php ?>'), { filename: 'x.php', contentType: 'application/x-php' });
    expect(res.status).toBe(400);
    expect(uploadStream).not.toHaveBeenCalled();
  });
});
