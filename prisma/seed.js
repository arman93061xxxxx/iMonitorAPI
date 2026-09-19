const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@monitoriq.com';
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error('❌ Error: ADMIN_PASSWORD environment variable is required to initialize the administrator.');
    console.error('Usage: ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="your_secure_password" node prisma/seed.js');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Error: ADMIN_PASSWORD must be at least 8 characters long.');
    process.exit(1);
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    if (process.env.OVERWRITE_ADMIN_PASSWORD === 'true') {
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { email },
        data: { passwordHash },
      });
      console.log(`✅ Administrator password updated for: ${email}`);
    } else {
      console.log(`ℹ️ Administrator account already exists: ${email}. No changes made.`);
    }
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        name: process.env.ADMIN_NAME || 'MonitorIQ Admin',
        email,
        passwordHash,
        role: 'ADMIN',
      },
    });
    console.log(`✅ Initial administrator created successfully: ${email}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async error => {
    console.error('❌ Failed to seed administrator:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  });
