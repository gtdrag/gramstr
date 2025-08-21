#!/usr/bin/env tsx

import { createNostrKeys } from "../lib/nostr"

console.log("🔑 Generating NOSTR keys...")
console.log("")

try {
  const keys = createNostrKeys()
  
  console.log("✅ NOSTR keys generated successfully!")
  console.log("")
  console.log("🔒 Private Key (nsec) - KEEP THIS SECRET:")
  console.log(keys.nsec)
  console.log("")
  console.log("🔓 Public Key (npub) - This is your NOSTR identity:")
  console.log(keys.npub)
  console.log("")
  console.log("📝 Add these to your .env.local file:")
  console.log(`NOSTR_PRIVATE_KEY=${keys.nsec}`)
  console.log(`NOSTR_PUBLIC_KEY=${keys.npub}`)
  console.log("")
  console.log("⚠️  WARNING: Keep your private key (nsec) secure and never share it!")
  console.log("   Anyone with your private key can post as you on NOSTR.")
  console.log("")
  console.log("🎉 You can now use the ⚡ NOSTR button to cross-post!")
  
} catch (error) {
  console.error("❌ Error generating keys:", error)
  process.exit(1)
}