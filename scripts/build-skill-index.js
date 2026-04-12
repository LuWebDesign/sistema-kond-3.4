#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const SKILLS_DIR = path.join(process.cwd(), '.github', 'skills')
const OUT_FILE = path.join(SKILLS_DIR, 'index.json')

function findSkillFiles(dir){
  const res = []
  if (!fs.existsSync(dir)) return res
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries){
    const full = path.join(dir, e.name)
    if (e.isDirectory()){
      res.push(...findSkillFiles(full))
    } else {
      if (e.name.toLowerCase() === 'skill.md' || e.name === 'SKILL.md'){
        res.push(full)
      }
    }
  }
  return res
}

const files = findSkillFiles(SKILLS_DIR)
const index = []

for (const f of files){
  try {
    const content = fs.readFileSync(f, 'utf8')
    const fmMatch = content.match(/^---\s*([\s\S]*?)\s*---/)
    const front = fmMatch ? fmMatch[1] : ''
    const meta = {}
    front.split(/\r?\n/).forEach(line => {
      const m = line.match(/^(\w+):\s*(.*)$/)
      if (m){
        let k = m[1]
        let v = m[2].trim()
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))){
          v = v.slice(1,-1)
        }
        if (v.startsWith('[') && v.endsWith(']')){
          try { v = JSON.parse(v) } catch(e){ v = v.slice(1,-1).split(',').map(s=>s.trim().replace(/^"|"$/g,'')) }
        }
        meta[k] = v
      }
    })
    const after = content.replace(/^---\s*([\s\S]*?)\s*---/,'').trim()
    const summaryLines = after.split(/\r?\n/).slice(0,8).join(' ').replace(/\s+/g,' ').trim()
    const hash = crypto.createHash('sha1').update(content).digest('hex')
    index.push({
      name: meta.name || path.basename(path.dirname(f)),
      description: meta.description || '',
      triggers: meta.triggers || [],
      file: path.relative(process.cwd(), f).replace(/\\/g,'/'),
      short_summary: summaryLines,
      hash
    })
  } catch(err){
    console.error('error reading', f, err.message)
  }
}

if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true })
fs.writeFileSync(OUT_FILE, JSON.stringify(index, null, 2))
console.log('Wrote', OUT_FILE, 'with', index.length, 'skills.')
