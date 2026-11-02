import { messages } from 'forjr/ui'

export default messages('tr', {
  forjr: {
    required: 'Bu alan gerekli.',
    type: 'Bu değer geçerli değil.',
    min: 'En az {min} karakter olmalı.',
    max: 'En fazla {max} karakter olabilir.',
    pattern: 'Biçimi doğru değil.',
    values: 'Seçeneklerden birini seçin.',
    unknown: 'Bu alan tanınmıyor.',
    failed: 'Bir şeyler ters gitti. Tekrar deneyin.',
  },
  fail: {
    F0005: 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.',
    'wrong-sign-in': 'E-posta ya da şifre hatalı.',
    'has-account': 'Bu e-posta ile zaten bir hesap var: giriş yapın.',
  },
})
