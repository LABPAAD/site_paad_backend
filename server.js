
import express from "express";
import cors from "cors";
import routes from "./src/routes/index.js";

const app = express();

const PORT = process.env.PORT || 3000;

// 🔐 CORS – libera o frontend em http://localhost:3000
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true, // importante se você for usar cookies de sessão
  })
);

// Body parser JSON
app.use(express.json());

// Rotas da API
app.use("/api", routes);

app.listen(PORT, () => {
  console.log(`✅ Backend PAAD rodando na porta ${PORT}`);
});

export default app;