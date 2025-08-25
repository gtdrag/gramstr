import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { customers } from "./schema/customers"
import { downloadedContent, crossPostHistory, userPlatformCredentials } from "./schema/content"

// Only load .env.local in development
if (process.env.NODE_ENV === "development") {
  const { config } = require("dotenv")
  config({ path: ".env.local" })
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
