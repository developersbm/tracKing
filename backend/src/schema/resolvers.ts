import { GraphQLScalarType, Kind } from 'graphql'
import { AppContext } from '../context.js'
import { requireAuth, requireRole, assertSelfOrLinkedAthlete } from '../auth/guards.js'
import { Role } from '@prisma/client'

// Simple DateTime and Date scalars (ISO strings)
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO-8601 DateTime string',
  serialize: (value: any) => (value instanceof Date ? value.toISOString() : new Date(value).toISOString()),
  parseValue: (value: any) => new Date(value as string),
  parseLiteral: (ast: any) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
})

const DateScalar = new GraphQLScalarType({
  name: 'Date',
  description: 'ISO-8601 Date string',
  serialize: (value: any) => {
    const d = value instanceof Date ? value : new Date(value)
    return d.toISOString().slice(0, 10)
  },
  parseValue: (value: any) => new Date(value as string),
  parseLiteral: (ast: any) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
})

export const resolvers = {
  DateTime: DateTimeScalar,
  Date: DateScalar,

  Query: {
    me: async (_: any, __: any, ctx: AppContext) => {
      requireAuth(ctx as any)
      return ctx.currentUser
    },

    exercises: async (_: any, __: any, ctx: AppContext) => {
      requireAuth(ctx as any)
      return ctx.prisma.exercise.findMany({ orderBy: { name: 'asc' } })
    },

    assignedWorkoutsForAthlete: async (_: any, { athleteId }: { athleteId: string }, ctx: AppContext) => {
      await assertSelfOrLinkedAthlete(ctx as any, athleteId)
      return ctx.prisma.assignedWorkout.findMany({
        where: { athleteId },
        orderBy: { startDate: 'desc' },
      })
    },

    sessionsForAthlete: async (
      _: any,
      { athleteId, dateRange }: { athleteId: string; dateRange?: { from?: Date; to?: Date } },
      ctx: AppContext
    ) => {
      await assertSelfOrLinkedAthlete(ctx as any, athleteId)
      return ctx.prisma.session.findMany({
        where: {
          athleteId,
          startTime: {
            gte: dateRange?.from ?? undefined,
            lte: dateRange?.to ?? undefined,
          },
        },
        orderBy: { startTime: 'desc' },
      })
    },

    session: async (_: any, { id }: { id: string }, ctx: AppContext) => {
      requireAuth(ctx as any)
      const s = await ctx.prisma.session.findUnique({ where: { id } })
      if (!s) return null
      await assertSelfOrLinkedAthlete(ctx as any, s.athleteId)
      return s
    },

    repsForSession: async (_: any, { sessionId }: { sessionId: string }, ctx: AppContext) => {
      requireAuth(ctx as any)
      const s = await ctx.prisma.session.findUnique({ where: { id: sessionId } })
      if (!s) return []
      await assertSelfOrLinkedAthlete(ctx as any, s.athleteId)
      return ctx.prisma.rep.findMany({ where: { sessionId }, orderBy: { repNumber: 'asc' } })
    },

    coachAthletes: async (_: any, __: any, ctx: AppContext) => {
      requireRole(ctx as any, Role.COACH)
      const me = ctx.currentUser!
      const links = await ctx.prisma.coachAthleteLink.findMany({ where: { coachId: me.id } })
  const athletes = await ctx.prisma.user.findMany({ where: { id: { in: links.map((l: { athleteId: string }) => l.athleteId) } } })
      return athletes
    },

    coachAthleteSummary: async (
      _: any,
      { athleteId, dateRange }: { athleteId: string; dateRange?: { from?: Date; to?: Date } },
      ctx: AppContext
    ) => {
      requireRole(ctx as any, Role.COACH)
      await assertSelfOrLinkedAthlete(ctx as any, athleteId)
      return buildAthleteSummary(ctx, athleteId, dateRange)
    },

    coachOverview: async (
      _: any,
      { dateRange }: { dateRange?: { from?: Date; to?: Date } },
      ctx: AppContext
    ) => {
      requireRole(ctx as any, Role.COACH)
      const me = ctx.currentUser!
      const links = await ctx.prisma.coachAthleteLink.findMany({ where: { coachId: me.id } })
  const athleteIds = links.map((l: { athleteId: string }) => l.athleteId)
  const summaries = await Promise.all(athleteIds.map((id: string) => buildAthleteSummary(ctx, id, dateRange)))
      return summaries
    },
  },

  Mutation: {
    linkAthleteByEmail: async (_: any, { athleteEmail }: { athleteEmail: string }, ctx: AppContext) => {
      requireRole(ctx as any, Role.COACH)
      const me = ctx.currentUser!
      const athlete = await ctx.prisma.user.findUnique({ where: { email: athleteEmail } })
      if (!athlete) throw new Error('Athlete not found (must sign in at least once)')
      if (athlete.role !== 'ATHLETE') throw new Error('Target user is not an athlete')
      await ctx.prisma.coachAthleteLink.upsert({
        where: { coachId_athleteId: { coachId: me.id, athleteId: athlete.id } },
        create: { coachId: me.id, athleteId: athlete.id },
        update: {},
      })
      return athlete
    },

    createExercise: async (
      _: any,
      { name, code, description }: { name: string; code: string; description?: string },
      ctx: AppContext
    ) => {
      requireRole(ctx as any, Role.COACH)
      const me = ctx.currentUser!
      return ctx.prisma.exercise.create({
        data: { name, code: code as any, description, createdById: me.id },
      })
    },

    createWorkoutTemplate: async (
      _: any,
      {
        name,
        description,
        exerciseConfigs,
      }: { name: string; description?: string; exerciseConfigs: { exerciseId: string; order: number; targetSets: number; targetReps: number }[] },
      ctx: AppContext
    ) => {
      requireRole(ctx as any, Role.COACH)
      const me = ctx.currentUser!
      return ctx.prisma.workoutTemplate.create({
        data: {
          name,
          description,
          coachId: me.id,
          exercises: {
            create: exerciseConfigs.map((c) => ({
              exerciseId: c.exerciseId,
              order: c.order,
              targetSets: c.targetSets,
              targetReps: c.targetReps,
            })),
          },
        },
        include: { exercises: true },
      })
    },

    assignWorkoutToAthlete: async (
      _: any,
      { workoutTemplateId, athleteId, startDate, endDate }: { workoutTemplateId: string; athleteId: string; startDate: Date; endDate: Date },
      ctx: AppContext
    ) => {
      requireRole(ctx as any, Role.COACH)
      await assertSelfOrLinkedAthlete(ctx as any, athleteId)
      return ctx.prisma.assignedWorkout.create({
        data: { workoutTemplateId, athleteId, startDate, endDate },
      })
    },

    startSession: async (
      _: any,
      { exerciseId, assignedWorkoutId }: { exerciseId: string; assignedWorkoutId?: string | null },
      ctx: AppContext
    ) => {
      requireRole(ctx as any, Role.ATHLETE)
      const me = ctx.currentUser!
      return ctx.prisma.session.create({
        data: { athleteId: me.id, exerciseId, assignedWorkoutId: assignedWorkoutId ?? null, startTime: new Date() },
      })
    },

    logReps: async (
      _: any,
      { sessionId, reps }: { sessionId: string; reps: { repNumber: number; timestamp: Date; formScore: number; isCorrect: boolean; angleDown?: number | null; angleUp?: number | null }[] },
      ctx: AppContext
    ) => {
      requireRole(ctx as any, Role.ATHLETE)
      const me = ctx.currentUser!
      const session = await ctx.prisma.session.findUnique({ where: { id: sessionId } })
      if (!session) throw new Error('Session not found')
      if (session.athleteId !== me.id) throw new Error('FORBIDDEN')

      await ctx.prisma.rep.createMany({
        data: reps.map((r) => ({
          sessionId,
          repNumber: r.repNumber,
          timestamp: r.timestamp,
          formScore: r.formScore,
          isCorrect: r.isCorrect,
          angleDown: r.angleDown ?? null,
          angleUp: r.angleUp ?? null,
        })),
      })

      // Return updated aggregates
      const agg = await ctx.prisma.rep.groupBy({
        by: ['sessionId'],
        where: { sessionId },
        _count: { sessionId: true },
        _sum: { isCorrect: true, formScore: true } as any,
      })
      const count = agg[0]?._count.sessionId ?? 0
      const repsAll = await ctx.prisma.rep.findMany({ where: { sessionId } })
  const correct = repsAll.filter((r: { isCorrect: boolean }) => r.isCorrect).length
  const avg = repsAll.length ? repsAll.reduce((a: number, r: { formScore: number }) => a + r.formScore, 0) / repsAll.length : 0
      return ctx.prisma.session.update({
        where: { id: sessionId },
        data: { totalReps: count, correctReps: correct, formScoreAvg: avg },
      })
    },

    endSession: async (_: any, { sessionId }: { sessionId: string }, ctx: AppContext) => {
      requireRole(ctx as any, Role.ATHLETE)
      const me = ctx.currentUser!
      const session = await ctx.prisma.session.findUnique({ where: { id: sessionId } })
      if (!session) throw new Error('Session not found')
      if (session.athleteId !== me.id) throw new Error('FORBIDDEN')

      const reps = await ctx.prisma.rep.findMany({ where: { sessionId } })
      const total = reps.length
  const correct = reps.filter((r: { isCorrect: boolean }) => r.isCorrect).length
  const avg = total ? reps.reduce((a: number, r: { formScore: number }) => a + r.formScore, 0) / total : 0

      return ctx.prisma.session.update({
        where: { id: sessionId },
        data: { endTime: new Date(), totalReps: total, correctReps: correct, formScoreAvg: avg },
      })
    },

    createUploadUrl: async (_: any, { sessionId, repId }: { sessionId: string; repId: string }, ctx: AppContext) => {
      // Stub: In production generate a real S3 pre-signed URL.
      requireRole(ctx as any, Role.ATHLETE)
      const me = ctx.currentUser!
      const session = await ctx.prisma.session.findUnique({ where: { id: sessionId } })
      if (!session) throw new Error('Session not found')
      if (session.athleteId !== me.id) throw new Error('FORBIDDEN')
      const rep = await ctx.prisma.rep.findUnique({ where: { id: repId } })
      if (!rep || rep.sessionId !== session.id) throw new Error('Rep not found for session')
      // Return a deterministic fake URL so frontend wiring can proceed.
      return `https://example-s3.fake/${sessionId}/${repId}/upload.mp4?signature=stub`
    },
  },
}

