import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { customers } from "./schema/customers"
import { downloadedContent, crossPostHistory, userPlatformCredentials } from "./schema/content"

// In development, load .env.local if DATABASE_URL is not already set
// In production, DATABASE_URL should be set via Vercel env vars
if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'development') {
  try {
    const { config } = require("dotenv")
    config({ path: ".env.local" })
  } catch (e) {
    // dotenv might not be available in production
    console.log("Could not load .env.local - ensure DATABASE_URL is set")
  }
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set")
}

const dbSchema = {
  // tables
  customers,
  downloadedContent,
  crossPostHistory,
  userPlatformCredentials
  // relations
}

function initializeDb(url: string) {
  const isProduction = process.env.NODE_ENV === 'production'
  
  // Parse the connection string to check if it's a pooled connection
  const isPooledConnection = url.includes('pooler') || url.includes('-pooler')
  
  console.log("DB Init - Environment:", process.env.NODE_ENV)
  console.log("DB Init - Is Production:", isProduction)
  console.log("DB Init - Is Pooled:", isPooledConnection)
  console.log("DB Init - URL prefix:", url.substring(0, 30))
  
  try {
    const client = postgres(url, { 
      prepare: false,
      ssl: isProduction ? 'require' : false,
      connection: {
        application_name: 'instascrape-app'
      },
      max: isPooledConnection ? 1 : 10,
      idle_timeout: 20,
      connect_timeout: 10,
      // For debugging connection issues
      onnotice: isProduction ? undefined : (msg) => console.log("DB Notice:", msg),
      debug: false
    })
    
    return drizzlePostgres(client, { schema: dbSchema })
  } catch (error) {
    console.error("Failed to initialize database connection:", error)
    throw error
  }
}

export const db = initializeDb(databaseUrl)