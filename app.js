import express from 'express';
import cors from 'cors';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import logger from './middlewares/logger.js';
import userRouter from './router/users.js';
import serverRouter from './router/server.js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente do arquivo .env
dotenv.config();

const app = express();
const PgSession = pgSession(session);

app.use(cors({
  origin: 'https://ifpi-picos.github.io/projeto-integrador-redatorpro', // Substitua pela URL do seu front-end
  credentials: true
}));
app.use(express.json());

// Configurar o middleware de sessão
app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
  }),
  secret: 'your-secret-key', // Substitua por uma chave secreta segura
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Defina como true se estiver usando HTTPS
}));

app.use(logger);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.use('/users', userRouter);
app.use('/server', serverRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`app online na porta ${PORT}`);
});
