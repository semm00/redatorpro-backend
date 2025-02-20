import cors from 'cors';
import express from 'express'; // Certifique-se de usar 'express' com 'e' minúsculo
import logger from './middlewares/logger.js';
import userRouter from './router/users.js';
import serverRouter from './router/server.js'; // Importe o router do server.js

const app = express(); // Certifique-se de usar 'express' com 'e' minúsculo
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
    console.log(`app online na porta ${PORT}`);
});