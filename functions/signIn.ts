import { action, anyone, attempts, fail, passwords, sessions, text } from 'forjr'

export const signIn = action('signIn', {
  about: 'Sign a visitor in as an existing user',
  access: anyone('a visitor signs in'),
  system: 'reads the user of an email, whom nobody may read yet',
  input: { email: text({ max: 254 }), password: text({ max: 200, secret: true }) },
  run: async ({ input, db }) => {
    const email = input.email.trim().toLowerCase()
    attempts.limit(`signIn:${email}`, { tries: 5, per: '10 minutes', address: true })
    attempts.limit(`signIn:${email}`, { tries: 50, per: '1 hour' })
    const user = await db.system.users.where({ email }).first()
    if (!user?.password || !(await passwords.check(input.password, user.password)))
      return fail('wrong-sign-in', 'E-posta ya da şifre hatalı.')
    attempts.clear(`signIn:${email}`, { address: true })
    sessions.start(user.id)
  },
})
