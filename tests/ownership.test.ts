import test from 'node:test'
import assert from 'node:assert/strict'
import { testApp } from 'forjr/test'

test('each user sees and changes only their own tasks, projects, tags and subtasks', async () => {
  const app = await testApp()
  const ali = await app.user({ email: 'ali@ornek.test', roles: [] })
  const ayse = await app.user({ email: 'ayse@ornek.test', roles: [] })

  await app.as(ali).call('addProject', { name: 'Ev', color: 'blue' })
  await app.as(ali).call('addTag', { name: 'acil', color: 'red' })
  await app.as(ali).call('addTask', { title: 'Alinin gorevi', priority: 'high' })
  const [aliTask] = await app.as(ali).call('activeTasks', {})
  await app.as(ali).call('addSubtask', { taskId: aliTask.id, title: 'adim 1' })

  await app.as(ayse).call('addTask', { title: 'Aysenin gorevi', priority: 'low' })

  const aliSees = await app.as(ali).call('activeTasks', {})
  const ayseSees = await app.as(ayse).call('activeTasks', {})
  assert.deepEqual(aliSees.map((t) => t.title), ['Alinin gorevi'])
  assert.deepEqual(ayseSees.map((t) => t.title), ['Aysenin gorevi'])

  assert.equal((await app.as(ayse).call('allProjects', {})).length, 0)
  assert.equal((await app.as(ayse).call('allTags', {})).length, 0)
  assert.equal((await app.as(ayse).call('allSubtasks', {})).length, 0)
  assert.equal((await app.as(ali).call('allProjects', {})).length, 1)
  assert.equal((await app.as(ali).call('allSubtasks', {})).length, 1)

  // Ayşe can neither tick nor delete Ali's task.
  await assert.rejects(app.as(ayse).call('toggleTask', { id: aliTask.id, done: true }))
  await assert.rejects(app.as(ayse).call('removeTask', { id: aliTask.id }))
  const [still] = await app.as(ali).call('activeTasks', {})
  assert.equal(still.done, false)

  // Ayşe cannot hang a subtask on Ali's task.
  await assert.rejects(app.as(ayse).call('addSubtask', { taskId: aliTask.id, title: 'sizma' }))

  // Nor tag Ali's task, nor use Ali's tag or project.
  const [aliTag] = await app.as(ali).call('allTags', {})
  const [aliProject] = await app.as(ali).call('allProjects', {})
  const [ayseTask] = await app.as(ayse).call('activeTasks', {})
  await app.as(ayse).call('addTag', { name: 'benim', color: 'green' })
  const [ayseTag] = await app.as(ayse).call('allTags', {})
  await assert.rejects(app.as(ayse).call('addTagToTask', { taskId: aliTask.id, tagId: ayseTag.id }))
  await assert.rejects(app.as(ayse).call('addTagToTask', { taskId: ayseTask.id, tagId: aliTag.id }))
  await assert.rejects(app.as(ayse).call('addTask', { title: 'x', priority: 'low', projectId: aliProject.id }))

  // Her own still work.
  await app.as(ayse).call('addTagToTask', { taskId: ayseTask.id, tagId: ayseTag.id })
  await app.as(ayse).call('addSubtask', { taskId: ayseTask.id, title: 'kendi adimim' })
  assert.equal((await app.as(ayse).call('taskTagLinks', {})).length, 1)
  assert.equal((await app.as(ali).call('taskTagLinks', {})).length, 0)

  // Nobody lists the other users.
  const mine = await app.as(ayse).call('myProfile', {})
  assert.deepEqual(mine.map((u) => u.email), ['ayse@ornek.test'])
  await app.close()
})
