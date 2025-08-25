import { db } from '../db/index'
import { downloadedContent } from '../db/schema/content'
import { desc } from 'drizzle-orm'

async function checkLatest() {
  const recent = await db.select().from(downloadedContent).orderBy(desc(downloadedContent.downloadedAt)).limit(2)
  console.log("Latest entries:")
  recent.forEach((item, i) => {
    console.log(`\n${i + 1}. ${item.caption}`)
    console.log(`   URL: ${item.originalUrl}`)
    console.log(`   Is Carousel: ${item.isCarousel}`)
    console.log(`   Carousel Files: ${item.carouselFiles}`)
    console.log(`   Downloaded: ${item.downloadedAt}`)
  })
  process.exit(0)
}

checkLatest()