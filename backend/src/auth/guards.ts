import { PrismaClient, Role, User } from '@prisma/client'
import { GraphQLError } from 'graphql'

export interface Context {
  prisma: PrismaClient
  currentUser: User | null
}

export function requireAuth(ctx: Context) {
  if (!ctx.currentUser) {
    throw new GraphQLError('UNAUTHENTICATED', { extensions: { code: 'UNAUTHENTICATED' } })
  }
}

export function requireRole(ctx: Context, role: Role) {
  requireAuth(ctx)
  if (ctx.currentUser!.role !== role) {
    throw new GraphQLError('FORBIDDEN', { extensions: { code: 'FORBIDDEN' } })
  }
}

export async function assertSelfOrLinkedAthlete(ctx: Context, athleteId: string) {
  requireAuth(ctx)
  const me = ctx.currentUser!
  if (me.id === athleteId) return
  if (me.role === 'COACH') {
    const link = await ctx.prisma.coachAthleteLink.findFirst({
      where: { coachId: me.id, athleteId },
      select: { id: true },
    })
    if (link) return
  }
  throw new GraphQLError('FORBIDDEN', { extensions: { code: 'FORBIDDEN' } })
}
