"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TweetMediaGalleryProps {
  mediaUrls: string[]
  mediaTypes: string[]
}

export function TweetMediaGallery({ mediaUrls, mediaTypes }: TweetMediaGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!mediaUrls || mediaUrls.length === 0) return null

  const openLightbox = (index: number) => {
    setCurrentIndex(index)
    setLightboxOpen(true)
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % mediaUrls.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length)
  }

  const getGridClass = () => {
    switch (mediaUrls.length) {
      case 1:
        return "grid-cols-1"
      case 2:
        return "grid-cols-2"
      case 3:
        return "grid-cols-2"
      case 4:
        return "grid-cols-2"
      default:
        return "grid-cols-2"
    }
  }

  return (
    <>
      <div className={`grid ${getGridClass()} gap-0.5 mt-3 rounded-2xl overflow-hidden border border-gray-800`}>
        {mediaUrls.map((url, index) => {
          const mediaType = mediaTypes[index] || "image"

          return (
            <div
              key={index}
              className={`relative group cursor-pointer ${
                mediaUrls.length === 3 && index === 0 ? "row-span-2" : ""
              } bg-gray-900`}
              style={{
                aspectRatio: mediaUrls.length === 1 ? "16/9" : "1/1",
              }}
              onClick={() => openLightbox(index)}
            >
              {mediaType === "video" ? (
                <video
                  src={url}
                  className="w-full h-full object-cover"
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  controls
                />
              ) : (
                <>
                  <img src={url} alt={`Media ${index + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-7xl w-full h-full max-h-screen bg-black/95 border-none p-0">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/10"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Previous button */}
            {mediaUrls.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 z-50 text-white hover:bg-white/10"
                onClick={prevImage}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
            )}

            {/* Image/Video */}
            <div className="w-full h-full flex items-center justify-center p-4">
              {mediaTypes[currentIndex] === "video" ? (
                <video src={mediaUrls[currentIndex]} className="max-w-full max-h-full object-contain" controls autoPlay />
              ) : (
                <img
                  src={mediaUrls[currentIndex]}
                  alt={`Media ${currentIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            {/* Next button */}
            {mediaUrls.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 z-50 text-white hover:bg-white/10"
                onClick={nextImage}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            )}

            {/* Counter */}
            {mediaUrls.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                {currentIndex + 1} / {mediaUrls.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
