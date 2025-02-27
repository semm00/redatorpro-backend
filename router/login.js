const express = require('express');
const bcrypt = require('bcrypt'); // Certifique-se de instalar com "npm install bcrypt"
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha são obrigatórios." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Senha incorreta." });
    }

    // Salva o ID do usuário na sessão
    req.session.user = { id: user.id, name: user.name, email: user.email };

    res.status(200).json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;