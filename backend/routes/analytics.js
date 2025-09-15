const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../utils/database');

const router = express.Router();

// Middleware to track API requests
const trackRequest = async (req, res, next) => {
  const start = Date.now();

  res.on('finish', async () => {
    try {
      const duration = Date.now() - start;
      await pool.query(`
        INSERT INTO analytics (endpoint, method, user_agent, ip_address, response_time, status_code)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        req.path,
        req.method,
        req.get('User-Agent') || 'Unknown',
        req.ip || req.connection.remoteAddress,
        duration,
        res.statusCode
      ]);
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  });

  next();
};

// Track page view
router.post('/pageview', trackRequest, [
  body('page').trim().isLength({ min: 1 }),
  body('referrer').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { page, referrer } = req.body;

    await pool.query(`
      INSERT INTO analytics (endpoint, method, user_agent, ip_address, response_time, status_code, additional_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      page,
      'PAGEVIEW',
      req.get('User-Agent') || 'Unknown',
      req.ip || req.connection.remoteAddress,
      0,
      200,
      JSON.stringify({ referrer })
    ]);

    res.json({ success: true, message: 'Page view tracked' });
  } catch (error) {
    console.error('Page view tracking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Track custom event
router.post('/event', trackRequest, [
  body('eventType').trim().isLength({ min: 1 }),
  body('eventData').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventType, eventData } = req.body;

    await pool.query(`
      INSERT INTO analytics (endpoint, method, user_agent, ip_address, response_time, status_code, additional_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      eventType,
      'EVENT',
      req.get('User-Agent') || 'Unknown',
      req.ip || req.connection.remoteAddress,
      0,
      200,
      JSON.stringify(eventData || {})
    ]);

    res.json({ success: true, message: 'Event tracked' });
  } catch (error) {
    console.error('Event tracking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get analytics summary
router.get('/summary', trackRequest, async (req, res) => {
  try {
    const period = req.query.period || '7days'; // 7days, 30days, all
    let dateFilter = '';
    let params = [];

    if (period === '7days') {
      dateFilter = 'WHERE created_at >= CURRENT_DATE - INTERVAL \'7 days\'';
    } else if (period === '30days') {
      dateFilter = 'WHERE created_at >= CURRENT_DATE - INTERVAL \'30 days\'';
    }

    const [
      totalViews,
      totalStories,
      totalUsers,
      totalComments,
      totalLikes,
      dailyStats,
      popularStories,
      activeUsers
    ] = await Promise.all([
      // Total page views
      pool.query(`SELECT COUNT(*) FROM analytics WHERE method = 'PAGEVIEW' ${dateFilter}`, params),

      // Total stories
      pool.query('SELECT COUNT(*) FROM stories WHERE is_published = true', []),

      // Total users
      pool.query('SELECT COUNT(*) FROM users', []),

      // Total comments
      pool.query('SELECT COUNT(*) FROM comments', []),

      // Total likes
      pool.query('SELECT SUM(like_count) FROM stories', []),

      // Daily stats
      pool.query(`
        SELECT
          DATE(created_at) as date,
          COUNT(*) FILTER (WHERE method = 'PAGEVIEW') as page_views,
          COUNT(*) FILTER (WHERE endpoint LIKE '/api/stories%' AND method = 'POST') as stories_created,
          COUNT(*) FILTER (WHERE endpoint LIKE '/api/comments%' AND method = 'POST') as comments_added
        FROM analytics
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `, []),

      // Popular stories
      pool.query(`
        SELECT
          s.id, s.title, s.view_count, s.like_count, s.share_count,
          u.display_name as author_name,
          COUNT(c.id) as comment_count
        FROM stories s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN comments c ON s.id = c.story_id
        WHERE s.is_published = true
        GROUP BY s.id, u.display_name
        ORDER BY (s.view_count + s.like_count * 2 + s.share_count * 3 + COUNT(c.id)) DESC
        LIMIT 10
      `, []),

      // Active users
      pool.query(`
        SELECT
          u.id, u.display_name, u.email,
          COUNT(DISTINCT s.id) as stories_count,
          COUNT(DISTINCT c.id) as comments_count,
          MAX(s.created_at) as last_activity
        FROM users u
        LEFT JOIN stories s ON u.id = s.user_id
        LEFT JOIN comments c ON u.id = c.user_id
        GROUP BY u.id, u.display_name, u.email
        ORDER BY (COUNT(DISTINCT s.id) + COUNT(DISTINCT c.id)) DESC
        LIMIT 10
      `, [])
    ]);

    res.json({
      summary: {
        totalPageViews: parseInt(totalViews.rows[0].count),
        totalStories: parseInt(totalStories.rows[0].count),
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalComments: parseInt(totalComments.rows[0].count),
        totalLikes: parseInt(totalLikes.rows[0].sum) || 0
      },
      dailyStats: dailyStats.rows,
      popularStories: popularStories.rows,
      activeUsers: activeUsers.rows,
      period
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get real-time dashboard data
router.get('/realtime', trackRequest, async (req, res) => {
  try {
    const [
      currentStats,
      recentActivity
    ] = await Promise.all([
      // Current stats
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as last_hour_views,
          COUNT(*) FILTER (WHERE endpoint LIKE '/api/stories%' AND method = 'POST' AND created_at >= NOW() - INTERVAL '1 hour') as last_hour_stories,
          COUNT(*) FILTER (WHERE endpoint LIKE '/api/comments%' AND method = 'POST' AND created_at >= NOW() - INTERVAL '1 hour') as last_hour_comments
        FROM analytics
      `, []),

      // Recent activity
      pool.query(`
        SELECT
          endpoint, method, created_at, user_agent, ip_address
        FROM analytics
        ORDER BY created_at DESC
        LIMIT 20
      `, [])
    ]);

    res.json({
      realtime: currentStats.rows[0],
      recentActivity: recentActivity.rows
    });
  } catch (error) {
    console.error('Realtime analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;