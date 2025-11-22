import passport from 'passport'

// The `auth` middleware uses Passport to authenticate the user using the JWT strategy.
// The `session: false` option disables session support, so each request must be authenticated separately.
export default passport.authenticate('jwt', { session: false })
