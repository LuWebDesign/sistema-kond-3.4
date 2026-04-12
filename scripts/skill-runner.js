#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const opts = {}
for (let i=0;i<args.length;i++){
  const a = args[i]
  if (a==='--skill' || a==='-s') opts.skill = args[++i]
  else if (a==='--dry-run' || a==='-d') opts.dry = true
  else if (a==='--list' || a==='-l') opts.list = true
  else if (a==='--help' || a==='-h') opts.help = true
}

if (opts.help){
  console.log('Usage: node scripts/skill-runner.js --list | --skill <name> [--dry-run]')
  process.exit(0)
}

const idxFile = path.join(process.cwd(), '.github', 'skills', 'index.json')
if (!fs.existsSync(idxFile)){
  console.error('Index not found. Run scripts/build-skill-index.js first.')
  process.exit(1)
}
const index = JSON.parse(fs.readFileSync(idxFile,'utf8'))

if (opts.list){
  index.forEach(s=>{
    console.log('-', s.name, ':', s.description || s.short_summary)
  })
  process.exit(0)
}

if (!opts.skill){
  console.error('No skill specified. Use --list to see available skills.')
  process.exit(1)
}

const skill = index.find(s=>s.name === opts.skill)
if (!skill){
  console.error('Skill not found:', opts.skill)
  process.exit(1)
}

console.log('Skill Runner', opts.dry? '(dry-run)':'' , ':', skill.name)
console.log('Description:', skill.description)
console.log('File:', skill.file)
console.log('Short summary:', skill.short_summary)

const content = fs.readFileSync(path.join(process.cwd(), skill.file), 'utf8')
const after = content.replace(/^---\s*([\s\S]*?)\s*---/,'').trim()
const lines = after.split(/\r?\n/).filter(Boolean)
const preview = lines.slice(0,40).join('\n')

console.log('\n--- Steps preview ---\n')
console.log(preview)
console.log('\n--- End steps preview ---\n')

console.log('Actions (dry-run):')
console.log('- Inspect SKILL.md and show steps')
console.log('- No changes applied in dry-run mode')

console.log('\nTo apply changes: implement action DSL and run with --apply --branch <branch-name>')
