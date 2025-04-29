import express from 'express';
import routes from './routes';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/', routes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
