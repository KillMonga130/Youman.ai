/**
 * Database seed script
 * Populates the database with initial data for development
 */

import 'dotenv/config';
import { PrismaClient, SubscriptionTier, SubscriptionStatus } from '../src/generated/prisma';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default templates
  const templates = [
    {
      name: 'Blog Post',
      description: 'Optimized for blog content with casual, engaging tone',
      category: 'content',
      isPublic: true,
      settings: {
        level: 3,
        strategy: 'casual',
        preserveKeywords: true,
        targetBurstiness: 0.7,
      },
    },
    {
      name: 'Academic Paper',
      description: 'Maintains scholarly language while adding natural variations',
      category: 'academic',
      isPublic: true,
      settings: {
        level: 2,
        strategy: 'academic',
        preserveCitations: true,
        targetBurstiness: 0.5,
      },
    },
    {
      name: 'Business Report',
      description: 'Professional tone with clear, concise language',
      category: 'business',
      isPublic: true,
      settings: {
        level: 2,
        strategy: 'professional',
        preserveFormatting: true,
        targetBurstiness: 0.6,
      },
    },
    {
      name: 'Creative Writing',
      description: 'Maximum humanization for fiction and creative content',
      category: 'creative',
      isPublic: true,
      settings: {
        level: 4,
        strategy: 'casual',
        preserveDialogue: true,
        targetBurstiness: 0.8,
      },
    },
    {
      name: 'Technical Documentation',
      description: 'Preserves technical accuracy while improving readability',
      category: 'technical',
      isPublic: true,
      settings: {
        level: 2,
        strategy: 'professional',
        preserveCodeBlocks: true,
        preserveTechnicalTerms: true,
        targetBurstiness: 0.5,
      },
    },
  ];

  for (const template of templates) {
    await prisma.template.upsert({
      where: {
        id: `default-${template.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: template,
      create: {
        id: `default-${template.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...template,
      },
    });
  }

  console.log(`✅ Created ${templates.length} default templates`);

  // Create a demo user for development
  if (process.env.NODE_ENV === 'development') {
    const demoPasswordHash = await bcrypt.hash('demo123456', 10);
    
    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@example.com' },
      update: {},
      create: {
        email: 'demo@example.com',
        passwordHash: demoPasswordHash,
        firstName: 'Demo',
        lastName: 'User',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        subscription: {
          create: {
            tier: SubscriptionTier.PROFESSIONAL,
            status: SubscriptionStatus.ACTIVE,
            monthlyWordLimit: 100000,
            monthlyApiCallLimit: 1000,
            storageLimit: BigInt(10 * 1024 * 1024 * 1024), // 10GB
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        preferences: {
          create: {
            defaultLevel: 3,
            defaultStrategy: 'auto',
            defaultLanguage: 'en',
            autoSaveEnabled: true,
            darkModeEnabled: false,
          },
        },
      },
    });

    console.log(`✅ Created demo user: ${demoUser.email}`);
  }

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
