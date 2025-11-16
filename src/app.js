import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import routes from './routes/index.js';
const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use('/api', routes);

app.use((err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno no servidor.';

  return res.status(statusCode).json({ message });
});

export default app;
