import test from 'node:test'
import assert from 'node:assert/strict'
import { testApp } from 'forjr/test'

test('removing a project keeps its tasks; removing a tag drops its links', async () => {
  const app = await testApp()
  const me = await app.user({ email: 'ben@ornek.test', roles: [] })
  const as = app.as(me)

  await as.call('addProject', { name: 'Ev', color: 'green' })
  const [project] = await as.call('allProjects', {})
  await as.call('addTag', { name: 'acil', color: 'red' })
  const [tag] = await as.call('allTags', {})

  await as.call('addTask', { title: 'Bulaşık', priority: 'low', projectId: project.id, description: 'akşam' })
  const [task] = await as.call('activeTasks', {})
  assert.equal(task.project, project.id)
  assert.equal(task.description, 'akşam')
  await as.call('addTagToTask', { taskId: task.id, tagId: tag.id })

  await as.call('removeProject', { id: project.id })
  const [after] = await as.call('activeTasks', {})
  assert.equal(after.title, 'Bulaşık', 'the task stays')

  await as.call('removeTag', { id: tag.id })
  assert.equal((await as.call('allTags', {})).length, 0)
  assert.equal((await as.call('taskTagLinks', {})).length, 0)
  await app.close()
})

test('removing a task removes its subtasks and tag links too', async () => {
  const app = await testApp()
  const me = await app.user({ email: 'ben@ornek.test', roles: [] })
  const as = app.as(me)
  await as.call('addTag', { name: 'ev', color: 'blue' })
  const [tag] = await as.call('allTags', {})
  await as.call('addTask', { title: 'Taşın', priority: 'high' })
  const [task] = await as.call('activeTasks', {})
  await as.call('addSubtask', { taskId: task.id, title: 'kutu al' })
  await as.call('addTagToTask', { taskId: task.id, tagId: tag.id })

  await as.call('removeTask', { id: task.id })
  assert.equal((await as.call('activeTasks', {})).length, 0)
  assert.equal((await as.call('allSubtasks', {})).length, 0)
  assert.equal((await as.call('taskTagLinks', {})).length, 0)
  await app.close()
})
