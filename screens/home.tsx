import { useRef, useState } from 'react'
import { read, screen, Form, useCall, useGoTo } from 'forjr/ui'
import { addTask, activeTasks, completedTasks, toggleTask, removeTask } from '../functions/tasks'
import { allSubtasks, addSubtask, toggleSubtask, removeSubtask } from '../functions/subtasks'
import { allTags, addTag, addTagToTask, removeTag, removeTagFromTask, taskTagLinks } from '../functions/tags'
import { allProjects, addProject, removeProject } from '../functions/projects'
import { myProfile, savePreferences, saveName } from '../functions/profile'
import { signOut } from '../functions/signOut'
import './home.css'

type Task = {
  id: string
  title: string
  description?: string
  project?: string
  done: boolean
  priority: string
  dueDate?: string
  createdAt?: string
}

type Prefs = {
  theme: 'system' | 'light' | 'dark'
  accent: 'blue' | 'violet' | 'green' | 'orange' | 'pink' | 'slate'
  density: 'comfortable' | 'compact'
  textSize: 'small' | 'medium' | 'large'
  sortBy: 'newest' | 'dueDate' | 'priority'
  hideCompleted: boolean
}

const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  accent: 'blue',
  density: 'comfortable',
  textSize: 'medium',
  sortBy: 'newest',
  hideCompleted: false,
}

const PRIORITY_LABEL: Record<string, string> = { low: 'Düşük', medium: 'Orta', high: 'Yüksek' }
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }

const COLORS: Record<string, string> = {
  blue: 'Mavi',
  red: 'Kırmızı',
  green: 'Yeşil',
  purple: 'Mor',
  orange: 'Turuncu',
  pink: 'Pembe',
}

const ACCENTS: { value: Prefs['accent']; label: string; swatch: string }[] = [
  { value: 'blue', label: 'Mavi', swatch: '#2563eb' },
  { value: 'violet', label: 'Mor', swatch: '#7c3aed' },
  { value: 'green', label: 'Yeşil', swatch: '#15803d' },
  { value: 'orange', label: 'Turuncu', swatch: '#c2410c' },
  { value: 'pink', label: 'Pembe', swatch: '#be185d' },
  { value: 'slate', label: 'Gri', swatch: '#334155' },
]

const todayText = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const showDay = (day: string) => {
  const [y, m, d] = day.split('-')
  return `${d}.${m}.${y}`
}

const sortTasks = (list: Task[], by: Prefs['sortBy']) => {
  if (by === 'newest') return list
  const copy = [...list]
  if (by === 'dueDate')
    return copy.sort((a, b) => (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99'))
  return copy.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9))
}

const ColorSelect = () => (
  <select name="color" defaultValue="blue" className="field auto" aria-label="Renk">
    {Object.entries(COLORS).map(([value, label]) => (
      <option key={value} value={value}>
        {label}
      </option>
    ))}
  </select>
)

