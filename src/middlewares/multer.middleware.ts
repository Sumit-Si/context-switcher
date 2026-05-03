import { Request } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// Resolve upload directory from project root so it works in both src and dist
const uploadDir = path.resolve(process.cwd(), "public", "temp");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Use only the extension from originalname — never the full name
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${uniqueSuffix}${ext}`; // e.g., "1234567890-123456789.jpg"
    cb(null, safeName);
  },
});

// File filter for images
const imageFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (file.mimetype && allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed. Accepted: jpg, png, webp"));
  }
};

export const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 4 * 1024 * 1024,  // 4MB limit
    files: 1,
  },
});