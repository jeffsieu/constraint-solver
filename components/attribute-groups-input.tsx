"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AttributeGroup } from "@/lib/types"

interface AttributeGroupsInputProps {
  attributeGroups: AttributeGroup[]
  setAttributeGroups: (groups: AttributeGroup[]) => void
}

export function AttributeGroupsInput({ attributeGroups, setAttributeGroups }: AttributeGroupsInputProps) {
  const addGroup = () => {
    const newGroup: AttributeGroup = {
      id: Date.now().toString(),
      name: "",
      attributes: [],
    }
    setAttributeGroups([...attributeGroups, newGroup])
  }

  const updateGroup = (id: string, updates: Partial<AttributeGroup>) => {
    setAttributeGroups(attributeGroups.map((g) => (g.id === id ? { ...g, ...updates } : g)))
  }

  const removeGroup = (id: string) => {
    setAttributeGroups(attributeGroups.filter((g) => g.id !== id))
  }

  const updateAttributes = (id: string, value: string) => {
    const attributes = value
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a.length > 0)
    updateGroup(id, { attributes })
  }

  return (
    <div className="space-y-4">
      {attributeGroups.map((group) => (
        <div key={group.id} className="p-4 border border-border rounded-md space-y-3 bg-card">
          <div>
            <Label className="text-xs">Group Name</Label>
            <Input
              value={group.name}
              onChange={(e) => updateGroup(group.id, { name: e.target.value })}
              placeholder="e.g., Day/Night"
            />
          </div>
          <div>
            <Label className="text-xs">Attributes (comma-separated)</Label>
            <Input
              value={group.attributes.join(", ")}
              onChange={(e) => updateAttributes(group.id, e.target.value)}
              placeholder="e.g., Day, Night"
            />
          </div>
          <Button variant="destructive" size="sm" onClick={() => removeGroup(group.id)} className="w-full">
            Remove Group
          </Button>
        </div>
      ))}
      <Button onClick={addGroup} variant="outline" className="w-full bg-transparent">
        + Add Attribute Group
      </Button>
    </div>
  )
}
