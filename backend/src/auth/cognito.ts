import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose'

const jwksMap = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

export type CognitoClaims = JWTPayload & {
  sub: string
  email?: string
  name?: string
  'cognito:username'?: string
  'cognito:groups'?: string[]
  token_use?: string
  aud?: string
  iss?: string
}

export type VerifiedUser = {
  sub: string
  email: string | null
  name: string | null
  role: 'ATHLETE' | 'COACH' | null
  raw: CognitoClaims
}

function getJwks(issuer: string) {
  let jwks = jwksMap.get(issuer)
  if (!jwks) {
    const url = new URL(`${issuer}/.well-known/jwks.json`)
    jwks = createRemoteJWKSet(url)
    jwksMap.set(issuer, jwks)
  }
  return jwks
}

export async function verifyCognitoIdToken(token: string, options: {
  issuer: string
  audience: string
}) {
  const { issuer, audience } = options
  const JWKS = getJwks(issuer)
  const { payload } = await jwtVerify(token, JWKS, {
    issuer,
    audience,
  })
  const claims = payload as CognitoClaims
  if (claims.token_use && claims.token_use !== 'id') {
    throw new Error('Invalid token_use; expected id token')
  }

  const groups = claims['cognito:groups'] || []
  let role: 'ATHLETE' | 'COACH' | null = null
  if (Array.isArray(groups) && groups.includes('COACH')) role = 'COACH'
  else if (Array.isArray(groups) && groups.includes('ATHLETE')) role = 'ATHLETE'
  else if ((claims as any)['custom:role']) role = ((claims as any)['custom:role'] as string).toUpperCase() as any

  const user: VerifiedUser = {
    sub: claims.sub,
    email: claims.email ?? null,
    name: claims.name ?? null,
    role,
    raw: claims,
  }
  return user
}
