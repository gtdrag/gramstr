import { db } from '../db'
import { sql } from 'drizzle-orm'

async function checkSchema() {
  try {
    // Get actual columns from the database
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'downloaded_content'
      ORDER BY ordinal_position
    `)
    
    console.log('Actual columns in downloaded_content table:')
    if (result && Array.isArray(result)) {
      result.forEach((row: any) => {
        console.log(`  - ${row.column_name}: ${row.data_type}`)
      })
    } else {
      console.log('Result:', result)
    }
  } catch (error) {
    console.error('Error checking schema:', error)
  }
  process.exit(0)
}

checkSchema()