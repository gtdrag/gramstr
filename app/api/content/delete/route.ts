import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { downloadedContent } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { deleteFromSupabase } from "@/lib/supabase-storage"

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { contentId } = body

    if (!contentId) {
      return NextResponse.json({ error: "Content ID is required" }, { status: 400 })
    }

    // First, get the content item to access file paths
    const contentItem = await db
      .select()
      .from(downloadedContent)
      .where(and(
        eq(downloadedContent.id, contentId),
        eq(downloadedContent.userId, userId)
      ))
      .limit(1)

    if (contentItem.length === 0) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }

    const item = contentItem[0]
    const errors: string[] = []

    // Clean up files from Supabase Storage
    try {
      // Check if files are Supabase URLs
      const isSupabaseUrl = item.filePath?.startsWith('http')
      
      if (isSupabaseUrl && item.filePath) {
        // Extract the file path from Supabase URL
        // URL format: https://[project].supabase.co/storage/v1/object/public/dumpstr-media/[userId]/[timestamp]_[filename]
        const url = new URL(item.filePath)
        const pathParts = url.pathname.split('/dumpstr-media/')
        if (pathParts[1]) {
          const deleted = await deleteFromSupabase(pathParts[1])
          if (!deleted) {
            errors.push("Failed to delete main file from storage")
          }
        }
      }

      if (isSupabaseUrl && item.thumbnailPath && item.thumbnailPath !== item.filePath) {
        const url = new URL(item.thumbnailPath)
        const pathParts = url.pathname.split('/dumpstr-media/')
        if (pathParts[1]) {
          const deleted = await deleteFromSupabase(pathParts[1])
          if (!deleted) {
            errors.push("Failed to delete thumbnail from storage")
          }
        }
      }

      // Delete carousel files if present
      if (item.carouselFiles && Array.isArray(item.carouselFiles)) {
        for (const carouselFile of item.carouselFiles) {
          if (carouselFile?.startsWith('http')) {
            const url = new URL(carouselFile)
            const pathParts = url.pathname.split('/dumpstr-media/')
            if (pathParts[1]) {
              const deleted = await deleteFromSupabase(pathParts[1])
              if (!deleted) {
                errors.push(`Failed to delete carousel file from storage`)
              }
            }
          }
        }
      }
    } catch (storageError) {
      console.error("Storage cleanup error:", storageError)
      errors.push("Failed to clean up some files from storage")
    }

    // Delete from database (this will cascade to related tables due to foreign key constraints)
    const deleteResult = await db
      .delete(downloadedContent)
      .where(and(
        eq(downloadedContent.id, contentId),
        eq(downloadedContent.userId, userId)
      ))

    return NextResponse.json({
      success: true,
      message: "Content deleted successfully",
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error("Delete content error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}