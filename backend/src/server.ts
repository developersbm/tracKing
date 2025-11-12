import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import session from 'express-session'
import { Issuer, generators } from 'openid-client'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { typeDefs } from './schema/typeDefs.js'
import { resolvers } from './schema/resolvers.js'
import { buildContext } from './context.js'

const app = express()

// View engine for simple demo pages (optional; frontend will be React)
app.set('views', 'views')
app.set('view engine', 'ejs')

app.use(cors())

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'some secret',
    resave: false,
    saveUninitialized: false,
  })
)

app.get('/healthz', (_req, res) => res.status(200).send('ok'))

async function start() {
  const server = new ApolloServer({ typeDefs, resolvers })
  await server.start()

  // Ensure OpenID Connect client is discovered for Cognito
  const issuer = await Issuer.discover(process.env.COGNITO_ISSUER || '')
  const client = new issuer.Client({
    client_id: process.env.COGNITO_USER_POOL_CLIENT_ID || '',
    client_secret: process.env.COGNITO_CLIENT_SECRET || undefined,
    redirect_uris: [process.env.COGNITO_REDIRECT_URI || '/auth/callback'],
    response_types: ['code'],
  })

  // Simple middleware to expose authentication state based on session
  const checkAuth = (req: any, _res: any, next: any) => {
    if (!req.session || !req.session.userInfo) {
      req.isAuthenticated = false
    } else {
      req.isAuthenticated = true
    }
    next()
  }

  // Helper to parse a full URL to a path
  function getPathFromURL(urlString: string) {
    try {
      const url = new URL(urlString)
      return url.pathname
    } catch (error) {
      console.error('Invalid URL:', error)
      return null
    }
  }

  // Login route - redirect to Cognito Hosted UI
  app.get('/login', (req: any, res) => {
    const nonce = generators.nonce()
    const state = generators.state()

    req.session.nonce = nonce
    req.session.state = state

    const authUrl = client.authorizationUrl({
      scope: 'openid email profile',
      state: state,
      nonce: nonce,
      redirect_uri: process.env.COGNITO_REDIRECT_URI || '/auth/callback',
    })

    res.redirect(authUrl)
  })

  // Callback route - path derived from redirect URI
  const callbackPath = (() => {
    const r = process.env.COGNITO_REDIRECT_URI || '/auth/callback'
    const p = getPathFromURL(r)
    return p || r
  })()

  app.get(callbackPath, async (req: any, res) => {
    try {
      const params = client.callbackParams(req)
      const tokenSet = await client.callback(process.env.COGNITO_REDIRECT_URI || callbackPath, params, {
        nonce: req.session.nonce,
        state: req.session.state,
      })

  const accessToken = tokenSet.access_token as string | undefined
  const userInfo = accessToken ? await client.userinfo(accessToken) : {}
      req.session.userInfo = userInfo

      res.redirect('/')
    } catch (err) {
      console.error('Callback error:', err)
      res.redirect('/')
    }
  })

  // Logout - destroy session and redirect to Cognito logout
  app.get('/logout', (req: any, res) => {
    req.session.destroy(() => {})
    const domain = process.env.COGNITO_DOMAIN || '<user-pool-domain>'
    const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID || ''
    const logoutUri = process.env.COGNITO_LOGOUT_URI || '/'
    const logoutUrl = `https://${domain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`
    res.redirect(logoutUrl)
  })

  // Home route - renders a lightweight page for demo
  app.get('/', checkAuth, (req: any, res: any) => {
    res.render('home', {
      isAuthenticated: req.isAuthenticated,
      userInfo: req.session.userInfo,
    })
  })

  // Mount GraphQL after session middleware so resolvers can access sessions if needed
  app.use('/graphql', express.json(), expressMiddleware(server, { context: buildContext as any }))

  const port = Number(process.env.PORT || 4000)
  app.listen(port, () => {
    console.log(`GraphQL server ready at http://localhost:${port}/graphql`)
  })
}

start().catch((err) => {
  console.error('Server failed to start', err)
  process.exit(1)
})
