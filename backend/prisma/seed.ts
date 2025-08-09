import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@healthscan.ai' },
    update: {},
    create: {
      id: 'demo-user',
      email: 'demo@healthscan.ai',
      name: 'Demo User',
      provider: 'demo'
    }
  })
  
  console.log('Demo user created:', demoUser)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })