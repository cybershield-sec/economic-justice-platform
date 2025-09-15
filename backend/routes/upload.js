const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../utils/database');

const router = express.Router();

// Create media directories if they don't exist
const mediaBase = process.env.MEDIA_BASE_DIR || '/home/cybersage/Revolution/economic-justice-platform/media';
const uploadsDir = path.join(mediaBase, 'uploads');
const processedDir = path.join(mediaBase, 'processed');

[mediaBase, uploadsDir, processedDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for disk storage with optimized NVMe performance
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fileType = file.mimetype.split('/')[0];
    const typeDir = path.join(uploadsDir, fileType);

    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }

    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit (optimized for NVMe SSD)
    files: 5 // Maximum 5 files per request
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf', 'text/plain', 'application/json'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`), false);
    }
  }
});

// Handle single file upload
router.post('/single', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.userId;
    const fileType = req.file.mimetype.split('/')[0];
    const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);

    // Store file metadata in database
    const result = await pool.query(`
      INSERT INTO uploaded_files (
        user_id, original_name, stored_name, file_path,
        mime_type, file_type, size_bytes, size_mb
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      userId,
      req.file.originalname,
      req.file.filename,
      req.file.path,
      req.file.mimetype,
      fileType,
      req.file.size,
      fileSizeMB
    ]);

    const fileRecord = result.rows[0];
    const publicUrl = `/media/${fileType}/${req.file.filename}`;

    res.json({
      success: true,
      file: {
        id: fileRecord.id,
        originalName: fileRecord.original_name,
        storedName: fileRecord.stored_name,
        mimeType: fileRecord.mime_type,
        fileType: fileRecord.file_type,
        sizeBytes: fileRecord.size_bytes,
        sizeMB: fileRecord.size_mb,
        uploadedAt: fileRecord.created_at,
        url: publicUrl
      },
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle multiple file upload
router.post('/multiple', authenticateToken, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const userId = req.user.userId;
    const uploadedFiles = [];

    for (const file of req.files) {
      const fileType = file.mimetype.split('/')[0];
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

      const result = await pool.query(`
        INSERT INTO uploaded_files (
          user_id, original_name, stored_name, file_path,
          mime_type, file_type, size_bytes, size_mb
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        userId,
        file.originalname,
        file.filename,
        file.path,
        file.mimetype,
        fileType,
        file.size,
        fileSizeMB
      ]);

      const fileRecord = result.rows[0];
      const publicUrl = `/media/${fileType}/${file.filename}`;

      uploadedFiles.push({
        id: fileRecord.id,
        originalName: fileRecord.original_name,
        storedName: fileRecord.stored_name,
        mimeType: fileRecord.mime_type,
        fileType: fileRecord.file_type,
        sizeBytes: fileRecord.size_bytes,
        sizeMB: fileRecord.size_mb,
        uploadedAt: fileRecord.created_at,
        url: publicUrl
      });
    }

    res.json({
      success: true,
      files: uploadedFiles,
      total: uploadedFiles.length,
      message: 'Files uploaded successfully'
    });
  } catch (error) {
    console.error('Multiple file upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's uploaded files
router.get('/my-files', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT * FROM uploaded_files
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM uploaded_files WHERE user_id = $1',
      [userId]
    );

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    const files = result.rows.map(file => ({
      ...file,
      url: `/media/${file.file_type}/${file.stored_name}`
    }));

    res.json({
      files,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete file
router.delete('/:fileId', authenticateToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    const userId = req.user.userId;

    // Get file info
    const fileResult = await pool.query(
      'SELECT * FROM uploaded_files WHERE id = $1 AND user_id = $2',
      [fileId, userId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.rows[0];

    // Delete physical file
    try {
      if (fs.existsSync(file.file_path)) {
        fs.unlinkSync(file.file_path);
      }
    } catch (fsError) {
      console.warn('Could not delete physical file:', fsError.message);
    }

    // Delete database record
    await pool.query('DELETE FROM uploaded_files WHERE id = $1', [fileId]);

    res.json({
      success: true,
      message: 'File deleted successfully',
      deletedFile: file.original_name
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 100MB)' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files (max 5 per request)' });
    }
  }
  res.status(400).json({ error: error.message });
});

module.exports = router;