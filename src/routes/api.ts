import { Router } from 'express';
import { getClient } from '../db/client';

// gets the router from express but at this point 
// everything is after the /api prefix
const router = Router();

router.get('/test-db', async (req, res) => {
  try {
    const client = await getClient();
    const result = await client.query('SELECT NOW()');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ success: false, error: 'Database connection failed' });
  }
});

export default router;
