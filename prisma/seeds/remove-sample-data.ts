import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Starting sample data removal...')
  
  // Find the test campus first
  const campus = await prisma.campus.findFirst({
    where: { name: 'Test Seed Organization' }
  })

  if (!campus) {
    console.log('ℹ️  No test data found. Nothing to remove.')
    return
  }

  console.log(`\n📍 Found test campus: ${campus.name}`)
  console.log(`   Campus ID: ${campus.id}`)

  // Step 1: Get all users in the test campus
  const users = await prisma.user.findMany({
    where: { 
      email: { contains: 'seedtestuser' },
      campusId: campus.id 
    }
  })
  
  console.log(`\n👥 Found ${users.length} test users to remove`)

  // Step 2: Get all quiz attempts for these users
  const userIds = users.map(u => u.id)
  const quizAttempts = await prisma.quizAttempt.findMany({
    where: { userId: { in: userIds } }
  })
  
  console.log(`📝 Found ${quizAttempts.length} quiz attempts to remove`)

  // Step 3: Delete quiz answers
  const quizAttemptIds = quizAttempts.map(qa => qa.id)
  await prisma.quizAnswer.deleteMany({
    where: { attemptId: { in: quizAttemptIds } }
  })
  console.log('✅ Deleted quiz answers')

  // Step 4: Delete quiz attempts
  await prisma.quizAttempt.deleteMany({
    where: { userId: { in: userIds } }
  })
  console.log('✅ Deleted quiz attempts')

  // Step 5: Delete quiz users
  await prisma.quizUser.deleteMany({
    where: { userId: { in: userIds } }
  })
  console.log('✅ Deleted quiz user enrollments')

  // Step 6: Delete assessment attempts for these users
  const assessmentAttempts = await prisma.assessmentAttempt.findMany({
    where: { userId: { in: userIds } }
  })
  
  const assessmentAttemptIds = assessmentAttempts.map(aa => aa.id)
  await prisma.assessmentAnswer.deleteMany({
    where: { attemptId: { in: assessmentAttemptIds } }
  })
  console.log('✅ Deleted assessment answers')

  await prisma.assessmentAttempt.deleteMany({
    where: { userId: { in: userIds } }
  })
  console.log('✅ Deleted assessment attempts')

  // Step 7: Delete assessment users
  await prisma.assessmentUser.deleteMany({
    where: { userId: { in: userIds } }
  })
  console.log('✅ Deleted assessment user enrollments')

  // Step 8: Delete the test quiz
  const quiz = await prisma.quiz.findFirst({
    where: {
      title: 'Test Seed Quiz',
      campusId: campus.id
    }
  })

  if (quiz) {
    console.log(`\n🎯 Found test quiz: ${quiz.title}`)
    
    // Delete quiz questions
    await prisma.quizQuestion.deleteMany({
      where: { quizId: quiz.id }
    })
    console.log('✅ Deleted quiz questions')

    // Delete quiz users
    await prisma.quizUser.deleteMany({
      where: { quizId: quiz.id }
    })
    console.log('✅ Deleted quiz user enrollments')

    // Delete the quiz
    await prisma.quiz.delete({
      where: { id: quiz.id }
    })
    console.log('✅ Deleted quiz')
  }

  // Step 9: Delete the test question group
  const questionGroup = await prisma.questionGroup.findFirst({
    where: { name: 'Test Seed Quiz Group' }
  })

  if (questionGroup) {
    console.log(`\n📝 Found test question group: ${questionGroup.name}`)
    
    // Delete questions in the group
    await prisma.question.deleteMany({
      where: { groupId: questionGroup.id }
    })
    console.log('✅ Deleted questions in group')

    // Delete the question group
    await prisma.questionGroup.delete({
      where: { id: questionGroup.id }
    })
    console.log('✅ Deleted question group')
  }

  // Step 10: Delete reported questions for these users
  await prisma.reportedQuestion.deleteMany({
    where: { userId: { in: userIds } }
  })
  console.log('✅ Deleted reported questions')

  // Step 11: Delete test users
  await prisma.user.deleteMany({
    where: { 
      email: { contains: 'seedtestuser' },
      campusId: campus.id 
    }
  })
  console.log(`✅ Deleted ${users.length} test users`)

  // Step 12: Delete test batches
  const batches = await prisma.batch.findMany({
    where: { 
      name: { in: ['2014-2018', '2022-2026'] },
      campusId: campus.id 
    }
  })

  const batchNames = batches.map(b => b.name)
  await prisma.batch.deleteMany({
    where: { 
      name: { in: ['2014-2018', '2022-2026'] },
      campusId: campus.id 
    }
  })
  console.log(`✅ Deleted batches: ${batchNames.join(', ') || 'none'}`)

  // Step 13: Delete test departments
  const departments = await prisma.department.findMany({
    where: { 
      name: { in: ['CSE', 'IT', 'AIDS', 'AIML'] },
      campusId: campus.id 
    }
  })

  const deptNames = departments.map(d => d.name)
  await prisma.department.deleteMany({
    where: { 
      name: { in: ['CSE', 'IT', 'AIDS', 'AIML'] },
      campusId: campus.id 
    }
  })
  console.log(`✅ Deleted departments: ${deptNames.join(', ') || 'none'}`)

  // Step 14: Delete test campus
  await prisma.campus.deleteMany({
    where: { name: 'Test Seed Organization' }
  })
  console.log('✅ Deleted test campus')

  // Step 15: Clean up test admin if created
  const testAdmin = await prisma.user.findUnique({
    where: { email: 'testadmin@seed.org' }
  })

  if (testAdmin) {
    // Delete any question groups created by this admin
    const adminQuestionGroups = await prisma.questionGroup.findMany({
      where: { creatorId: testAdmin.id }
    })

    for (const qg of adminQuestionGroups) {
      await prisma.question.deleteMany({
        where: { groupId: qg.id }
      })
    }

    await prisma.questionGroup.deleteMany({
      where: { creatorId: testAdmin.id }
    })

    await prisma.user.delete({
      where: { email: 'testadmin@seed.org' }
    })
    console.log('✅ Deleted test admin user')
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ Sample data removed successfully!')
  console.log('='.repeat(50))
  console.log('\n📊 Removed:')
  console.log(`   🏫 Campus: Test Seed Organization`)
  console.log(`   📚 Departments: CSE, IT, AIDS, AIML`)
  console.log(`   📅 Batches: 2014-2018, 2022-2026`)
  console.log(`   👥 Users: ${users.length} (seedtestuser1-20)`)
  console.log(`   📝 Question Group: Test Seed Quiz Group`)
  console.log(`   ❓ Questions: All AWS questions`)
  console.log(`   🎯 Quiz: Test Seed Quiz`)
  console.log(`   📋 Enrollments: All removed`)
  console.log('\n' + '='.repeat(50))
}

main()
  .catch((e) => {
    console.error('❌ Error removing sample data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
