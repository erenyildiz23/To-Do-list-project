import { action, sessions } from 'forjr'

export const signOut = action('signOut', {
  about: 'Ends the session of this browser',
  access: 'signedIn',
  run: async () => {
    sessions.end()
  },
})
