import express from "express";
import routes from './src/routes/index.js';

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`✅ Backend PAAD rodando na porta ${PORT}`);
});

export default app;