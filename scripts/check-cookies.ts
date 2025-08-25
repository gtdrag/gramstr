import { db } from '../db'
import { instagramCookies } from '../db/schema'

async function checkCookies() {
  const cookies = await db.select().from(instagramCookies)
  console.log('Cookies in DB:', cookies.length)
  cookies.forEach(c => {
    console.log('- User:', c.userId)
    console.log('  Has sessionId:', !!c.sessionId)
    console.log('  Is valid:', c.isValid)
    console.log('  Uploaded:', c.uploadedAt)
  })
  process.exit(0)
}

checkCookies()