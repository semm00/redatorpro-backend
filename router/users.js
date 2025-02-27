import { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import bcrypt from 'bcrypt'; // Certifique-se de instalar com "npm install bcrypt"

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
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "Nome, email e senha são obrigatórios." });
    }

    try {
        // Criptografar a senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Salvar o usuário no banco de dados
        const userSaved = await prisma.users.create({
            data: {
                name,
                email,
                password: hashedPassword
            }
        });

        // Salvar o ID do usuário na sessão
        req.session.user = { id: userSaved.id, name: userSaved.name, email: userSaved.email };

        res.status(201).json(userSaved);
    } catch (error) {
        console.error("Erro ao salvar usuário:", error);
        res.status(500).json({ error: "Erro ao salvar usuário." });
    }
});

export default userRouter;