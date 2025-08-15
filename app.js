import express from 'express';
import cors from 'cors';
import logger from './middlewares/logger.js';
import userRouter from './router/users.js';
import loginRouter from './router/login.js';
import serverRouter from './router/server.js';
import pdfRoutes from "./router/pdf.js";
import redchatRouter from './router/redchat.js';
import geminiRouter from './router/gemini.js';
import redacoesRouter from './router/redacoes.js';
import relatorioRouter from './router/relatorio.js';
import perfilRouter from './router/perfil.js';
import temasRouter from './router/temas.js';
import redCorretoresRouter from './router/red-corretores.js';
import correcaoRouter from './router/correcao.js';

import dotenv from 'dotenv';
import authMiddleware from './middlewares/auth.js'; // Novo middleware JWT

dotenv.config();
const app = express();
app.set('trust proxy', 1);  // Confia no proxy (necessário no Render)

// CORS para todas as rotas e métodos
app.use(cors({
  origin: 'https://ifpi-picos.github.io',
  credentials: true,
}));

// Middleware extra para garantir CORS em todas as respostas
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://ifpi-picos.github.io");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

app.use(logger);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use('/admin', express.static('admin'));
app.use('/users', userRouter);
app.use('/login', loginRouter);
app.use('/server', authMiddleware, serverRouter);
app.use("/pdf", pdfRoutes);
app.use('/redchat', authMiddleware, redchatRouter);
app.use('/gemini', geminiRouter);
app.use('/redacoes', authMiddleware, redacoesRouter);
app.use('/relatorio', relatorioRouter);
app.use('/perfil', authMiddleware, perfilRouter);
app.use('/temas', temasRouter);
app.use('/red-corretores', redCorretoresRouter);
app.use('/correcao', authMiddleware, correcaoRouter);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor online na porta ${PORT}`);
});