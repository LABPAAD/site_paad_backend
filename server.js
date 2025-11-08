import express from "express";
import routes from './src/routes/index.js';

const app = express();

app.use(express.json());

app.use('/api', routes);

app.listen('3000', () => {
  console.log(`✅ Backend PAAD rodando na porta 3000`);
});

export default app;