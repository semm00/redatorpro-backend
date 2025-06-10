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

import dotenv from 'dotenv';
import authMiddleware from './middlewares/auth.js'; // Novo middleware JWT

dotenv.config();
const app = express();
app.set('trust proxy', 1);  // Confia no proxy (necessário no Render)

app.use(cors({
  origin: 'https://ifpi-picos.github.io', // URL do front-end
  credentials: true,
}));
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


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor online na porta ${PORT}`);
});