// executar com:
// docker compose exec api npx prisma db seed

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@email.com';
  const plainPassword = '12345678';

  // Verifica se já existe usuário com esse e-mail
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log(`⚠ Usuário seed já existe: ${email} (id: ${existing.id})`);
    return;
  }

  // Gera hash da senha
  const hashedPassword = await bcrypt.hash(plainPassword, 12);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      fullName: 'Administrador do Sistema',
      role: 'COORDENADOR',     // ou 'ADMINISTRADOR', se preferir
      status: 'ATIVO',
      consentGiven: false,
      // demais campos opcionais ficam como null/valor padrão
    },
  });

  console.log('✅ Usuário administrador criado via seed:');
  console.log(`   id: ${user.id}`);
  console.log(`   email: ${user.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
