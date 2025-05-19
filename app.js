// app.js
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import dotenv from 'dotenv';

import logger from './middlewares/logger.js';
import userRouter from './router/users.js';
import loginRouter from './router/login.js';
import serverRouter from './router/server.js';
import pdfRoutes from "./router/pdf.js";
import correcaoRouter from './router/correcao.js'; // <-- NOVA ROTA IMPORTADA

dotenv.config();

const app = express();
app.set('trust proxy', 1); // Necessário para o Render usar cookies seguros

const PgSession = pgSession(session);

// Middlewares
app.use(cors({
  origin: 'https://ifpi-picos.github.io',
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true
  }),
  secret: 'your-secret-key', // Substitua por uma chave segura
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, sameSite: 'none' }
}));

app.use(logger);

// Rotas
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/admin', express.static('admin'));
app.use('/users', userRouter);
app.use('/login', loginRouter);
app.use('/server', serverRouter);
app.use('/pdf', pdfRoutes);
app.use('/correcao', correcaoRouter); // <-- ROTA ADICIONADA

// Inicialização
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor online na porta ${PORT}`);
});
