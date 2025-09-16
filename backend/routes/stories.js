const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../utils/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Sample stories data for when database is unavailable
const sampleStories = [
  {
    id: 1,
    title: "My family lost our home in 2008",
    content: "My family lost our home in 2008. I was 16, watching my parents cry over papers they couldn't understand. The same banks that got bailed out foreclosed on us. I see Anna's story in mine - how the system protects those who already have power.",
    category: "struggle",
    tags: ["struggle", "economic-justice"],
    is_published: true,
    view_count: 45,
    like_count: 23,
    share_count: 8,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    author_name: "Maria S.",
    comment_count: 3
  },
  {
    id: 2,
    title: "Started a community land trust",
    content: "Started a community land trust in our neighborhood after seeing too many families displaced by gentrification. We're literally creating our own 'tally sticks' - currency that stays in our community. 47 families now have secure housing.",
    category: "resistance",
    tags: ["resistance", "economic-justice"],
    is_published: true,
    view_count: 67,
    like_count: 31,
    share_count: 12,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000),
    author_name: "David Chen",
    comment_count: 5
  },
  {
    id: 3,
    title: "Medical debt destroyed my credit",
    content: "Medical debt destroyed my credit and my future. $67,000 for cancer treatment, even with insurance. The 'King's scribes' are the debt collectors who call every day. How is this different from the parable?",
    category: "struggle",
    tags: ["struggle", "economic-justice"],
    is_published: true,
    view_count: 32,
    like_count: 18,
    share_count: 6,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
    author_name: "Anonymous",
    comment_count: 2
  },
  {
    id: 4,
    title: "Our worker cooperative now employs 23 people",
    content: "Our worker cooperative now employs 23 people, all with equal say in decisions. We've proven that Anna's dream is possible - we can build something that serves everyone, not just the owners of capital.",
    category: "solution",
    tags: ["solution", "economic-justice"],
    is_published: true,
    view_count: 89,
    like_count: 45,
    share_count: 15,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    author_name: "Rosa Martinez",
    comment_count: 7
  },
  {
    id: 5,
    title: "Organized my entire warehouse to demand living wages",
    content: "Organized my entire warehouse to demand living wages. Management said 'that's just how the economy works.' But we read The King's Reckoning together and realized - we're the ones who make the economy work. Victory after 3 months!",
    category: "resistance",
    tags: ["resistance", "economic-justice"],
    is_published: true,
    view_count: 123,
    like_count: 67,
    share_count: 23,
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
    updated_at: new Date(Date.now() - 48 * 60 * 60 * 1000),
    author_name: "James T.",
    comment_count: 9
  }
];

// Get all stories with pagination and filtering
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const category = req.query.category;
    const search = req.query.search;

    // Check if database is available
    try {
      await pool.query('SELECT 1');

      let query = `
        SELECT
          s.id, s.title, s.content, s.category, s.tags,
          s.is_published, s.view_count, s.like_count, s.share_count,
          s.created_at, s.updated_at,
          u.display_name as author_name,
          COUNT(c.id) as comment_count
        FROM stories s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN comments c ON s.id = c.story_id
        WHERE s.is_published = true
      `;
      let countQuery = 'SELECT COUNT(*) FROM stories WHERE is_published = true';
      let queryParams = [];
      let countParams = [];

      if (category) {
        query += ' AND s.category = $1';
        countQuery += ' AND category = $1';
        queryParams.push(category);
        countParams.push(category);
      }

      if (search) {
        const searchParam = `%${search}%`;
        query += queryParams.length === 0 ? ' AND (s.title ILIKE $1 OR s.content ILIKE $1)' : ' AND (s.title ILIKE $2 OR s.content ILIKE $2)';
        countQuery += countParams.length === 0 ? ' AND (title ILIKE $1 OR content ILIKE $1)' : ' AND (title ILIKE $2 OR content ILIKE $2)';
        queryParams.push(searchParam);
        countParams.push(searchParam);
      }

      query += ' GROUP BY s.id, u.display_name ORDER BY s.created_at DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
      queryParams.push(limit, offset);

      const [storiesResult, countResult] = await Promise.all([
        pool.query(query, queryParams),
        pool.query(countQuery, countParams)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      res.json({
        stories: storiesResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (dbError) {
      // Database not available, return sample stories
      console.log('⚠️  Database not available, returning sample stories');

      let filteredStories = [...sampleStories];

      if (category) {
        filteredStories = filteredStories.filter(story => story.category === category);
      }

      if (search) {
        const searchLower = search.toLowerCase();
        filteredStories = filteredStories.filter(story =>
          story.title.toLowerCase().includes(searchLower) ||
          story.content.toLowerCase().includes(searchLower)
        );
      }

      const total = filteredStories.length;
      const totalPages = Math.ceil(total / limit);
      const paginatedStories = filteredStories.slice(offset, offset + limit);

      res.json({
        stories: paginatedStories,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    }
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single story
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const storyId = parseInt(req.params.id);

    // Increment view count
    await pool.query(
      'UPDATE stories SET view_count = view_count + 1 WHERE id = $1',
      [storyId]
    );

    const result = await pool.query(`
      SELECT
        s.*,
        u.display_name as author_name,
        u.email as author_email
      FROM stories s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = $1 AND s.is_published = true
    `, [storyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get story error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new story
router.post('/', authenticateToken, [
  body('title').trim().isLength({ min: 1, max: 255 }),
  body('content').trim().isLength({ min: 1 }),
  body('category').optional().trim(),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, category, tags } = req.body;
    const userId = req.user.userId;

    const result = await pool.query(`
      INSERT INTO stories (user_id, title, content, category, tags, is_published)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, title, content, category || null, tags || null, true]);

    const newStory = result.rows[0];

    // Emit real-time event
    req.app.get('io').emit('story-published', newStory);

    res.status(201).json(newStory);
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update story
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const storyId = parseInt(req.params.id);
    const { title, content, category, tags, is_published } = req.body;
    const userId = req.user.userId;

    // Check if story exists and belongs to user
    const checkResult = await pool.query(
      'SELECT user_id FROM stories WHERE id = $1',
      [storyId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (checkResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this story' });
    }

    const result = await pool.query(`
      UPDATE stories
      SET title = COALESCE($1, title),
          content = COALESCE($2, content),
          category = COALESCE($3, category),
          tags = COALESCE($4, tags),
          is_published = COALESCE($5, is_published),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [title, content, category, tags, is_published, storyId]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update story error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete story
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const storyId = parseInt(req.params.id);
    const userId = req.user.userId;

    // Check if story exists and belongs to user
    const checkResult = await pool.query(
      'SELECT user_id FROM stories WHERE id = $1',
      [storyId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (checkResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this story' });
    }

    await pool.query('DELETE FROM stories WHERE id = $1', [storyId]);

    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Like a story
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const storyId = parseInt(req.params.id);

    const result = await pool.query(`
      UPDATE stories
      SET like_count = like_count + 1
      WHERE id = $1
      RETURNING like_count
    `, [storyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({ likes: result.rows[0].like_count });
  } catch (error) {
    console.error('Like story error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Share a story
router.post('/:id/share', optionalAuth, async (req, res) => {
  try {
    const storyId = parseInt(req.params.id);

    const result = await pool.query(`
      UPDATE stories
      SET share_count = share_count + 1
      WHERE id = $1
      RETURNING share_count
    `, [storyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({ shares: result.rows[0].share_count });
  } catch (error) {
    console.error('Share story error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;