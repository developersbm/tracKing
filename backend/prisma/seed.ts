import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create sample users
  const coach = await prisma.user.upsert({
    where: { cognitoSub: 'sub-coach-1' },
    update: {},
    create: {
      cognitoSub: 'sub-coach-1',
      email: 'coach1@example.com',
      name: 'Coach One',
      role: 'COACH',
    },
  })

  const athlete = await prisma.user.upsert({
    where: { cognitoSub: 'sub-athlete-1' },
    update: {},
    create: {
      cognitoSub: 'sub-athlete-1',
      email: 'athlete1@example.com',
      name: 'Athlete One',
      role: 'ATHLETE',
    },
  })

  // Link coach and athlete
  await prisma.coachAthleteLink.upsert({
    where: { coachId_athleteId: { coachId: coach.id, athleteId: athlete.id } },
    update: {},
    create: { coachId: coach.id, athleteId: athlete.id },
  })

  // Create exercises
  const curl = await prisma.exercise.upsert({
    where: { id: 'exercise-bicep-curl' },
    update: {},
    create: {
      id: 'exercise-bicep-curl',
      name: 'Bicep Curl',
      code: 'BICEP_CURL',
      description: 'Dumbbell bicep curl',
      createdById: coach.id,
    },
  })

  // Create template
  const template = await prisma.workoutTemplate.create({
    data: {
      name: 'Arms Day',
      description: 'Biceps focus',
      coachId: coach.id,
      exercises: {
        create: [
          { exerciseId: curl.id, order: 1, targetSets: 3, targetReps: 12 },
        ],
      },
    },
    include: { exercises: true },
  })

  // Assign workout
  const today = new Date()
  const nextWeek = new Date(today.getTime() + 7 * 24 * 3600 * 1000)
  const assigned = await prisma.assignedWorkout.create({
    data: {
      workoutTemplateId: template.id,
      athleteId: athlete.id,
      startDate: today,
      endDate: nextWeek,
      notes: 'Focus on form quality',
    },
  })

  // Create session with reps
  const session = await prisma.session.create({
    data: {
      athleteId: athlete.id,
      assignedWorkoutId: assigned.id,
      exerciseId: curl.id,
      startTime: new Date(),
    },
  })

  await prisma.rep.createMany({
    data: [
      { sessionId: session.id, repNumber: 1, timestamp: new Date(), formScore: 0.92, isCorrect: true, angleDown: 170, angleUp: 50 },
      { sessionId: session.id, repNumber: 2, timestamp: new Date(), formScore: 0.6, isCorrect: false, angleDown: 165, angleUp: 75 },
      { sessionId: session.id, repNumber: 3, timestamp: new Date(), formScore: 0.88, isCorrect: true, angleDown: 168, angleUp: 55 },
    ],
  })

  // End session
  const reps = await prisma.rep.findMany({ where: { sessionId: session.id } })
  const total = reps.length
  const correct = reps.filter((r: { isCorrect: boolean }) => r.isCorrect).length
  const avg = total ? reps.reduce((a: number, r: { formScore: number }) => a + r.formScore, 0) / total : 0
  await prisma.session.update({
    where: { id: session.id },
    data: { endTime: new Date(), totalReps: total, correctReps: correct, formScoreAvg: avg },
  })

  console.log('Seed completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
