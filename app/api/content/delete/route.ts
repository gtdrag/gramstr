import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { downloadedContent } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import fs from "fs/promises"
import path from "path"

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

    // Clean up files from filesystem
    try {
      if (item.filePath) {
        const fullFilePath = path.join(process.cwd(), "downloads", userId, item.filePath)
        try {
          await fs.access(fullFilePath)
          await fs.unlink(fullFilePath)
        } catch (fileError) {
          console.log(`File not found or already deleted: ${fullFilePath}`)
        }
      }

      if (item.thumbnailPath && item.thumbnailPath !== item.filePath) {
        const fullThumbnailPath = path.join(process.cwd(), "downloads", userId, item.thumbnailPath)
        try {
          await fs.access(fullThumbnailPath)
          await fs.unlink(fullThumbnailPath)
        } catch (fileError) {
          console.log(`Thumbnail not found or already deleted: ${fullThumbnailPath}`)
        }
      }

      // Clean up any additional metadata files (.info.json)
      if (item.filePath) {
        const baseFileName = item.filePath.replace(/\.(mp4|jpg|jpeg|png|webp)$/i, '')
        const infoFilePath = path.join(process.cwd(), "downloads", userId, `${baseFileName}.info.json`)
        try {
          await fs.access(infoFilePath)
          await fs.unlink(infoFilePath)
        } catch (fileError) {
          console.log(`Info file not found: ${infoFilePath}`)
        }
      }
    } catch (filesystemError) {
      console.error("Filesystem cleanup error:", filesystemError)
      errors.push("Failed to clean up some files")
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