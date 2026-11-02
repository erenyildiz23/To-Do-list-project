# To-Do List

**English** · [Türkçe](README.tr.md)

A multi-user to-do app built with [Forjr](https://www.npmjs.com/package/forjr). The interface is in Turkish.

- Sign up, sign in and sign out (passwords are hashed, failed attempts are rate-limited)
- Tasks with priority, due date, description, subtasks ("steps"), projects and tags
- Filters (All / Active / Done / by project) and a progress bar
- Every user sees and changes only their own data
- Personalisation: theme (system / light / dark), accent color, text size, density, sort order, hide completed. Settings are stored on the account, so they follow the user to every device
- Responsive; every text/background pair passes WCAG AA (4.5:1) contrast in both themes

## Running it

You need npm (Forjr brings the Node.js version it runs on).

```bash
npm install
npx forjr dev --port 3000
```

Then open http://localhost:3000 and create an account at `/sign-up`.

| Command | What it does |
|---|---|
| `npx forjr dev` | Development server, reloads on file changes |
| `npx forjr check` | Runs every rule and the type checker, prints each problem with its fix |
| `npx forjr test` | Runs the tests in `tests/`; tests whose code and data did not change are replayed (`--all` runs every one) |
| `npx forjr build` | Writes a production bundle to `.forjr/build/` |
| `npx forjr map` | A short map of the app: each definition, who may call it, what it reads and writes |

The database lives in `.forjr/data.db` and is not committed.

## Project layout

```
forjr.ts              Project definition: title, sign-in page, language
functions/
  users.ts            users table, sign-up (signUp)
  signIn.ts           sign-in
  signOut.ts          sign-out
  profile.ts          reading your own profile, display preferences, display name
  tasks.ts            tasks
  subtasks.ts         subtasks
  projects.ts         projects
  tags.ts             tags and task-tag links
screens/
  home.tsx, home.css  main screen and settings panel; design tokens at the top of home.css
  signIn.tsx, signUp.tsx, auth.css
messages/tr.ts        Turkish form and error messages
tests/                app tests written with node:test
```

## How I used Forjr

A Forjr app is made of **definitions** of the form `export const name = word('name', { ... })`. The engine reads them and builds the database, the API, the access checks and the pages itself. Below are the pieces this project uses and why.

### 1. Tables and access rules

Each table states who may read and write it. A rule that is left out means `'nobody'`.

```ts
export const tasks = table('tasks', {
  columns: {
    title: text({ min: 1, max: 200 }),
    ownerId: link('users', { optional: true }),
    project: link('projects', { optional: true, onRemove: 'clear' }),
    priority: choice(['low', 'medium', 'high'], { default: 'medium' }),
    // ...
  },
  owner: 'ownerId',
  access: { read: 'owner', add: 'signedIn', change: 'owner', remove: 'owner' },
})
```

- `owner: 'ownerId'`: the engine fills this column with the user who adds the row.
- `read: 'owner'`: queries only return the caller's own rows. User isolation lives in the table rule, not in a filter in app code, so forgetting a filter in some query cannot leak data.
- `onRemove`: what happens when a linked row is removed. Removing a project leaves its tasks without a project (`'clear'`); removing a task also removes its subtasks and tag links (`'remove'`). Without this, linked rows could not be removed at all, which the tests caught.

### 2. Queries and changes

Data is written only by a `change`; a `query` only reads. Both are declarative:

```ts
export const activeTasks = query('activeTasks', {
  access: 'signedIn',
  rows: tasks.where({ done: false }).newest('createdAt').limit(50),
})

export const savePreferences = change('savePreferences', {
  access: 'signedIn',
  input: { theme: choice(['system', 'light', 'dark']), /* ... */ },
  set: users.change(caller('id'), { theme: input('theme'), /* ... */ }),
})
```

`caller('id')` stands for the calling user, so a user can only ever change their own record.

### 3. Rules that look at the input: `allow`

To stop anyone from adding a subtask or a tag to someone else's task, I check that the linked row belongs to the caller. The `db` handed to `allow` reads as the caller, so it cannot see other users' rows:

```ts
access: allow((user, input, db) => !!user && db.tasks.where({ id: input.taskId }).count() > 0),
```

### 4. Authentication

Forjr has no built-in sign-in. It gives you the pieces, and the sign-in is the project's own code. I followed `forjr docs topic.signIn`:

- `passwords.hash` / `passwords.check`: passwords are never stored in plain text. The `password` column is `private: true`, so no query ever returns it.
- `attempts.limit`: more than 5 failed attempts for one email within 10 minutes are blocked (and at most 50 per hour per account overall).
- `sessions.start(user.id)` / `sessions.end()`: sets a session cookie that scripts cannot read (`HttpOnly`, `SameSite=Lax`).
- Sign-up reaches an `addUser` change whose access is `'nobody'` through `call`, so nothing from outside can write a user directly.
- `project({ signInPath: '/sign-in' })`: a visitor who opens a page that needs a sign-in is sent there.

### 5. Screens

A `screen` is React. It reads queries through `data` and calls changes with `Form` and `useCall`:

```tsx
export const homeScreen = screen('homeScreen', {
  path: '/',
  access: 'signedIn',
  data: { active: read(activeTasks), me: read(myProfile) /* ... */ },
  view: ({ active, me }) => (
    <Form call={addTask} reset> ... </Form>
  ),
})
```

- `Form` validates inputs against the definition's types, both in the browser and on the server.
- `useCall(fn, { optimistic })` makes actions such as ticking a subtask show up immediately, without waiting for the server.
- Styling is plain CSS. Every color is a CSS custom property (token) at the top of `home.css`. Light and dark themes use CSS `light-dark()`, so the "System" option follows the device theme with no extra code.

### 6. Language

With `project({ languages: ['tr'] })` and `messages/tr.ts`, both the built-in form validation messages (`forjr.required`, `forjr.min`, …) and the app's own error codes (`fail.wrong-sign-in`, and `fail.F0005` for the engine's rate limit) are shown in Turkish.

### 7. Tests

`forjr/test` opens a separate copy of the app on an empty database for each test:

```ts
const app = await testApp()
const ali = await app.user({ email: 'ali@ornek.test', roles: [] })
await app.as(ali).call('addTask', { title: 'Alinin gorevi', priority: 'high' })
await assert.rejects(app.as(ayse).call('removeTask', { id: aliTask.id }))
```

The tests cover:
- **Sign-up and sign-in:** the cookie is really set, the password is hashed, and a wrong password or an old account without a password is refused.
- **User isolation:** reading, changing, removing, and linking to another user's rows.
- **Removal:** what happens to linked rows.
- **Preferences:** they are saved, and only for that user.

`forjr check` also warns about every definition that no test touched.

### Lessons learned

- **Run `forjr check` after every change.** It reports every problem at once, each with its fix; `forjr docs <code>` explains a code.
- **A `run` body is limited to Forjr's own words.** Calling a method on the result of a read (such as `.trim()`) can raise `F0013`.
- **The body of a `/_f/call/<name>` request is `{ "input": { ... } }`.** Inputs do not go at the top level.
- **A dev-server issue I hit:** when two screens imported different definitions from the same functions file, the browser bundle sometimes lost one of the exports after a hot reload ("does not provide an export named …"). Production builds (`forjr build`) are not affected. As a workaround, I split the functions that screens use into separate files (`signIn.ts` / `signOut.ts`, `users.ts` / `profile.ts`).
- **Tokens, not hard-coded colors.** Personalisation (theme, accent color, density) only became possible once every color was moved into variables.
