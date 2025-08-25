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
  // In production, Supabase requires SSL
  const isProduction = process.env.NODE_ENV === 'production'
  const client = postgres(url, { 
    prepare: false,
    ssl: isProduction ? 'require' : false
  })
  return drizzlePostgres(client, { schema: dbSchema })
}

export const db = initializeDb(databaseUrl)
