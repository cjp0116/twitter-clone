"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"

export interface PollData {
  options: string[]
  durationHours: number
}

interface PollComposerProps {
  onPollChange: (poll: PollData | null) => void
  onRemove: () => void
}

export function PollComposer({ onPollChange, onRemove }: PollComposerProps) {
  const [options, setOptions] = useState<string[]>(["", ""])
  const [durationHours, setDurationHours] = useState<number>(24)

  const handleOptionChange = (index: number, value: string) => {
    setOptions(options.map((option, i) => i === index ? value : option))
  }

  const addOption = () => {
    if (options.length < 4) {
      setOptions([...options, ""])
      updatePoll(options, durationHours)
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index)
      setOptions(newOptions)
      updatePoll(newOptions, durationHours)
    }
  }

  const handleDurationChange = (value: string) => {
    const hours = parseInt(value)
    setDurationHours(hours)
    updatePoll(options, hours)
  }

  const updatePoll = (opts: string[], hours: number) => {
    const filledOptions = opts.filter(opt => opt.trim().length > 0)
    if (filledOptions.length > 1) {
      onPollChange({
        options: opts,
        durationHours: hours
      })
    } else {
      onPollChange(null)
    }
  }
  return (
    <div className="border border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Poll</Label>
        <Button variant="ghost" size="icon" onClick={onRemove} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </div>


      {/* Poll Options */}
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder={`Choice ${index + 1}`}
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value.slice(0, 25))}
              maxLength={25}
              className="flex-1"
            />
            {options.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeOption(index)}
                className="h-9 w-9 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Add Option Button */}
      {options.length < 4 && (
        <Button variant="outline" size="sm" onClick={addOption} className="w-full">
          Add choice
        </Button>
      )}

      {/* Duration Selector */}
      <div className="space-y-2">
        <Label className="text-sm">Poll duration</Label>
        <Input
          type="number"
          value={durationHours}
          onChange={(e) => handleDurationChange(e.target.value)}
          min={1}
          max={168}
          className="w-24"
        />
        <span className="text-xs text-muted-foreground">
          {durationHours} hour{durationHours !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  )
}