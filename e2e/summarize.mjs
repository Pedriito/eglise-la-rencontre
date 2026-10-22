import fs from 'node:fs'
const file = process.argv[2]
const r = JSON.parse(fs.readFileSync(file, 'utf8'))
const rows = []
function walk(s) {
  for (const sp of s.specs || []) for (const te of sp.tests) {
    const res = te.results.at(-1)
    const msg = (res?.error?.message || '').replace(/\x1b\[[0-9;]*m/g, '').split('\n').filter(Boolean)[0]?.slice(0, 150) || ''
    rows.push({ project: te.projectName, title: sp.title, status: te.status, ms: res?.duration || 0, msg })
  }
  for (const c of s.suites || []) walk(c)
}
r.suites.forEach(walk)
const by = {}
rows.forEach(x => { by[x.status] = (by[x.status] || 0) + 1 })
console.log(by)
const titles = [...new Set(rows.map(x => x.title))]
const ico = { expected: '✅', unexpected: '❌', skipped: '⏭ ', flaky: '⚠️' }
for (const t of titles) {
  const cells = ['desktop-chrome', 'iphone-pwa', 'android-pwa'].map(p => { const x = rows.find(y => y.title === t && y.project === p); return x ? ico[x.status] : '  ' })
  console.log(cells.join(' '), ' ', t.slice(0, 100))
}
if (process.argv[3] === '-v') rows.filter(x => x.status === 'unexpected').forEach(x => console.log('\n' + x.project, '|', x.title.slice(0, 50), '\n   ', x.msg))