function Segmented<T extends string>(props: {
  name: string
  value: T
  options: { value: T; label: string; spoken?: string }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={props.label}>
      {props.options.map((o) => (
        <label key={o.value}>
          <input
            type="radio"
            name={props.name}
            value={o.value}
            checked={props.value === o.value}
            onChange={() => props.onChange(o.value)}
            aria-label={o.spoken ?? o.label}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  )
}

type Filter = 'all' | 'active' | 'done' | `project:${string}`

export const homeScreen = screen('homeScreen', {
  path: '/',
  title: 'To-Do List',
  access: 'signedIn',
  data: {
    active: read(activeTasks),
    completed: read(completedTasks),
    subtasks: read(allSubtasks),
    tags: read(allTags),
    taskTagLinks: read(taskTagLinks),
    projects: read(allProjects),
    me: read(myProfile),
  },
  view: ({
    active,
    completed,
    subtasks,
    tags,
    taskTagLinks: tagLinks,
    projects,
    me,
  }: {
    active: Task[]
    completed: Task[]
    subtasks: { id: string; task: string; title: string; done: boolean }[]
    tags: { id: string; name: string; color: string }[]
    taskTagLinks: { id: string; task: string; tag: string }[]
    projects: { id: string; name: string; color: string }[]
    me: ({ name?: string; email: string } & Partial<Prefs>)[]
  }) => {
    const goTo = useGoTo()
    const profile = me[0]
    const [filter, setFilter] = useState<Filter>('all')
    const [openTask, setOpenTask] = useState<string | null>(null)
    const [prefs, setPrefs] = useState<Prefs>(() => pickPrefs(profile))
    const [saveState, setSaveState] = useState<'' | 'saving' | 'saved' | 'error'>('')
    const settingsRef = useRef<HTMLDialogElement>(null)

    const callSignOut = useCall(signOut)
    const callSavePrefs = useCall(savePreferences)
    const callToggle = useCall(toggleTask)
    const callRemove = useCall(removeTask)
    const callToggleSubtask = useCall(toggleSubtask, {
      optimistic: {
        query: allSubtasks,
        to: (value, input) => value.map((s) => (s.id === input.id ? { ...s, done: input.done } : s)),
      },
    })
    const callRemoveSubtask = useCall(removeSubtask, {
      optimistic: { query: allSubtasks, to: (value, input) => value.filter((s) => s.id !== input.id) },
    })
    const callRemoveTagFromTask = useCall(removeTagFromTask, {
      optimistic: { query: taskTagLinks, to: (value, input) => value.filter((l) => l.id !== input.id) },
    })
    const callRemoveTag = useCall(removeTag)
    const callRemoveProject = useCall(removeProject)

    const updatePrefs = async (change: Partial<Prefs>) => {
      const next = { ...prefs, ...change }
      setPrefs(next)
      setSaveState('saving')
      try {
        await callSavePrefs.call(next)
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }

    const today = todayText()
    const tagById = (id: string) => tags.find((t) => t.id === id)
    const projectById = (id?: string) => (id ? projects.find((p) => p.id === id) : undefined)

    const projectFilter = filter.startsWith('project:') ? filter.slice('project:'.length) : undefined
    const inProject = (t: Task) => !projectFilter || t.project === projectFilter
    const hideDone = prefs.hideCompleted && filter !== 'done'
    const shownActive = filter === 'done' ? [] : sortTasks(active.filter(inProject), prefs.sortBy)
    const allDone = filter === 'active' ? [] : sortTasks(completed.filter(inProject), prefs.sortBy)
    const shownDone = hideDone ? [] : allDone
    const allCount = active.length + completed.length
    const percent = allCount === 0 ? 0 : Math.round((completed.length / allCount) * 100)

    const confirmRemove = (what: string, run: () => void) => {
      if (window.confirm(`${what} silinsin mi? Bu geri alınamaz.`)) run()
    }

    const renderTask = (task: Task) => {
      const project = projectById(task.project)
      const links = tagLinks.filter((l) => l.task === task.id)
      const taskSubtasks = subtasks.filter((s) => s.task === task.id)
      const freeTags = tags.filter((tag) => !links.some((l) => l.tag === tag.id))
      const late = !task.done && task.dueDate !== undefined && task.dueDate < today
      const doneSubs = taskSubtasks.filter((s) => s.done).length
      const open = openTask === task.id
      const panelId = `task-more-${task.id}`

      return (
        <article key={task.id} className={`card task${task.done ? ' done' : ''}`}>
          <div className="task-head">
            <label className="check">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => callToggle.call({ id: task.id, done: !task.done })}
              />
              <span className="sr-only">{task.done ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle'}: {task.title}</span>
            </label>
            <div className="task-text">
              <div className="task-title">{task.title}</div>
              {task.description && <p className="task-desc">{task.description}</p>}
              <div className="badges">
                <span className={`badge tint p-${task.priority}`}>{PRIORITY_LABEL[task.priority] ?? task.priority}</span>
                {task.dueDate && (
                  <span className={`badge ${late ? 'late' : 'plain'}`}>
                    {late ? 'Gecikti · ' : ''}
                    {showDay(task.dueDate)}
                  </span>
                )}
                {project && <span className={`badge tint c-${project.color}`}>{project.name}</span>}
                {taskSubtasks.length > 0 && (
                  <span className="badge plain">
                    {doneSubs}/{taskSubtasks.length} adım
                  </span>
                )}
                {links.map((link) => {
                  const tag = tagById(link.tag)
                  if (!tag) return null
                  return (
                    <span key={link.id} className={`badge chip tint c-${tag.color}`}>
                      #{tag.name}
                      {open && (
                        <button
                          type="button"
                          aria-label={`${tag.name} etiketini kaldır`}
                          onClick={() => callRemoveTagFromTask.call({ id: link.id })}
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  )
                })}
              </div>
            </div>
            <div className="task-actions">
              <button
                type="button"
                className="btn ghost"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenTask(open ? null : task.id)}
              >
                {open ? 'Kapat' : '＋ Adım / etiket'}
              </button>
              <button
                type="button"
                className="btn danger"
                aria-label={`"${task.title}" görevini sil`}
                onClick={() => confirmRemove(`"${task.title}" görevi`, () => callRemove.call({ id: task.id }))}
              >
                Sil
              </button>
            </div>
          </div>

          {taskSubtasks.length > 0 && (
            <div className="subtasks indent">
              {taskSubtasks.map((sub) => (
                <div key={sub.id} className={`subtask${sub.done ? ' done' : ''}`}>
                  <label>
                    <input
                      type="checkbox"
                      checked={sub.done}
                      onChange={() => callToggleSubtask.call({ id: sub.id, done: !sub.done })}
                    />
                    <span>{sub.title}</span>
                  </label>
                  <button
                    type="button"
                    className="btn danger"
                    aria-label={`"${sub.title}" adımını sil`}
                    onClick={() => callRemoveSubtask.call({ id: sub.id })}
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
          )}

          {open && (
            <div id={panelId} className="task-more indent">
              <Form call={addSubtask} with={{ taskId: task.id }} reset className="row add-sub">
                <input name="title" placeholder="Yeni adım..." aria-label="Alt görev" className="field" autoFocus />
                <button type="submit" className="btn secondary">
                  Adım ekle
                </button>
              </Form>
              {freeTags.length > 0 ? (
                <Form call={addTagToTask} with={{ taskId: task.id }} reset className="row add-sub">
                  <select name="tagId" className="field" defaultValue="" aria-label="Etiket seç">
                    <option value="" disabled>
                      Etiket seç…
                    </option>
                    {freeTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn secondary">
                    Etiket ata
                  </button>
                </Form>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  {tags.length === 0
                    ? 'Etiket atamak için önce "Projeler ve etiketler" bölümünden bir etiket oluşturun.'
                    : 'Bütün etiketler bu göreve atanmış.'}
                </p>
              )}
            </div>
          )}
        </article>
      )
    }

    const filterButton = (value: Filter, label: string) => (
      <button key={value} type="button" className="filter" aria-pressed={filter === value} onClick={() => setFilter(value)}>
        {label}
      </button>
    )

    return (
      <div className="app" data-theme={prefs.theme} data-accent={prefs.accent} data-density={prefs.density} data-size={prefs.textSize}>
        <header className="topbar">
          <div className="brand">
            <div className="logo" aria-hidden="true">
              ✓
            </div>
            <div style={{ minWidth: 0 }}>
              <h1>To-Do List</h1>
              <p>{profile?.name ? `Hoş geldin, ${profile.name}` : 'Hoş geldiniz'}</p>
            </div>
          </div>
          <nav className="filters" aria-label="Görev filtresi">
            {filterButton('all', `Hepsi (${allCount})`)}
            {filterButton('active', `Aktif (${active.length})`)}
            {filterButton('done', `Tamamlanan (${completed.length})`)}
            {projects.map((p) => filterButton(`project:${p.id}`, p.name))}
          </nav>
          <div className="actions">
            <button
              type="button"
              className="btn secondary icon"
              aria-haspopup="dialog"
              onClick={() => settingsRef.current?.showModal()}
            >
              <span aria-hidden="true">⚙</span>
              <span className="label-text">Görünüm</span>
              <span className="sr-only">ayarları</span>
            </button>
            <button
              type="button"
              className="btn danger"
              style={{ border: '1px solid var(--border-strong)' }}
              onClick={async () => {
                await callSignOut.call({})
                goTo('/sign-in')
              }}
            >
              Çıkış
            </button>
          </div>
        </header>

        <main className="main">
          <Form call={addTask} reset className="card stack newtask">
            <input name="title" placeholder="Yeni görev ekle..." aria-label="Görev başlığı" className="field" required />
            <textarea name="description" placeholder="Açıklama / notlar (isteğe bağlı)" aria-label="Açıklama" rows={2} className="field" />
            <div className="row">
              <select name="priority" defaultValue="medium" className="field auto" aria-label="Öncelik">
                <option value="low">Düşük öncelik</option>
                <option value="medium">Orta öncelik</option>
                <option value="high">Yüksek öncelik</option>
              </select>
              <input name="dueDate" type="date" className="field auto" aria-label="Son tarih" />
              {projects.length > 0 && (
                <select
                  name="projectId"
                  className="field auto"
                  aria-label="Proje"
                  key={projectFilter ?? 'none'}
                  defaultValue={projectFilter ?? ''}
                >
                  <option value="">Projesiz</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <button type="submit" className="btn" style={{ marginLeft: 'auto' }}>
                Görev Ekle
              </button>
            </div>
          </Form>

          <details className="card panel">
            <summary>
              Projeler ve etiketler ({projects.length} proje, {tags.length} etiket)
            </summary>
            <div className="panel-body">
              <div>
                <h3 className="eyebrow">Projeler</h3>
                <Form call={addProject} reset className="row" style={{ gap: 6 }}>
                  <input name="name" placeholder="Yeni proje" aria-label="Proje adı" className="field" style={{ flex: 1, minWidth: 120 }} required />
                  <ColorSelect />
                  <button type="submit" className="btn secondary">
                    Ekle
                  </button>
                </Form>
                {projects.length === 0 ? (
                  <p className="muted">Henüz proje yok.</p>
                ) : (
                  <div className="chips">
                    {projects.map((p) => (
                      <span key={p.id} className={`chip tint c-${p.color}`}>
                        {p.name}
                        <button
                          type="button"
                          aria-label={`${p.name} projesini sil`}
                          onClick={() =>
                            confirmRemove(`"${p.name}" projesi`, () => {
                              if (filter === `project:${p.id}`) setFilter('all')
                              callRemoveProject.call({ id: p.id })
                            })
                          }
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="eyebrow">Etiketler</h3>
                <Form call={addTag} reset className="row" style={{ gap: 6 }}>
                  <input name="name" placeholder="Yeni etiket" aria-label="Etiket adı" className="field" style={{ flex: 1, minWidth: 120 }} required />
                  <ColorSelect />
                  <button type="submit" className="btn secondary">
                    Ekle
                  </button>
                </Form>
                {tags.length === 0 ? (
                  <p className="muted">Henüz etiket yok.</p>
                ) : (
                  <div className="chips">
                    {tags.map((t) => (
                      <span key={t.id} className={`chip tint c-${t.color}`}>
                        {t.name}
                        <button
                          type="button"
                          aria-label={`${t.name} etiketini sil`}
                          onClick={() => confirmRemove(`"${t.name}" etiketi`, () => callRemoveTag.call({ id: t.id }))}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </details>

          {allCount > 0 && (
            <div className="progress" aria-label={`Görevlerin yüzde ${percent}'i tamamlandı`}>
              <div className="bar" aria-hidden="true">
                <span style={{ width: `${percent}%` }} />
              </div>
              <span>
                {completed.length}/{allCount} tamamlandı
              </span>
            </div>
          )}

          {filter !== 'done' && (
            <section className="list" aria-label="Aktif görevler">
              {shownActive.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon" aria-hidden="true">
                    ✓
                  </div>
                  <h2>Aktif görev yok</h2>
                  <p>{allCount === 0 ? 'Yukarıdan ilk görevinizi ekleyerek başlayın.' : 'Hepsi tamam. Yeni bir görev ekleyebilirsiniz.'}</p>
                </div>
              ) : (
                shownActive.map(renderTask)
              )}
            </section>
          )}

          {shownDone.length > 0 && (
            <section aria-label="Tamamlanan görevler">
              <div className="section-head" style={filter === 'done' ? { marginTop: 0 } : undefined}>
                <h2>Tamamlananlar ({shownDone.length})</h2>
              </div>
              <div className="list">{shownDone.map(renderTask)}</div>
            </section>
          )}

          {hideDone && allDone.length > 0 && (
            <p className="hidden-note">
              {allDone.length} tamamlanan görev gizli.{' '}
              <button type="button" className="link-btn" onClick={() => setFilter('done')}>
                Göster
              </button>
            </p>
          )}

          {filter === 'done' && shownDone.length === 0 && (
            <div className="empty">
              <div className="empty-icon" aria-hidden="true">
                ○
              </div>
              <h2>Tamamlanan görev yok</h2>
            </div>
          )}
        </main>

        <dialog
          ref={settingsRef}
          className="settings"
          aria-labelledby="settings-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) e.currentTarget.close()
          }}
        >
          <div className="settings-head">
            <div>
              <h2 id="settings-title">Görünüm ve tercihler</h2>
              <div className="saved" role="status" aria-live="polite">
                {saveState === 'saving' ? 'Kaydediliyor…' : saveState === 'saved' ? 'Kaydedildi ✓' : saveState === 'error' ? 'Kaydedilemedi, tekrar deneyin.' : ''}
              </div>
            </div>
            <button type="button" className="btn secondary icon" onClick={() => settingsRef.current?.close()} aria-label="Kapat">
              ✕
            </button>
          </div>
          <div className="settings-body">
            <div className="setting">
              <div className="setting-title">Görünen ad</div>
              <Form call={saveName} className="row" style={{ gap: 8 }}>
                <input
                  name="name"
                  className="field"
                  style={{ flex: 1, minWidth: 140 }}
                  defaultValue={profile?.name ?? ''}
                  placeholder="Adınız"
                  aria-label="Görünen ad"
                  required
                />
                <button type="submit" className="btn secondary">
                  Kaydet
                </button>
              </Form>
            </div>

            <fieldset className="setting">
              <legend>Tema</legend>
              <Segmented
                name="theme"
                label="Tema"
                value={prefs.theme}
                onChange={(theme) => updatePrefs({ theme })}
                options={[
                  { value: 'system', label: 'Sistem' },
                  { value: 'light', label: '☀ Açık', spoken: 'Açık' },
                  { value: 'dark', label: '☾ Koyu', spoken: 'Koyu' },
                ]}
              />
            </fieldset>

            <fieldset className="setting">
              <legend>Vurgu rengi</legend>
              <div className="swatches" role="radiogroup" aria-label="Vurgu rengi">
                {ACCENTS.map((a) => (
                  <label key={a.value} title={a.label}>
                    <input
                      type="radio"
                      name="accent"
                      value={a.value}
                      checked={prefs.accent === a.value}
                      onChange={() => updatePrefs({ accent: a.value })}
                      aria-label={a.label}
                    />
                    <span style={{ ['--sw' as string]: a.swatch }} />
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="setting">
              <legend>Yazı boyutu</legend>
              <Segmented
                name="textSize"
                label="Yazı boyutu"
                value={prefs.textSize}
                onChange={(textSize) => updatePrefs({ textSize })}
                options={[
                  { value: 'small', label: 'Küçük' },
                  { value: 'medium', label: 'Orta' },
                  { value: 'large', label: 'Büyük' },
                ]}
              />
            </fieldset>

            <fieldset className="setting">
              <legend>Yoğunluk</legend>
              <p className="hint">Sıkı görünüm ekrana daha çok görev sığdırır.</p>
              <Segmented
                name="density"
                label="Yoğunluk"
                value={prefs.density}
                onChange={(density) => updatePrefs({ density })}
                options={[
                  { value: 'comfortable', label: 'Rahat' },
                  { value: 'compact', label: 'Sıkı' },
                ]}
              />
            </fieldset>

            <fieldset className="setting">
              <legend>Sıralama</legend>
              <Segmented
                name="sortBy"
                label="Sıralama"
                value={prefs.sortBy}
                onChange={(sortBy) => updatePrefs({ sortBy })}
                options={[
                  { value: 'newest', label: 'En yeni' },
                  { value: 'dueDate', label: 'Son tarih' },
                  { value: 'priority', label: 'Öncelik' },
                ]}
              />
            </fieldset>

            <div className="setting">
              <label className="switch">
                <span>
                  <span className="setting-title" style={{ display: 'block', marginBottom: 2 }}>
                    Tamamlananları gizle
                  </span>
                  <span className="hint" style={{ display: 'block', margin: 0 }}>
                    "Tamamlanan" filtresinde yine görünürler.
                  </span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Tamamlananları gizle"
                  checked={prefs.hideCompleted}
                  onChange={(e) => updatePrefs({ hideCompleted: e.target.checked })}
                />
              </label>
            </div>

            <div className="setting">
              <button type="button" className="btn secondary" onClick={() => updatePrefs(DEFAULT_PREFS)}>
                Varsayılana dön
              </button>
            </div>
          </div>
        </dialog>
      </div>
    )
  },
})

/** Only the preference fields of a profile, with the defaults where one is missing. */
function pickPrefs(profile: Partial<Prefs> | undefined): Prefs {
  const out = { ...DEFAULT_PREFS }
  if (!profile) return out
  for (const key of Object.keys(DEFAULT_PREFS) as (keyof Prefs)[]) {
    const value = profile[key]
    if (value !== undefined && value !== null) (out as Record<string, unknown>)[key] = value
  }
  return out
}
