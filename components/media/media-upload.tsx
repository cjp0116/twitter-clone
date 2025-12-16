"use client"

import { useState, useRef, useImperativeHandle, createRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Image as ImageIcon, X, Loader2 } from "lucide-react"

interface MediaFile {
  file: File
  preview: string
  type: "image" | "video" | "gif"
}

interface MediaUploadProps {
  onMediaChange: (urls: string[], types: string[]) => void
  maxFiles?: number
}

export function MediaUpload({ onMediaChange, maxFiles = 4 }: MediaUploadProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remainingSlots = maxFiles - mediaFiles.length

    if (files.length > remainingSlots) {
      alert(`You can only upload ${maxFiles} files maximum`)
      return
    }

    const newMediaFiles: MediaFile[] = []

    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const preview = URL.createObjectURL(file)
        const type = file.type === "image/gif" ? "gif" : "image"
        newMediaFiles.push({ file, preview, type })
      } else if (file.type.startsWith("video/")) {
        const preview = URL.createObjectURL(file)
        newMediaFiles.push({ file, preview, type: "video" })
      }
    })

    setMediaFiles((prev) => [...prev, ...newMediaFiles])

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }

  const uploadMedia = async (): Promise<{ urls: string[]; types: string[] }> => {
    if (mediaFiles.length === 0) {
      return { urls: [], types: [] }
    }

    setUploading(true)

    try {
      const uploadPromises = mediaFiles.map(async (mediaFile) => {
        const fileExt = mediaFile.file.name.split(".").pop()
        const fileName = `${crypto.randomUUID()}.${fileExt}`
        const filePath = `tweets/${fileName}`

        const { data, error } = await supabase.storage.from("media").upload(filePath, mediaFile.file)

        if (error) {
          console.error("Error uploading file:", error)
          return null
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("media").getPublicUrl(filePath)

        return {
          url: publicUrl,
          type: mediaFile.type,
        }
      })

      const results = await Promise.all(uploadPromises)
      const validResults = results.filter((r) => r !== null) as { url: string; type: string }[]

      const urls = validResults.map((r) => r.url)
      const types = validResults.map((r) => r.type)

      onMediaChange(urls, types)

      return { urls, types }
    } catch (error) {
      console.error("Error uploading media:", error)
      return { urls: [], types: [] }
    } finally {
      setUploading(false)
    }
  }

  // Expose upload function to parent
  useImperativeHandle(
    createRef<MediaUploadRef | null>(),
    () => ({
      upload: uploadMedia,
    }),
    [mediaFiles],
  )

  const getGridClass = () => {
    switch (mediaFiles.length) {
      case 1:
        return "grid-cols-1"
      case 2:
        return "grid-cols-2"
      case 3:
        return "grid-cols-2"
      case 4:
        return "grid-cols-2"
      default:
        return "grid-cols-1"
    }
  }

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        aria-label="Upload media"
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {mediaFiles.length > 0 && (
        <div className={`grid ${getGridClass()} gap-2 mt-3 rounded-2xl overflow-hidden`}>
          {mediaFiles.map((media, index) => (
            <div
              key={index}
              className={`relative group ${
                mediaFiles.length === 3 && index === 0 ? "row-span-2" : ""
              } bg-gray-900 rounded-xl overflow-hidden`}
              style={{ minHeight: mediaFiles.length === 1 ? "300px" : "150px" }}
            >
              {media.type === "video" ? (
                <video
                  src={media.preview}
                  className="w-full h-full object-cover"
                  controls
                />
              ) : (
                <img
                  src={media.preview}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}

              <button
                type="button"
                onClick={() => removeMedia(index)}
                title="Remove media"
                className="absolute top-2 right-2 bg-gray-900/80 hover:bg-gray-900 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={uploading}
              >
                <X className="w-4 h-4" />
              </button>

              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {mediaFiles.length < maxFiles && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Upload media"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={mediaFiles.length > 0 ? "mt-2" : ""}
        >
          <ImageIcon className="w-5 h-5 text-blue-500" />
        </Button>
      )}
    </div>
  )
}

// Export ref type for parent components
export type MediaUploadRef = {
  upload: () => Promise<{ urls: string[]; types: string[] }>
}
