import { allow, change, input, query, table, text, boolean, link } from 'forjr'

export const subtasks = table('subtasks', {
  columns: {
    task: link('tasks', { onRemove: 'remove' }),
    title: text({ min: 1, max: 200 }),
    ownerId: link('users', { optional: true }),
    done: boolean(),
  },
  owner: 'ownerId',
  access: {
    read: 'owner',
    add: 'signedIn',
    change: 'owner',
    remove: 'owner',
  },
})

export const allSubtasks = query('allSubtasks', {
  about: 'All subtasks across every task, newest first',
  access: 'signedIn',
  live: false,
  rows: subtasks.newest('createdAt').limit(200),
})

export const addSubtask = change('addSubtask', {
  about: 'Add a subtask to a task',
  access: allow((user, input, db) => !!user && db.tasks.where({ id: input.taskId }).count() > 0),
  input: { taskId: text(), title: text({ min: 1, max: 200 }) },
  set: subtasks.add({ task: input('taskId'), title: input('title'), done: false }),
})

export const toggleSubtask = change('toggleSubtask', {
  about: 'Mark a subtask as done or not done',
  access: 'signedIn',
  input: { id: text(), done: boolean() },
  set: subtasks.change(input('id'), { done: input('done') }),
})

export const removeSubtask = change('removeSubtask', {
  about: 'Remove a subtask',
  access: 'signedIn',
  input: { id: text() },
  set: subtasks.remove(input('id')),
})
