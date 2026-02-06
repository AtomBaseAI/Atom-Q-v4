import { PrismaClient, UserRole, DifficultyLevel, QuizStatus, QuestionType, StudentSection } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting sample data seeding...')

  // Step 1: Create or find Campus "Test Seed Organization"
  console.log('\n📍 Step 1: Creating campus...')
  let campus = await prisma.campus.findFirst({
    where: { name: 'Test Seed Organization' }
  })

  if (!campus) {
    campus = await prisma.campus.create({
      data: {
        name: 'Test Seed Organization',
        shortName: 'TSO',
        location: 'Test Location',
        isActive: true,
      },
    })
    console.log('✅ Created campus:', campus.name)
  } else {
    console.log('✅ Found existing campus:', campus.name)
  }

  // Step 2: Create 4 departments (CSE, IT, AIDS, AIML)
  console.log('\n📚 Step 2: Creating departments...')
  const departments = ['CSE', 'IT', 'AIDS', 'AIML']
  const createdDepartments = []

  for (const deptName of departments) {
    let dept = await prisma.department.findFirst({
      where: {
        name: deptName,
        campusId: campus.id
      }
    })

    if (!dept) {
      dept = await prisma.department.create({
        data: {
          name: deptName,
          campusId: campus.id,
        },
      })
      console.log(`✅ Created department: ${dept.name}`)
    } else {
      console.log(`✅ Found existing department: ${dept.name}`)
    }
    createdDepartments.push(dept)
  }

  // Step 3: Create 2 batches (2014-2018, 2022-2026)
  console.log('\n📅 Step 3: Creating batches...')
  const batches = ['2014-2018', '2022-2026']
  const createdBatches = []

  for (const batchName of batches) {
    let batch = await prisma.batch.findFirst({
      where: {
        name: batchName,
        campusId: campus.id
      }
    })

    if (!batch) {
      batch = await prisma.batch.create({
        data: {
          name: batchName,
          campusId: campus.id,
          isActive: true,
        },
      })
      console.log(`✅ Created batch: ${batch.name}`)
    } else {
      console.log(`✅ Found existing batch: ${batch.name}`)
    }
    createdBatches.push(batch)
  }

  // Step 4: Create 20 sample users (seedtestuser1 to seedtestuser20)
  console.log('\n👥 Step 4: Creating sample users...')
  const userPassword = await bcrypt.hash('testuser123', 10)
  const users = []

  for (let i = 1; i <= 20; i++) {
    const email = `seedtestuser${i}@test.org`
    
    let user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // Calculate department (5 users per department)
      const deptIndex = Math.floor((i - 1) / 5) % 4
      const departmentId = createdDepartments[deptIndex].id

      // Calculate batch (10 users per batch)
      const batchIndex = Math.floor((i - 1) / 10) % 2
      const batchId = createdBatches[batchIndex].id

      // Calculate section (5 users per section A, B, C, D)
      const sectionIndex = Math.floor((i - 1) / 5) % 4
      const sectionValues: StudentSection[] = ['A', 'B', 'C', 'D']
      const section = sectionValues[sectionIndex]

      // Generate unique UOID
      const uoid = `TSO${String(i).padStart(3, '0')}`

      user = await prisma.user.create({
        data: {
          uoid,
          email,
          name: `Seed Test User ${i}`,
          password: userPassword,
          role: UserRole.USER,
          campusId: campus.id,
          departmentId,
          batchId,
          section,
          isActive: true,
        },
      })
      console.log(`✅ Created user: ${email}`)
      users.push(user)
    } else {
      console.log(`✅ Found existing user: ${email}`)
      users.push(user)
    }
  }

  console.log(`\n📊 User Enrollment Summary:`)
  console.log(`   Total users created: ${users.length}`)
  
  // Count users per department
  for (const dept of createdDepartments) {
    const count = users.filter(u => u.departmentId === dept.id).length
    console.log(`   ${dept.name}: ${count} users`)
  }
  
  // Count users per batch
  for (const batch of createdBatches) {
    const count = users.filter(u => u.batchId === batch.id).length
    console.log(`   ${batch.name}: ${count} users`)
  }

  // Step 5: Create Question Group "Test Seed Quiz Group"
  console.log('\n📝 Step 5: Creating question group...')
  
  // Find or create an admin user as creator
  let creator = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN }
  })

  if (!creator) {
    creator = await prisma.user.create({
      data: {
        uoid: 'TESTADMIN',
        email: 'testadmin@seed.org',
        name: 'Test Admin for Seed',
        password: await bcrypt.hash('admin123', 10),
        role: UserRole.ADMIN,
        isActive: true,
      },
    })
    console.log('✅ Created admin user for seed data')
  }

  let questionGroup = await prisma.questionGroup.findFirst({
    where: {
      name: 'Test Seed Quiz Group',
      creatorId: creator.id
    }
  })

  if (!questionGroup) {
    questionGroup = await prisma.questionGroup.create({
      data: {
        name: 'Test Seed Quiz Group',
        description: 'Test seed data quiz group with AWS questions',
        isActive: true,
        creatorId: creator.id,
      },
    })
    console.log('✅ Created question group:', questionGroup.name)
  } else {
    console.log('✅ Found existing question group:', questionGroup.name)
  }

  // Step 6: Add 10 AWS questions with all quiz formats
  console.log('\n❓ Step 6: Adding AWS questions...')
  
  const awsQuestions = [
    {
      title: 'Amazon S3 Storage Classes',
      content: 'Which S3 storage class is designed for data that is accessed infrequently but requires rapid access when needed?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: JSON.stringify(['Standard', 'Standard-IA', 'Glacier', 'One Zone-IA']),
      correctAnswer: 'Standard-IA',
      explanation: 'Standard-IA (Infrequent Access) is designed for data that is accessed less frequently but requires rapid access when needed.',
      difficulty: DifficultyLevel.EASY
    },
    {
      title: 'AWS Lambda Triggers',
      content: 'AWS Lambda can be triggered by which of the following AWS services?',
      type: QuestionType.MULTI_SELECT,
      options: JSON.stringify(['Amazon S3', 'Amazon DynamoDB', 'Amazon Kinesis', 'Amazon EC2']),
      correctAnswer: '["Amazon S3","Amazon DynamoDB","Amazon Kinesis"]',
      explanation: 'AWS Lambda can be triggered by Amazon S3, DynamoDB, Kinesis, SNS, CloudWatch Events, and more. Amazon EC2 cannot directly trigger Lambda functions.',
      difficulty: DifficultyLevel.MEDIUM
    },
    {
      title: 'EC2 Instance Types',
      content: 'True or False: T2 instances are burstable general-purpose instances.',
      type: QuestionType.TRUE_FALSE,
      options: JSON.stringify(['True', 'False']),
      correctAnswer: 'True',
      explanation: 'T2 instances are burstable general-purpose instances that provide a baseline level of CPU performance with the ability to burst above the baseline.',
      difficulty: DifficultyLevel.EASY
    },
    {
      title: 'VPC Subnets',
      content: 'In a VPC, subnets are always _______.',
      type: QuestionType.FILL_IN_BLANK,
      options: JSON.stringify(['public', 'private', 'isolated', 'regional']),
      correctAnswer: 'isolated',
      explanation: 'In a VPC, subnets are always isolated from each other and from the internet unless explicitly configured.',
      difficulty: DifficultyLevel.MEDIUM
    },
    {
      title: 'RDS Backup',
      content: 'Which AWS RDS feature automatically backs up your database?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: JSON.stringify(['Auto Scaling', 'Multi-AZ', 'Automated Backups', 'Read Replicas']),
      correctAnswer: 'Automated Backups',
      explanation: 'Automated Backups is an RDS feature that automatically backs up your database during a specific time window and retains backups for a specified period.',
      difficulty: DifficultyLevel.EASY
    },
    {
      title: 'IAM Policies',
      content: 'Which of the following are valid IAM policy elements? (Select all that apply)',
      type: QuestionType.MULTI_SELECT,
      options: JSON.stringify(['Version', 'Statement', 'Effect', 'Action', 'Resource']),
      correctAnswer: '["Version","Statement","Effect","Action","Resource"]',
      explanation: 'All of these are valid IAM policy elements. Version, Statement, Effect, Action, and Resource are the core elements of IAM policies.',
      difficulty: DifficultyLevel.HARD
    },
    {
      title: 'CloudFront',
      content: 'True or False: CloudFront delivers content using a global network of edge locations.',
      type: QuestionType.TRUE_FALSE,
      options: JSON.stringify(['True', 'False']),
      correctAnswer: 'True',
      explanation: 'Amazon CloudFront is a fast content delivery network (CDN) service that securely delivers data, videos, applications, and APIs to customers globally with low latency.',
      difficulty: DifficultyLevel.EASY
    },
    {
      title: 'EBS Volume Types',
      content: 'Which EBS volume type is optimized for boot volumes and provides low latency?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: JSON.stringify(['gp2', 'gp3', 'io1', 'st1']),
      correctAnswer: 'gp2',
      explanation: 'gp2 (General Purpose SSD) is the default EBS volume type and is optimized for boot volumes and provides low latency.',
      difficulty: DifficultyLevel.MEDIUM
    },
    {
      title: 'Elastic Load Balancing',
      content: 'ELB distributes incoming application traffic across _______.',
      type: QuestionType.FILL_IN_BLANK,
      options: JSON.stringify(['servers', 'regions', 'availability zones', 'VPCs']),
      correctAnswer: 'servers',
      explanation: 'Elastic Load Balancing automatically distributes incoming application traffic across multiple targets, such as EC2 instances, containers, and IP addresses.',
      difficulty: DifficultyLevel.MEDIUM
    },
    {
      title: 'AWS Regions',
      content: 'Which AWS service is NOT available in all AWS Regions?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: JSON.stringify(['Amazon EC2', 'Amazon S3', 'AWS Lambda', 'All services are available in all regions']),
      correctAnswer: 'All services are available in all regions',
      explanation: 'Not all AWS services are available in every AWS Region. AWS continuously expands service availability across regions.',
      difficulty: DifficultyLevel.EASY
    }
  ]

  const createdQuestions = []
  for (const q of awsQuestions) {
    let question = await prisma.question.findFirst({
      where: {
        groupId: questionGroup.id,
        title: q.title
      }
    })

    if (!question) {
      question = await prisma.question.create({
        data: {
          title: q.title,
          content: q.content,
          type: q.type,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          groupId: questionGroup.id,
          isActive: true,
        },
      })
      console.log(`✅ Created question: ${q.title} (${q.type})`)
      createdQuestions.push(question)
    } else {
      console.log(`✅ Found existing question: ${q.title}`)
      createdQuestions.push(question)
    }
  }

  console.log(`\n📊 Question Formats Summary:`)
  const formatCounts: Record<string, number> = {}
  createdQuestions.forEach(q => {
    formatCounts[q.type] = (formatCounts[q.type] || 0) + 1
  })
  Object.entries(formatCounts).forEach(([format, count]) => {
    console.log(`   ${format}: ${count} questions`)
  })

  // Step 7: Create Quiz "Test Seed Quiz"
  console.log('\n🎯 Step 7: Creating quiz...')
  
  let quiz = await prisma.quiz.findFirst({
    where: {
      title: 'Test Seed Quiz',
      campusId: campus.id
    }
  })

  if (!quiz) {
    quiz = await prisma.quiz.create({
      data: {
        title: 'Test Seed Quiz',
        description: 'Test seed data quiz with AWS questions',
        timeLimit: 30, // 30 minutes
        difficulty: DifficultyLevel.MEDIUM,
        status: QuizStatus.ACTIVE,
        negativeMarking: false,
        randomOrder: false,
        showAnswers: true,
        creatorId: creator.id,
        campusId: campus.id,
      },
    })
    console.log('✅ Created quiz:', quiz.title)
  } else {
    console.log('✅ Found existing quiz:', quiz.title)
  }

  // Step 8: Enroll all seedtestusers in the quiz
  console.log('\n📋 Step 8: Enrolling users in quiz...')
  
  for (const user of users) {
    const existingQuizUser = await prisma.quizUser.findUnique({
      where: {
        quizId_userId: {
          quizId: quiz.id,
          userId: user.id
        }
      }
    })

    if (!existingQuizUser) {
      await prisma.quizUser.create({
        data: {
          quizId: quiz.id,
          userId: user.id,
        },
      })
    }
  }
  console.log(`✅ Enrolled ${users.length} users in quiz`)

  // Step 9: Add all questions from Test Seed Quiz Group to the quiz
  console.log('\n➕ Step 9: Adding questions to quiz...')
  
  for (let i = 0; i < createdQuestions.length; i++) {
    const question = createdQuestions[i]
    
    const existingQuizQuestion = await prisma.quizQuestion.findUnique({
      where: {
        quizId_questionId: {
          quizId: quiz.id,
          questionId: question.id
        }
      }
    })

    if (!existingQuizQuestion) {
      await prisma.quizQuestion.create({
        data: {
          quizId: quiz.id,
          questionId: question.id,
          order: i + 1,
          points: 1.0,
        },
      })
    }
  }
  console.log(`✅ Added ${createdQuestions.length} questions to quiz`)

  console.log('\n' + '='.repeat(50))
  console.log('✅ Sample data seeded successfully!')
  console.log('='.repeat(50))
  console.log('\n📊 Summary:')
  console.log(`   🏫 Campus: ${campus.name}`)
  console.log(`   📚 Departments: ${createdDepartments.map(d => d.name).join(', ')}`)
  console.log(`   📅 Batches: ${createdBatches.map(b => b.name).join(', ')}`)
  console.log(`   👥 Users: ${users.length} (seedtestuser1-20)`)
  console.log(`   📝 Question Group: ${questionGroup.name}`)
  console.log(`   ❓ Questions: ${createdQuestions.length} (AWS questions)`)
  console.log(`   🎯 Quiz: ${quiz.title}`)
  console.log(`   📋 Enrolled Users: ${users.length}`)
  console.log(`   ➕ Quiz Questions: ${createdQuestions.length}`)
  console.log('\n🔑 User Credentials:')
  console.log('   Email: seedtestuser{1-20}@test.org')
  console.log('   Password: testuser123')
  console.log('\n' + '='.repeat(50))
}

main()
  .catch((e) => {
    console.error('❌ Error seeding sample data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
