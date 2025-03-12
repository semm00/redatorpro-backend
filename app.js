import express from 'express';
import cors from 'cors';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import logger from './middlewares/logger.js';
import userRouter from './router/users.js';
import loginRouter from './router/login.js';
import serverRouter from './router/server.js';
import pdfRoutes from "./router/pdf.js";

import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.set('trust proxy', 1);  // Confia no proxy (necessário no Render)

const PgSession = pgSession(session);

app.use(cors({
  origin: 'https://ifpi-picos.github.io', // URL do front-end
  credentials: true,
}));
app.use(express.json());

// Configurar o middleware de sessão com cookie cross-site
app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true // Cria a tabela de sessões automaticamente se não existir
  }),
  secret: 'your-secret-key',  // substitua por uma chave segura
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, sameSite: 'none' } // Necessário para HTTPS e cross-site
}));

app.use(logger);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/users', userRouter);
app.use('/login', loginRouter);
app.use('/server', serverRouter);
app.use("/pdf", pdfRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor online na porta ${PORT}`);
});