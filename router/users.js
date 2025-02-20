import { PrismaClient } from '@prisma/client';
import { Router } from 'express';

const userRouter = Router();
const prisma = new PrismaClient();

userRouter.get('/', async (req, res) => {
    const users = await prisma.user.findMany({});
    res.json(users);
});

userRouter.post('/', async (req, res) => {
    const user = req.body;
    try {
        const userSaved = await prisma.user.create({
            data: user
        });
        res.status(201).json(userSaved);
    } catch (error) {
        console.error("Erro ao salvar usuário:", error);
        res.status(500).json({ error: "Erro ao salvar usuário." });
    }
});

export default userRouter;