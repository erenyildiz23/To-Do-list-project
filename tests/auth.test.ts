import test from 'node:test'
import assert from 'node:assert/strict'
import { testApp } from 'forjr/test'

const post = (name: string, body: object, cookie?: string) =>
  new Request(`http://localhost/_f/call/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ input: body }),
  })

const sessionCookie = (res: Response) => {
  const line = res.headers.getSetCookie().find((c) => c.startsWith('forjr_session'))
  return line?.split(';')[0]
}

test('sign up starts a session and the home page opens', async () => {
  const app = await testApp()
  const res = await app.request(post('signUp', { email: 'Ayse@Ornek.com', name: 'Ayşe', password: 'cokgizli123' }))
  assert.equal(res.status, 200, await res.clone().text())
  const cookie = sessionCookie(res)
  assert.ok(cookie, 'sign-up should set a session cookie')
  const who = await app.caller(new Request('http://localhost/', { headers: { cookie } }))
  assert.equal(who.kind, 'user')

  const [row] = await app.rows('users')
  assert.equal(row.email, 'ayse@ornek.com')
  assert.notEqual(row.password, 'cokgizli123', 'the password is stored hashed')
  await app.close()
})

test('sign in with the right password, and only with it', async () => {
  const app = await testApp()
  await app.request(post('signUp', { email: 'ali@ornek.com', password: 'dogrusifre1' }))

  const wrong = await app.request(post('signIn', { email: 'ali@ornek.com', password: 'yanlissifre' }))
  assert.match(await wrong.text(), /wrong-sign-in/)
  assert.equal(sessionCookie(wrong), undefined)

  const right = await app.request(post('signIn', { email: 'ALI@ornek.com', password: 'dogrusifre1' }))
  assert.equal(right.status, 200, await right.clone().text())
  assert.ok(sessionCookie(right), 'sign-in should set a session cookie')
  await app.close()
})

test('the same email cannot sign up twice', async () => {
  const app = await testApp()
  await app.request(post('signUp', { email: 'ali@ornek.com', password: 'dogrusifre1' }))
  const again = await app.request(post('signUp', { email: 'ali@ornek.com', password: 'baskasifre1' }))
  assert.match(await again.text(), /has-account/)
  await app.close()
})

test('a user with no password cannot sign in by email alone', async () => {
  const app = await testApp()
  await app.user({ email: 'eski@ornek.com', roles: [] })
  const res = await app.request(post('signIn', { email: 'eski@ornek.com', password: 'herhangi1' }))
  assert.match(await res.text(), /wrong-sign-in/)
  await app.close()
})

test('a stranger is sent from home to the sign-in page', async () => {
  const app = await testApp()
  const page = await app.as('nobody').page('/')
  assert.equal(page.status, 302)
  assert.match(String(page.headers.location), /sign-in/)
  await app.close()
})
