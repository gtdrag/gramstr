import { db } from '../db'
import { downloadedContent } from '../db/schema'
import { sql } from 'drizzle-orm'

async function checkContent() {
  // Get content counts by user
  const content = await db.select({
    userId: downloadedContent.userId,
    count: sql<number>`count(*)::int`
  })
  .from(downloadedContent)
  .groupBy(downloadedContent.userId)

  console.log('=== Content by User ===')
  content.forEach(c => {
    console.log(`User ${c.userId}: ${c.count} items`)
  })

  // Get recent content
  const recent = await db.select({
    userId: downloadedContent.userId,
    caption: downloadedContent.caption,
    status: downloadedContent.status,
    createdAt: downloadedContent.createdAt
  })
  .from(downloadedContent)
  .orderBy(downloadedContent.createdAt)
  .limit(5)

  console.log('\n=== Recent Content ===')
  recent.forEach(r => {
    console.log(`${r.createdAt?.toISOString()}: User ${r.userId} - ${r.caption?.substring(0, 50)}... [${r.status}]`)
  })

  process.exit(0)
}

checkContent()