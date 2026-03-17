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
    const fileName = `${uniqueSuffix}_${file.originalname}`;

    cb(null, fileName);
  },
});

// File filter for images
const imageFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (file.mimetype && allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
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