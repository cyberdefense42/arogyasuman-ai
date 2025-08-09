#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function createAdminUser() {
  console.log('\n🔐 Create Admin User\n');
  
  try {
    const email = await question('Enter admin email: ');
    const name = await question('Enter admin name: ');
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      // Update existing user to admin
      const updatedUser = await prisma.user.update({
        where: { email },
        data: { 
          role: 'admin',
          name: name || existingUser.name
        }
      });
      
      console.log('\n✅ Existing user updated to admin:');
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Name: ${updatedUser.name}`);
      console.log(`   Role: ${updatedUser.role}`);
      console.log(`   ID: ${updatedUser.id}`);
    } else {
      // Create new admin user
      const newUser = await prisma.user.create({
        data: {
          email,
          name,
          role: 'admin',
          provider: 'manual'
        }
      });
      
      console.log('\n✅ New admin user created:');
      console.log(`   Email: ${newUser.email}`);
      console.log(`   Name: ${newUser.name}`);
      console.log(`   Role: ${newUser.role}`);
      console.log(`   ID: ${newUser.id}`);
    }
    
    console.log('\n⚠️  Note: This user can now access the admin panel at /admin');
    console.log('   They must still authenticate via Firebase to log in.\n');
    
  } catch (error) {
    console.error('\n❌ Error creating admin user:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Run the script
createAdminUser();