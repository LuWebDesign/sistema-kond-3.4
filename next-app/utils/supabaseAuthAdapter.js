import { updateUserProfile as supabaseUpdate } from './supabaseAuthV2'

async function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

export async function updateUserProfile(userPartial, attempts = 3) {
  const backoffs = [500, 1000, 2000]
  let lastError = null

  for (let i = 0; i < attempts; i++) {
    try {
      // supabaseAuthV2 exposes updateUserProfile(userId, profileData) in many places
      // try to detect if caller passed the full object or partial
      if (!userPartial) throw new Error('empty payload')
      // prefer calling with id and data if available
      if (userPartial.id) {
        const data = { ...userPartial }
        delete data.id
        const result = await supabaseUpdate(userPartial.id, data)
        return result
      }

      // fallback: call with partial only
      const result = await supabaseUpdate(null, userPartial)
      return result
    } catch (err) {
      lastError = err
      if (i < attempts - 1) {
        const ms = backoffs[i] || 1000
        await delay(ms)
        continue
      }
      throw lastError
    }
  }
}

export default { updateUserProfile }
