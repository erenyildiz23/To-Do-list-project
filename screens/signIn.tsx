import { anyone, Form, Link, screen } from 'forjr/ui'
import { signIn } from '../functions/signIn'
import { signUpScreen } from './signUp'
import './auth.css'

export const signInScreen = screen('signInScreen', {
  path: '/sign-in',
  title: 'Giriş Yap',
  access: anyone('giriş ekranı herkese açıktır'),
  view: () => (
    <main className="auth">
      <div className="auth-card">
        <div className="auth-head">
          <div className="auth-logo" aria-hidden="true">
            ✓
          </div>
          <h1>Hoş geldiniz</h1>
          <p className="auth-sub">To-Do listenize erişmek için giriş yapın</p>
        </div>

        <Form call={signIn} then={{ goTo: '/' }} className="auth-form">
          <label className="auth-field">
            <span className="auth-label">E-posta</span>
            <input name="email" type="email" autoComplete="username" placeholder="ad@ornek.com" required className="auth-input" />
          </label>
          <label className="auth-field">
            <span className="auth-label">Şifre</span>
            <input name="password" type="password" autoComplete="current-password" placeholder="••••••••" required className="auth-input" />
          </label>
          <button type="submit" className="auth-button">
            Giriş Yap
          </button>
        </Form>

        <p className="auth-foot">
          Hesabınız yok mu? <Link to={signUpScreen}>Kayıt olun</Link>
        </p>
      </div>
    </main>
  ),
})
