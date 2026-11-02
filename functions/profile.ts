import { boolean, caller, change, choice, input, query, text } from 'forjr'
import { users } from './users'

export const myProfile = query('myProfile', {
  about: 'The signed-in user, with their display preferences',
  access: 'signedIn',
  live: false,
  rows: users.where({ id: caller('id') }).limit(1),
})

export const savePreferences = change('savePreferences', {
  about: 'Saves the display preferences of the signed-in user',
  access: 'signedIn',
  input: {
    theme: choice(['system', 'light', 'dark']),
    accent: choice(['blue', 'violet', 'green', 'orange', 'pink', 'slate']),
    density: choice(['comfortable', 'compact']),
    textSize: choice(['small', 'medium', 'large']),
    sortBy: choice(['newest', 'dueDate', 'priority']),
    hideCompleted: boolean(),
  },
  set: users.change(caller('id'), {
    theme: input('theme'),
    accent: input('accent'),
    density: input('density'),
    textSize: input('textSize'),
    sortBy: input('sortBy'),
    hideCompleted: input('hideCompleted'),
  }),
})

export const saveName = change('saveName', {
  about: 'Changes the display name of the signed-in user',
  access: 'signedIn',
  input: { name: text({ min: 1, max: 60 }) },
  set: users.change(caller('id'), { name: input('name') }),
})
