import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function corrigirEstudantesSemRegistro() {
  const estudantes = await prisma.user.findMany({
    where: { tipo: 'estudante' },
    select: { id: true }
  });
  for (const u of estudantes) {
    const existe = await prisma.estudante.findUnique({ where: { userId: u.id } });
    if (!existe) {
      await prisma.estudante.create({
        data: { userId: u.id, instagram: null, interesses: [] }
      });
      console.log('Criado registro em Estudante para userId:', u.id);
    }
  }
  await prisma.$disconnect();
}
corrigirEstudantesSemRegistro();
