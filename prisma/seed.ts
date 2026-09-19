import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@monitoriq.local';
  const passwordHash = await bcrypt.hash('CHANGEME_Test1234!', 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: 'MonitorIQ Admin',
      email,
      passwordHash,
      role: 'ADMIN',
    },
  });

  const existingApi = await prisma.api.findFirst({
    where: { userId: user.id, name: 'Example Health API' },
  });

  if (!existingApi) {
    await prisma.api.create({
      data: {
        name: 'Example Health API',
        url: 'https://httpbin.org/status/200',
        method: 'GET',
        description: 'Sample monitored endpoint',
        monitoringInterval: 60,
        timeout: 5000,
        userId: user.id,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async error => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
