const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../utils/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get comments for a story with nested replies
router.get('/story/:storyId', optionalAuth, async (req, res) => {
  try {
    const storyId = parseInt(req.params.storyId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Get main comments (without parent_id)
    const commentsResult = await pool.query(`
      SELECT
        c.id, c.content, c.like_count, c.created_at,
        u.display_name as author_name,
        u.id as author_id,
        COUNT(r.id) as reply_count
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN comments r ON c.id = r.parent_id
      WHERE c.story_id = $1 AND c.parent_id IS NULL
      GROUP BY c.id, u.display_name, u.id
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `, [storyId, limit, offset]);

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM comments WHERE story_id = $1 AND parent_id IS NULL',
      [storyId]
    );

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      commentsResult.rows.map(async (comment) => {
        const repliesResult = await pool.query(`
          SELECT
            r.id, r.content, r.like_count, r.created_at,
            u.display_name as author_name,
            u.id as author_id
          FROM comments r
          LEFT JOIN users u ON r.user_id = u.id
          WHERE r.parent_id = $1
          ORDER BY r.created_at ASC
          LIMIT 10
        `, [comment.id]);

        return {
          ...comment,
          replies: repliesResult.rows
        };
      })
    );

    res.json({
      comments: commentsWithReplies,
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
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment to story
router.post('/', authenticateToken, [
  body('storyId').isInt({ min: 1 }),
  body('content').trim().isLength({ min: 1, max: 1000 }),
  body('parentId').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { storyId, content, parentId } = req.body;
    const userId = req.user.userId;

    // Verify story exists
    const storyCheck = await pool.query(
      'SELECT id FROM stories WHERE id = $1 AND is_published = true',
      [storyId]
    );

    if (storyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Verify parent comment exists if provided
    if (parentId) {
      const parentCheck = await pool.query(
        'SELECT id FROM comments WHERE id = $1 AND story_id = $2',
        [parentId, storyId]
      );

      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    const result = await pool.query(`
      INSERT INTO comments (story_id, user_id, content, parent_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *, (SELECT display_name FROM users WHERE id = $2) as author_name
    `, [storyId, userId, content, parentId || null]);

    const newComment = result.rows[0];

    // Emit real-time event
    const io = req.app.get('io');
    if (parentId) {
      // Reply to specific comment
      io.to(`story-${storyId}`).emit('reply-added', {
        ...newComment,
        parentId: parseInt(parentId)
      });
    } else {
      // New top-level comment
      io.to(`story-${storyId}`).emit('comment-added', newComment);
    }

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Like a comment
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);

    const result = await pool.query(`
      UPDATE comments
      SET like_count = like_count + 1
      WHERE id = $1
      RETURNING like_count
    `, [commentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({ likes: result.rows[0].like_count });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update comment
router.put('/:id', authenticateToken, [
  body('content').trim().isLength({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const commentId = parseInt(req.params.id);
    const { content } = req.body;
    const userId = req.user.userId;

    // Check if comment exists and belongs to user
    const checkResult = await pool.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [commentId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (checkResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this comment' });
    }

    const result = await pool.query(`
      UPDATE comments
      SET content = $1
      WHERE id = $2
      RETURNING *, (SELECT display_name FROM users WHERE id = $3) as author_name
    `, [content, commentId, userId]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete comment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = req.user.userId;

    // Check if comment exists and belongs to user
    const checkResult = await pool.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [commentId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (checkResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;