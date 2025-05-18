import { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

const userRouter = Router();
const prisma = new PrismaClient();
const upload = multer(); 

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ...existing code...
userRouter.post('/', upload.single('certificado'), async (req, res) => {
  console.log("Recebendo cadastro:", req.body, req.file);

  const { name, email, password, tipo, experiencia, escolaridade } = req.body;
  let certificadoUrl = null;

  if (tipo === 'corretor' && req.file) {
    try {
      const fileExt = req.file.originalname.split('.').pop();
      const fileName = `${Date.now()}_${email}.${fileExt}`;
      console.log("Enviando certificado para Supabase:", fileName);

      const { error } = await supabase
        .storage
        .from('certificados')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (error) {
        console.error("Erro no upload do certificado:", error);
        return res.status(500).json({ error: "Erro ao enviar certificado para o storage." });
      }
      certificadoUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/certificados/${fileName}`;
      console.log("Certificado enviado. URL:", certificadoUrl);
    } catch (err) {
      console.error("Exceção ao enviar certificado:", err);
      return res.status(500).json({ error: "Erro inesperado ao enviar certificado." });
    }
  }

  if (!name || !email || !password || !tipo) {
    console.warn("Campos obrigatórios faltando:", { name, email, password, tipo });
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Senha criptografada, salvando usuário...");

    const userSaved = await prisma.users.create({
      data: {
        name,
        email,
        password: hashedPassword,
        tipo,
        experiencia: tipo === 'corretor' ? experiencia : null,
        escolaridade: tipo === 'corretor' ? escolaridade : null,
        certificado: tipo === 'corretor' ? certificadoUrl : null,
        aprovado: tipo === 'corretor' ? false : null
      }
    });

    console.log("Usuário salvo no banco:", userSaved);

    req.session.user = { id: userSaved.id, name: userSaved.name, email: userSaved.email, tipo: userSaved.tipo };
    res.status(201).json(userSaved);
  } catch (error) {
    console.error("Erro ao salvar usuário:", error);
    res.status(500).json({ error: "Erro ao salvar usuário." });
  }
});
// ...existing code...

userRouter.patch('/:id/aprovar', async (req, res) => {
  try {
    const user = await prisma.users.update({
      where: { id: Number(req.params.id) },
      data: { aprovado: true }
    });
    res.json({ message: "Corretor aprovado com sucesso!", user });
  } catch (error) {
    res.status(500).json({ error: "Erro ao aprovar corretor." });
  }
});

userRouter.get('/pendentes', async (req, res) => {
  try {
    const pendentes = await prisma.users.findMany({
      where: { tipo: 'corretor', aprovado: false }
    });
    res.json(pendentes);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar corretores pendentes." });
  }
});

export default userRouter;