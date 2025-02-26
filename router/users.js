import { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import bcrypt from "bcrypt";

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
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const userSaved = await prisma.users.create({
            data: {
                ...user,
                password: hashedPassword
            }
        });
        res.status(201).json(userSaved);
    } catch (error) {
        console.error("Erro ao salvar usuário:", error);
        res.status(500).json({ error: "Erro ao salvar usuário." });
    }
});

userRouter.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.users.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({ error: "Usuário não encontrado." });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Senha incorreta." });
        }

        // Salva usuário na sessão
        req.session.user = { id: user.id, email: user.email, name: user.name };
        res.json({ message: "Login realizado com sucesso!", user });
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ error: "Erro ao realizar login." });
    }
});

export default userRouter;