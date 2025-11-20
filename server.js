
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import routes from "./src/routes/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 CORS – libera o frontend em http://localhost:3000
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true, // necessário para cookies
  })
);

// Parser de JSON
app.use(express.json());

// Parser de cookies (para ler paad_session)
app.use(cookieParser());

// Rotas da API
app.use("/api", routes);

app.listen(PORT, () => {
  console.log(`✅ Backend PAAD rodando na porta ${PORT}`);
});

export default app; 