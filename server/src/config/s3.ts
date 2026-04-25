import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadsRoot = path.join(process.cwd(), 'uploads');
const publicBaseUrl = (process.env.PUBLIC_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

const ensureDirectory = (dirPath: string) => {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
};

const createStorage = (folder: string) => multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, ensureDirectory(path.join(uploadsRoot, folder)));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const fileFilter = (allowedMimeTypes: string[], errorMessage: string) => (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error(errorMessage));
};

export const buildLocalFileUrl = (filePath: string): string => {
  const relativePath = path.relative(uploadsRoot, filePath).replace(/\\/g, '/');
  return `${publicBaseUrl}/uploads/${relativePath}`;
};

export const upload = multer({
  storage: createStorage('vendors'),
  fileFilter: fileFilter(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], 'Only PDF, JPEG, PNG or WEBP files are allowed'),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadInvoicePdf = multer({
  storage: createStorage('invoices'),
  fileFilter: fileFilter(['application/pdf'], 'Only PDF files are allowed for invoice upload'),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadContractPdf = multer({
  storage: createStorage('contracts'),
  fileFilter: fileFilter(['application/pdf'], 'Only PDF files are allowed for contract upload'),
  limits: { fileSize: 10 * 1024 * 1024 },
});
