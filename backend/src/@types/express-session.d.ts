declare module 'express-session' {
  import express = require('express')

  interface SessionData {
    nonce?: string
    state?: string
    userInfo?: any
  }

  // Re-export the types so imports still work
  const _: any
  export = _
}