async function buildAthleteSummary(ctx: AppContext, athleteId: string, dateRange?: { from?: Date; to?: Date }) {
  const athlete = await ctx.prisma.user.findUnique({ where: { id: athleteId } })
  if (!athlete) throw new Error('Athlete not found')

  const sessions = await ctx.prisma.session.findMany({
    where: {
      athleteId,
      startTime: {
        gte: dateRange?.from ?? undefined,
        lte: dateRange?.to ?? undefined,
      },
    },
  })
  const sessionIds = sessions.map((s: { id: string }) => s.id)
  const reps = sessionIds.length ? await ctx.prisma.rep.findMany({ where: { sessionId: { in: sessionIds } } }) : []

  const totalTimeMinutes = sessions.reduce(
    (acc: number, s: { endTime: Date | null; startTime: Date }) =>
      s.endTime ? acc + (s.endTime.getTime() - s.startTime.getTime()) / 1000 / 60 : acc,
    0
  )

  const totalReps = reps.length
  const correctReps = reps.filter((r: { isCorrect: boolean }) => r.isCorrect).length
  const correctPercentage = totalReps ? (correctReps / totalReps) * 100 : 0

  return {
    athlete,
    sessionsCount: sessions.length,
    totalReps,
    correctReps,
    correctPercentage,
    totalTimeMinutes,
  }
}
