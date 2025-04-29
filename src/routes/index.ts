import { Router } from 'express';
import apiRoutes from './api';

const router = Router();

router.get('/', (req, res) => {
  res.send('oracle its trash');
});

router.use('/api', apiRoutes);

export default router;
