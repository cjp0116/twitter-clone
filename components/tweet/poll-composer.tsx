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
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
    updatePoll(newOptions, durationHours)
  }

  const addOption = () => {
    if (options.length < 4) {
      const newOptions = [...options, ""]
      setOptions(newOptions)
      updatePoll(newOptions, durationHours)
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
    // Only send poll data if at least 2 options have text
    const filledOptions = opts.filter((opt) => opt.trim().length > 0)
    console.log("PollComposer updatePoll - options:", opts, "filled:", filledOptions.length)

    if (filledOptions.length >= 2) {
      const pollData = {
        options: opts,
        durationHours: hours,
      }
      // console.log("PollComposer sending poll data:", pollData)
      onPollChange(pollData)
    } else {
      // console.log("PollComposer: Not enough options, sending null")
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
                className="h-9 w-9 shrink-0"
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
        <Select value={durationHours.toString()} onValueChange={handleDurationChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 hour</SelectItem>
            <SelectItem value="24">1 day</SelectItem>
            <SelectItem value="72">3 days</SelectItem>
            <SelectItem value="168">7 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
