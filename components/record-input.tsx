"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Record, AttributeGroup } from "@/lib/types"

interface RecordInputProps {
  records: Record[]
  setRecords: (records: Record[]) => void
  attributeGroups: AttributeGroup[]
}

export function RecordInput({ records, setRecords, attributeGroups }: RecordInputProps) {
  const addRecord = () => {
    const newRecord: Record = {
      id: Date.now().toString(),
      value: 1,
      attributes: [],
    }
    setRecords([...records, newRecord])
  }

  const updateRecord = (id: string, updates: Partial<Record>) => {
    setRecords(records.map((r) => (r.id === id ? { ...r, ...updates } : r)))
  }

  const removeRecord = (id: string) => {
    setRecords(records.filter((r) => r.id !== id))
  }

  const toggleAttribute = (recordId: string, groupId: string, attribute: string) => {
    const record = records.find((r) => r.id === recordId)
    if (!record) return

    const group = attributeGroups.find((g) => g.id === groupId)
    if (!group) return

    // Remove any existing attributes from this group
    const filteredAttributes = record.attributes.filter((a) => !group.attributes.includes(a))

    // Toggle the selected attribute
    const newAttributes = record.attributes.includes(attribute)
      ? filteredAttributes
      : [...filteredAttributes, attribute]

    updateRecord(recordId, { attributes: newAttributes })
  }

  return (
    <div className="space-y-4">
      {records.map((record) => (
        <div key={record.id} className="p-4 border border-border rounded-md space-y-3 bg-card">
          <div>
            <Label className="text-xs">Value</Label>
            <Input
              type="number"
              value={record.value}
              onChange={(e) => updateRecord(record.id, { value: Number(e.target.value) })}
              min={0}
              step={0.1}
            />
          </div>
          {attributeGroups.map((group) => (
            <div key={group.id}>
              <Label className="text-xs">{group.name}</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {group.attributes.map((attr) => (
                  <button
                    key={attr}
                    onClick={() => toggleAttribute(record.id, group.id, attr)}
                    className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                      record.attributes.includes(attr)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-input hover:bg-accent"
                    }`}
                  >
                    {attr}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Button variant="destructive" size="sm" onClick={() => removeRecord(record.id)} className="w-full">
            Remove Record
          </Button>
        </div>
      ))}
      <Button onClick={addRecord} variant="outline" className="w-full bg-transparent">
        + Add Record
      </Button>
    </div>
  )
}
