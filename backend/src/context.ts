import { PrismaClient, Role, User } from '@prisma/client'
import dotenv from 'dotenv'
import { verifyCognitoIdToken } from './auth/cognito.js'

dotenv.config()

export const prisma = new PrismaClient()

export type AppContext = {
  prisma: PrismaClient
  currentUser: User | null
}

export async function buildContext({ req }: { req: any }): Promise<AppContext> {
  const authHeader = req.headers['authorization'] || req.headers['Authorization']
  let currentUser: User | null = null
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length)
    try {
      const verified = await verifyCognitoIdToken(token, {
        issuer: process.env.COGNITO_ISSUER!,
        audience: process.env.COGNITO_USER_POOL_CLIENT_ID!,
      })
      // Find or create user by cognitoSub
      currentUser = await prisma.user.findUnique({ where: { cognitoSub: verified.sub } })
      const role: Role | null = verified.role as any
      const maybeRole: Role | undefined = role ?? undefined
      if (!currentUser) {
        currentUser = await prisma.user.create({
          data: {
            cognitoSub: verified.sub,
            email: verified.email ?? `${verified.sub}@example.invalid`,
            name: verified.name ?? 'Unknown',
            role: maybeRole ?? 'ATHLETE',
          },
        })
      } else {
        // Optionally synchronize email/name/role from Cognito
        const updates: Partial<User> = {}
        if (verified.email && verified.email !== currentUser.email) updates.email = verified.email
        if (verified.name && verified.name !== currentUser.name) updates.name = verified.name
        if (maybeRole && maybeRole !== currentUser.role) updates.role = maybeRole
        if (Object.keys(updates).length > 0) {
          currentUser = await prisma.user.update({ where: { id: currentUser.id }, data: updates })
        }
      }
    } catch (err) {
      // Ignore token errors for anonymous; resolvers will enforce auth
      // console.error('Token verification failed', err)
    }
  }

  return {
    prisma,
    currentUser,
  }
}
