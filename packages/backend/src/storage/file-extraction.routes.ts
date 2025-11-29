/**
 * File Extraction Routes
 * Handles file upload and text extraction
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate } from '../auth/auth.middleware';
import { extractTextFromFile } from './file-extraction.service';
import { logger } from '../utils/logger';

const router = Router();

// Configure multer for file uploads (50MB max)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/pdf',
      'text/plain',
      'application/epub+zip',
    ];
    
    const allowedExtensions = ['.docx', '.pdf', '.txt', '.epub'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (
      allowedMimes.includes(file.mimetype) ||
      allowedExtensions.includes(fileExtension)
    ) {
      cb(null, true);
    } else {
      cb(new Error(`File type not supported. Allowed: ${allowedExtensions.join(', ')}`));
    }
  },
});

/**
 * POST /storage/files/extract
 * Extract text content from uploaded file
 */
router.post(
  '/extract',
  authenticate,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
        return;
      }

      const { buffer, originalname, mimetype } = req.file;

      logger.info('Extracting text from file', {
        filename: originalname,
        size: buffer.length,
        mimeType: mimetype,
      });

      const result = await extractTextFromFile(buffer, originalname, mimetype);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('File extraction error:', error);
      
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
      
      next(error);
    }
  }
);

export default router;

