#!/usr/bin/env node

/**
 * Upload component packages to Supabase Storage
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.log('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadComponents() {
  const componentsDir = path.join(__dirname, '../dist-components');
  const bucketName = 'gramstr-installer';
  
  // Create bucket if it doesn't exist
  console.log('📦 Checking Supabase Storage bucket...');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Error listing buckets:', listError);
    return;
  }
  
  const bucketExists = buckets.some(b => b.name === bucketName);
  
  if (!bucketExists) {
    console.log('Creating bucket:', bucketName);
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 524288000 // 500MB
    });
    
    if (createError) {
      console.error('❌ Error creating bucket:', createError);
      return;
    }
  }
  
  // Upload component files
  const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tar.gz'));
  
  console.log(`\n📤 Uploading ${files.length} components to Supabase...`);
  
  for (const filename of files) {
    const filePath = path.join(componentsDir, filename);
    const fileBuffer = fs.readFileSync(filePath);
    const fileSize = (fileBuffer.length / (1024 * 1024)).toFixed(2);
    
    console.log(`\nUploading ${filename} (${fileSize} MB)...`);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(`v1.1.0/${filename}`, fileBuffer, {
        contentType: 'application/gzip',
        upsert: true
      });
    
    if (error) {
      console.error(`❌ Error uploading ${filename}:`, error);
    } else {
      const publicUrl = supabase.storage
        .from(bucketName)
        .getPublicUrl(`v1.1.0/${filename}`).data.publicUrl;
      
      console.log(`✅ Uploaded: ${publicUrl}`);
    }
  }
  
  // Upload manifest
  const manifestPath = path.join(componentsDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    console.log('\n📋 Uploading manifest.json...');
    const manifestBuffer = fs.readFileSync(manifestPath);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload('v1.1.0/manifest.json', manifestBuffer, {
        contentType: 'application/json',
        upsert: true
      });
    
    if (error) {
      console.error('❌ Error uploading manifest:', error);
    } else {
      const publicUrl = supabase.storage
        .from(bucketName)
        .getPublicUrl('v1.1.0/manifest.json').data.publicUrl;
      
      console.log(`✅ Manifest URL: ${publicUrl}`);
      
      // Update installer to use these URLs
      console.log('\n📝 Update installer/main.js with:');
      console.log(`MANIFEST_URL = '${publicUrl}'`);
      console.log(`CDN_BASE = '${supabaseUrl}/storage/v1/object/public/${bucketName}/v1.1.0/'`);
    }
  }
  
  console.log('\n✨ Upload complete!');
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

uploadComponents().catch(console.error);