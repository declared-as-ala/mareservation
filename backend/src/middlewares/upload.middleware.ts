import multer, { type StorageEngine } from 'multer';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm'];

const UPLOAD_MAX_FILE_SIZE_MB = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB) || 200;

/**
 * Minimal multer storage engine streaming straight to Cloudinary (SDK v2).
 * Replaces the unmaintained `multer-storage-cloudinary` wrapper (pinned to SDK v1,
 * which carries a known argument-injection advisory). Behaviour is unchanged:
 * `req.file.path` is the Cloudinary secure URL.
 */
function cloudinaryStorage(opts: {
  folder: string;
  resourceType: 'image' | 'video';
  allowedFormats: string[];
}): StorageEngine {
  return {
    _handleFile(_req, file, cb) {
      const upload = cloudinary.uploader.upload_stream(
        { folder: opts.folder, resource_type: opts.resourceType, allowed_formats: opts.allowedFormats },
        (error, result) => {
          if (error || !result) return cb(error ?? new Error('Cloudinary upload failed'));
          cb(null, { path: result.secure_url, filename: result.public_id, size: result.bytes });
        }
      );
      file.stream.on('error', (err) => cb(err));
      file.stream.pipe(upload);
    },
    _removeFile(_req, _file, cb) {
      cb(null);
    },
  };
}

const imageStorage = cloudinaryStorage({
  folder: 'exploria360/images',
  resourceType: 'image',
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
});

const videoStorage = cloudinaryStorage({
  folder: 'exploria360/videos',
  resourceType: 'video',
  allowedFormats: ['mp4', 'mov', 'mkv', 'webm'],
});

export const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Type de fichier non autorisé. Utilisez JPEG, PNG, WebP ou GIF.'));
  },
}).single('file');

export const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (VIDEO_MIMES.includes(file.mimetype) || /\.(mp4|mov|mkv|webm)$/i.test(file.originalname))
      return cb(null, true);
    cb(new Error('Type de fichier non autorisé. Utilisez MP4, MOV ou MKV.'));
  },
}).single('file');

/**
 * Returns the Cloudinary secure URL for an uploaded file.
 * The storage engine sets req.file.path to the Cloudinary secure URL.
 * Kept for backward compatibility — prefer req.file.path directly in route handlers.
 */
export function getFileUrl(filePathOrFilename: string, _type?: 'images' | 'videos'): string {
  return filePathOrFilename;
}

export { cloudinary };
