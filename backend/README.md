# TracKing Backend (GraphQL + Prisma + Cognito)

TypeScript Node backend using Apollo Server, Prisma (PostgreSQL), and AWS Cognito for authentication.

## Stack
- Node.js + TypeScript
- Apollo Server (GraphQL)
- Prisma ORM (PostgreSQL on AWS RDS)
- Auth: AWS Cognito ID tokens (JWT) verification via JWKs
- Optional storage (future): S3 pre-signed URLs

## Project structure
```
backend/
  src/
    auth/
      cognito.ts         # Verify Cognito ID tokens
      guards.ts          # AuthZ helpers
    schema/
      typeDefs.ts        # GraphQL SDL
      resolvers.ts       # GraphQL resolvers
    context.ts           # Context (prisma + currentUser)
    server.ts            # Express + Apollo bootstrap
  prisma/
    schema.prisma        # Prisma models
    seed.ts              # Local dev seeding
  package.json
  tsconfig.json
  .env.example
```

## Environment variables
Copy `.env.example` to `.env` and set values:

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname?schema=public
COGNITO_REGION=us-west-2
COGNITO_USER_POOL_ID=xxxxxx
COGNITO_USER_POOL_CLIENT_ID=xxxxxx
COGNITO_ISSUER=https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}
PORT=4000
NODE_ENV=development
```

In production, prefer AWS Secrets Manager or SSM Parameter Store rather than a .env file.

## Setup

1. Install dependencies
2. Generate Prisma client and run migrations
3. Seed database (optional for local dev)
4. Start the server

### Quick start

These commands run from the `backend` directory.

```bash
# 1) Install
npm install

# 2) Prisma generate & migrate
npx prisma generate
npx prisma migrate dev --name init

# 3) Seed (optional)
npm run prisma:seed

# 4) Start dev server
npm run dev
# or build & run
npm run build && npm start
```

GraphQL endpoint will be available at:

- http://localhost:${PORT:-4000}/graphql
- Healthcheck: http://localhost:${PORT:-4000}/healthz

## Auth flow (Cognito)
- Frontend obtains a Cognito ID token (Hosted UI or Amplify/Auth SDK)
- Send `Authorization: Bearer <ID_TOKEN>` to this backend
- Backend verifies against `COGNITO_ISSUER` JWKs, checks audience
- If user (by `cognitoSub`) doesn’t exist, an auto-provisioned user is created
- Role is inferred from `cognito:groups` (COACH/ATHLETE) or `custom:role`

## GraphQL operations (examples)

```
query { me { id name email role } }
```

```
mutation {
  startSession(exerciseId: "exercise-bicep-curl") { id startTime exerciseId }
}
```

See `src/schema/typeDefs.ts` for full schema including coach dashboard queries.

## Notes
- Ensure your `DATABASE_URL` points to your local Postgres or RDS instance
- Configure CORS as needed in `src/server.ts`
- For production, deploy behind ALB (ECS Fargate) or API Gateway + Lambda
