const fs = require('fs')
const vm = require('vm')
const path = require('path')

// Path to the API route we added
const apiPath = path.resolve(__dirname, '..', 'pages', 'api', 'admin', 'logout.js')

if (!fs.existsSync(apiPath)) {
  console.error('API file not found:', apiPath)
  process.exit(2)
}

let code = fs.readFileSync(apiPath, 'utf8')

// Convert ESM export default to CommonJS for testing
code = code.replace(/export\s+default\s+async\s+function\s+handler\s*\(/, 'module.exports = async function handler(')

const sandbox = {
  module: { exports: {} },
  exports: {},
  require,
  console,
  process,
  __dirname: path.dirname(apiPath),
  __filename: apiPath,
}

try {
  vm.runInNewContext(code, sandbox)
} catch (err) {
  console.error('Error evaluating API file:', err)
  process.exit(3)
}

const handler = sandbox.module.exports

;(async () => {
  const req = { method: 'POST' }
  let headers = {}

  const res = {
    setHeader: (k, v) => { headers[k] = v },
    statusCode: 200,
    status(code) { this.statusCode = code; return this },
    json(obj) { console.log(JSON.stringify({ status: this.statusCode, headers, body: obj })) }
  }

  try {
    await handler(req, res)
  } catch (err) {
    console.error('Handler threw error:', err)
    process.exit(1)
  }
})()
