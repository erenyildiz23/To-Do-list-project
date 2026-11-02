import { action, anyone, attempts, boolean, change, choice, fail, passwords, sessions, table, text, list } from 'forjr'

export const users = table('users', {
  columns: {
    email: text({ min: 1, max: 200 }),
    name: text({ optional: true }),
    password: text({ optional: true, private: true }),
    roles: list(text()),
    // Görünüm tercihleri: her kullanıcının kendi kaydında, her cihazda aynı.
    theme: choice(['system', 'light', 'dark'], { default: 'system' }),
    accent: choice(['blue', 'violet', 'green', 'orange', 'pink', 'slate'], { default: 'blue' }),
    density: choice(['comfortable', 'compact'], { default: 'comfortable' }),
    textSize: choice(['small', 'medium', 'large'], { default: 'medium' }),
    sortBy: choice(['newest', 'dueDate', 'priority'], { default: 'newest' }),
    hideCompleted: boolean({ default: false }),
  },
  unique: [['email']],
  access: {
    read: 'owner',
    change: 'owner',
    remove: 'owner',
  },
})

export const addUser = change('addUser', {
  about: 'Writes a new user; only signUp reaches it',
  access: 'nobody',
  system: 'only a sign-up makes a user',
  input: { email: text(), name: text({ optional: true }), password: text() },
  output: text(),
  run: ({ input, db }) => {
    if (db.system.users.where({ email: input.email }).first())
      fail('has-account', 'Bu e-posta ile zaten bir hesap var: giriş yapın.')
    return db.system.users.add({ email: input.email, name: input.name, password: input.password, roles: [] }).id
  },
})

export const signUp = action('signUp', {
  about: 'A visitor makes an account and is signed in',
  access: anyone('a visitor makes an account'),
  system: 'makes the user of whoever signs up',
  input: {
    email: text({ min: 3, max: 254 }),
    name: text({ optional: true, max: 100 }),
    password: text({ min: 8, max: 200, secret: true }),
  },
  run: async ({ input, call }) => {
    attempts.limit('signUp', { tries: 10, per: '1 hour', address: true })
    const password = await passwords.hash(input.password)
    sessions.start(call(addUser, { email: input.email.trim().toLowerCase(), name: input.name, password }))
  },
})
