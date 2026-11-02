import { allow, change, input, query, table, text, boolean, choice, day, link } from 'forjr'

export const tasks = table('tasks', {
  columns: {
    title: text({ min: 1, max: 200 }),
    description: text({ optional: true }),
    ownerId: link('users', { optional: true }),
    project: link('projects', { optional: true, onRemove: 'clear' }),
    priority: choice(['low', 'medium', 'high'], { default: 'medium' }),
    dueDate: day({ optional: true }),
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

export const activeTasks = query('activeTasks', {
  about: 'Tasks that are not done yet, newest first',
  access: 'signedIn',
  live: false,
  rows: tasks.where({ done: false }).newest('createdAt').limit(50),
})

export const completedTasks = query('completedTasks', {
  about: 'Completed tasks, newest first',
  access: 'signedIn',
  live: false,
  rows: tasks.where({ done: true }).newest('createdAt').limit(50),
})

export const addTask = change('addTask', {
  about: 'Add a new task to the list',
  access: allow((user, input, db) => !!user && (!input.projectId || db.projects.where({ id: input.projectId }).count() > 0)),
  input: {
    title: text({ min: 1, max: 200 }),
    description: text({ optional: true }),
    projectId: link('projects', { optional: true }),
    priority: choice(['low', 'medium', 'high'], { default: 'medium' }),
    dueDate: day({ optional: true }),
  },
  set: tasks.add({
    title: input('title'),
    description: input('description'),
    project: input('projectId'),
    priority: input('priority'),
    dueDate: input('dueDate'),
    done: false,
  }),
})

export const toggleTask = change('toggleTask', {
  about: 'Mark a task as done or not done',
  access: 'signedIn',
  input: { id: text(), done: boolean() },
  set: tasks.change(input('id'), { done: input('done') }),
})

export const removeTask = change('removeTask', {
  about: 'Remove a task from the list',
  access: 'signedIn',
  input: { id: text() },
  set: tasks.remove(input('id')),
})
