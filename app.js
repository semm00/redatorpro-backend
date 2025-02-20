import cors from 'cors';
import Express from 'express';
import logger from './middlewares/logger.js';
import userRouter from './router/users.js';
import serverRouter from './router/server.js'; // Importe o router do server.js

const app = Express();
app.use(cors());
app.use(Express.json());

app.use(logger);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.use(userRouter);
app.use(serverRouter); // Use o router do server.js

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`app online na porta ${PORT}`);
});