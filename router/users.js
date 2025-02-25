import { PrismaClient } from '@prisma/client';
import { Router } from 'express';

const userRouter = Router();
const prisma = new PrismaClient();

userRouter.get('/', async (req, res) => {
    try {
        const users = await prisma.users.findMany({});
        res.json(users);
    } catch (error) {
        console.error("Erro ao obter usuários:", error);
        res.status(500).json({ error: "Erro ao obter usuários." });
    }
});

userRouter.post('/', async (req, res) => {
    const user = req.body;
    try {
        const userSaved = await prisma.users.create({
            data: user
        });
        res.status(201).json(userSaved);
    } catch (error) {
        console.error("Erro ao salvar usuário:", error);
        res.status(500).json({ error: "Erro ao salvar usuário." });
    }
});

export default userRouter;
