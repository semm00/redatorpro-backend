import cors from 'cors';
import express from 'express'; // Certifique-se de usar 'express' com 'e' minúsculo
import logger from './middlewares/logger.js';
import userRouter from './router/users.js';
import serverRouter from './router/server.js'; // Importe o router do server.js
import session from "express-session";
import pgSession from "connect-pg-simple";
import dotenv from 'dotenv';

// Carregar variáveis de ambiente do arquivo .env
dotenv.config();

const app = express(); // 🔹 Mova esta linha para o topo, antes de configurar as sessões

// 🔹 Configurar sessão no PostgreSQL
app.use(
    session({
      store: new (pgSession(session))({
        conString: process.env.DATABASE_URL, // Conexão com o PostgreSQL
      }),
      secret: process.env.SESSION_SECRET || "chave_secreta", // 🔥 Defina uma chave forte no .env
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
      },
    })
);

app.use(cors());
app.use(express.json());
app.use(logger);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.use('/users', userRouter); // Adicione um prefixo para o userRouter
app.use('/server', serverRouter); // Adicione um prefixo para o serverRouter

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});
