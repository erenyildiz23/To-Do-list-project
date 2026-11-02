import test from 'node:test'
import assert from 'node:assert/strict'
import { testApp } from 'forjr/test'

const prefs = {
  theme: 'dark',
  accent: 'green',
  density: 'compact',
  textSize: 'large',
  sortBy: 'dueDate',
  hideCompleted: true,
} as const

test('a new user starts with the default look', async () => {
  const app = await testApp()
  const me = await app.user({ email: 'ben@ornek.test', roles: [] })
  const [profile] = await app.as(me).call('myProfile', {})
  assert.equal(profile.theme, 'system')
  assert.equal(profile.accent, 'blue')
  assert.equal(profile.density, 'comfortable')
  assert.equal(profile.textSize, 'medium')
  assert.equal(profile.sortBy, 'newest')
  assert.equal(profile.hideCompleted, false)
  assert.equal(Object.hasOwn(profile, 'password'), false, 'the password never leaves the server')
  await app.close()
})

test('preferences and name are saved for that user alone', async () => {
  const app = await testApp()
  const ali = await app.user({ email: 'ali@ornek.test', roles: [] })
  const ayse = await app.user({ email: 'ayse@ornek.test', roles: [] })

  await app.as(ali).call('savePreferences', prefs)
  await app.as(ali).call('saveName', { name: 'Ali Veli' })

  const [aliProfile] = await app.as(ali).call('myProfile', {})
  assert.equal(aliProfile.name, 'Ali Veli')
  for (const [key, value] of Object.entries(prefs)) assert.equal(aliProfile[key as keyof typeof prefs], value, key)

  const [ayseProfile] = await app.as(ayse).call('myProfile', {})
  assert.equal(ayseProfile.theme, 'system', "Ali's choice does not touch Ayşe")
  assert.equal(ayseProfile.name, undefined)
  await app.close()
})

test('a stranger cannot read or save preferences', async () => {
  const app = await testApp()
  await assert.rejects(app.as('nobody').call('myProfile', {}))
  await assert.rejects(app.as('nobody').call('savePreferences', prefs))
  await app.close()
})
