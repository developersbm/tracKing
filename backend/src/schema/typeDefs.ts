export const typeDefs = /* GraphQL */ `
  scalar DateTime
  scalar Date

  enum Role {
    ATHLETE
    COACH
  }

  enum ExerciseCode {
    BICEP_CURL
    SQUAT
    BENCH_PRESS
  }

  type User {
    id: ID!
    email: String!
    name: String!
    role: Role!
  }

  type Exercise {
    id: ID!
    name: String!
    code: ExerciseCode!
    description: String
    createdById: ID
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type WorkoutTemplate {
    id: ID!
    name: String!
    description: String
    coachId: ID!
    isPublic: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    exercises: [WorkoutTemplateExercise!]!
  }

  input WorkoutTemplateExerciseInput {
    exerciseId: ID!
    order: Int!
    targetSets: Int!
    targetReps: Int!
  }

  type WorkoutTemplateExercise {
    id: ID!
    workoutTemplateId: ID!
    exerciseId: ID!
    order: Int!
    targetSets: Int!
    targetReps: Int!
  }

  type AssignedWorkout {
    id: ID!
    workoutTemplateId: ID!
    athleteId: ID!
    startDate: Date!
    endDate: Date!
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Session {
    id: ID!
    athleteId: ID!
    assignedWorkoutId: ID
    exerciseId: ID!
    startTime: DateTime!
    endTime: DateTime
    totalReps: Int!
    correctReps: Int!
    formScoreAvg: Float!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Rep {
    id: ID!
    sessionId: ID!
    repNumber: Int!
    timestamp: DateTime!
    formScore: Float!
    isCorrect: Boolean!
    angleDown: Float
    angleUp: Float
  }

  input DateRangeInput {
    from: DateTime
    to: DateTime
  }

  input RepInput {
    repNumber: Int!
    timestamp: DateTime!
    formScore: Float!
    isCorrect: Boolean!
    angleDown: Float
    angleUp: Float
  }

  type AthleteSummary {
    athlete: User!
    sessionsCount: Int!
    totalReps: Int!
    correctReps: Int!
    correctPercentage: Float!
    totalTimeMinutes: Float!
  }

  type Query {
    me: User
    exercises: [Exercise!]!
    assignedWorkoutsForAthlete(athleteId: ID!): [AssignedWorkout!]!
    sessionsForAthlete(athleteId: ID!, dateRange: DateRangeInput): [Session!]!
    session(id: ID!): Session
    repsForSession(sessionId: ID!): [Rep!]!

    coachAthletes: [User!]!
    coachAthleteSummary(athleteId: ID!, dateRange: DateRangeInput): AthleteSummary!
    coachOverview(dateRange: DateRangeInput): [AthleteSummary!]!
  }

  type Mutation {
    linkAthleteByEmail(athleteEmail: String!): User!

    createExercise(name: String!, code: ExerciseCode!, description: String): Exercise!
    createWorkoutTemplate(name: String!, description: String, exerciseConfigs: [WorkoutTemplateExerciseInput!]!): WorkoutTemplate!
    assignWorkoutToAthlete(workoutTemplateId: ID!, athleteId: ID!, startDate: Date!, endDate: Date!): AssignedWorkout!

    startSession(exerciseId: ID!, assignedWorkoutId: ID): Session!
    logReps(sessionId: ID!, reps: [RepInput!]!): Session!
    endSession(sessionId: ID!): Session!
    createUploadUrl(sessionId: ID!, repId: ID!): String!  # Stub S3 pre-signed URL
  }
`
