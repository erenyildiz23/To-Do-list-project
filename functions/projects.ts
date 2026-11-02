import { change, input, query, table, text, choice, link } from 'forjr'

export const projects = table('projects', {
  columns: {
    name: text({ min: 1, max: 80 }),
    color: choice(['blue', 'red', 'green', 'purple', 'orange', 'pink'], {
      default: 'blue',
    }),
    ownerId: link('users', { optional: true }),
  },
  owner: 'ownerId',
  access: {
    read: 'owner',
    add: 'signedIn',
    change: 'owner',
    remove: 'owner',
  },
})

export const allProjects = query('allProjects', {
  about: 'All available projects, newest first',
  access: 'signedIn',
  live: false,
  rows: projects.newest('createdAt').limit(100),
})

export const addProject = change('addProject', {
  about: 'Create a new project',
  access: 'signedIn',
  input: {
    name: text({ min: 1, max: 80 }),
    color: choice(['blue', 'red', 'green', 'purple', 'orange', 'pink']),
  },
  set: projects.add({ name: input('name'), color: input('color') }),
})

export const removeProject = change('removeProject', {
  about: 'Delete a project (its tasks stay, but lose the project)',
  access: 'signedIn',
  input: { id: text() },
  set: projects.remove(input('id')),
})
