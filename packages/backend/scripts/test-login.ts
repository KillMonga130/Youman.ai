/**
 * Test login script
 * Verifies admin user exists and can login
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking admin user...\n');

  const adminEmail = 'mubvafhimoses813@gmail.com';
  
  const user = await prisma.user.findUnique({
    where: { email: adminEmail },
    include: { subscription: true },
  });

  if (!user) {
    console.log('❌ Admin user not found!');
    console.log('Creating admin user...\n');
    
    const passwordHash = await bcrypt.hash('admin123456', 12);
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        subscription: {
          create: {
            tier: 'ENTERPRISE',
            status: 'ACTIVE',
            monthlyWordLimit: 1000000,
            monthlyApiCallLimit: 10000,
            storageLimit: BigInt(100 * 1024 * 1024 * 1024),
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
    });
    
    console.log('✅ Admin user created!');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: admin123456`);
    console.log(`   Has password: ${!!adminUser.passwordHash}\n`);
  } else {
    console.log('✅ Admin user found!');
    console.log(`   Email: ${user.email}`);
    console.log(`   Has password: ${!!user.passwordHash}`);
    console.log(`   Subscription: ${user.subscription?.tier || 'None'}`);
    
    if (!user.passwordHash) {
      console.log('\n⚠️  User has no password! Setting password...');
      const passwordHash = await bcrypt.hash('admin123456', 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
      console.log('✅ Password set to: admin123456\n');
    } else {
      // Test password
      const testPassword = 'admin123456';
      const isValid = await bcrypt.compare(testPassword, user.passwordHash);
      console.log(`   Password test (admin123456): ${isValid ? '✅ Valid' : '❌ Invalid'}\n`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);

