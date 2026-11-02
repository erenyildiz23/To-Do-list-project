import { allow, change, input, query, table, text, choice, link } from 'forjr'

export const tags = table('tags', {
  columns: {
    name: text({ min: 1, max: 40 }),
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

export const taskTags = table('taskTags', {
  columns: {
    task: link('tasks', { onRemove: 'remove' }),
    tag: link('tags', { onRemove: 'remove' }),
    ownerId: link('users', { optional: true }),
  },
  owner: 'ownerId',
  access: {
    read: 'owner',
    add: 'signedIn',
    remove: 'owner',
  },
})

export const allTags = query('allTags', {
  about: 'All available tags, newest first',
  access: 'signedIn',
  live: false,
  rows: tags.newest('createdAt').limit(100),
})

export const addTag = change('addTag', {
  about: 'Create a new tag',
  access: 'signedIn',
  input: {
    name: text({ min: 1, max: 40 }),
    color: choice(['blue', 'red', 'green', 'purple', 'orange', 'pink']),
  },
  set: tags.add({ name: input('name'), color: input('color') }),
})

export const addTagToTask = change('addTagToTask', {
  about: 'Attach a tag to a task',
  access: allow(
    (user, input, db) =>
      !!user && db.tasks.where({ id: input.taskId }).count() > 0 && db.tags.where({ id: input.tagId }).count() > 0,
  ),
  input: { taskId: text(), tagId: text() },
  set: taskTags.add({ task: input('taskId'), tag: input('tagId') }),
})

export const removeTagFromTask = change('removeTagFromTask', {
  about: 'Detach a tag from a task',
  access: 'signedIn',
  input: { id: text() },
  set: taskTags.remove(input('id')),
})

export const removeTag = change('removeTag', {
  about: 'Delete a tag and all its task links',
  access: 'signedIn',
  input: { id: text() },
  set: tags.remove(input('id')),
})

export const taskTagLinks = query('taskTagLinks', {
  about: 'All task-to-tag links',
  access: 'signedIn',
  live: false,
  rows: taskTags.limit(500),
})
