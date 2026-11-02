import { asset, project } from 'forjr'

export const todoApp = project('todoApp', {
  title: 'Todo App',
  icon: asset('icon.svg'),
  signInPath: '/sign-in',
  languages: ['tr'],
})
