import { anyone, Form, Link, screen } from 'forjr/ui'
import { signUp } from '../functions/users'
import { signInScreen } from './signIn'
import './auth.css'

export const signUpScreen = screen('signUpScreen', {
  path: '/sign-up',
  title: 'Kayıt Ol',
  access: anyone('kayıt ekranı herkese açıktır'),
  view: () => (
    <main className="auth">
      <div className="auth-card">
        <div className="auth-head">
          <div className="auth-logo" aria-hidden="true">
            ✓
          </div>
          <h1>Hesap oluşturun</h1>
          <p className="auth-sub">Birkaç saniyede görevlerinizi tutmaya başlayın</p>
        </div>

        <Form call={signUp} then={{ goTo: '/' }} className="auth-form">
          <label className="auth-field">
            <span className="auth-label">Adınız</span>
            <input name="name" autoComplete="name" placeholder="Adınız" className="auth-input" />
          </label>
          <label className="auth-field">
            <span className="auth-label">E-posta</span>
            <input name="email" type="email" autoComplete="username" placeholder="ad@ornek.com" required className="auth-input" />
          </label>
          <label className="auth-field">
            <span className="auth-label">Şifre (en az 8 karakter)</span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="••••••••"
              required
              className="auth-input"
            />
          </label>
          <button type="submit" className="auth-button">
            Kayıt Ol
          </button>
        </Form>

        <p className="auth-foot">
          Zaten hesabınız var mı? <Link to={signInScreen}>Giriş yapın</Link>
        </p>
      </div>
    </main>
  ),
})
