"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import type { AttributeGroup } from "@/lib/types";

interface AttributeGroupsInputProps {
  attributeGroups: AttributeGroup[];
  setAttributeGroups: (groups: AttributeGroup[]) => void;
}

export function AttributeGroupsInput({
  attributeGroups,
  setAttributeGroups,
}: AttributeGroupsInputProps) {
  // Keep a raw editing buffer per group so user can type commas/spaces freely
  const [rawValues, setRawValues] = useState<Record<string, string>>({});
  const addGroup = () => {
    const newGroup: AttributeGroup = {
      id: Date.now().toString(),
      name: "",
      attributes: [],
    };
    setAttributeGroups([...attributeGroups, newGroup]);
  };

  const updateGroup = (id: string, updates: Partial<AttributeGroup>) => {
    setAttributeGroups(
      attributeGroups.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
  };

  const removeGroup = (id: string) => {
    setAttributeGroups(attributeGroups.filter((g) => g.id !== id));
  };

  const updateAttributes = (id: string, value: string) => {
    setRawValues((prev) => ({ ...prev, [id]: value }));
    const attributes = value
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a.length > 0);
    updateGroup(id, { attributes });
  };

  return (
    <div className="space-y-4">
      {attributeGroups.map((group, index) => (
        <div
          key={group.id}
          className="p-4 border border-border rounded-md space-y-3 bg-[#c8e6c9]"
        >
          {/* Title and remove button */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">
              Attribute Group {index + 1}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeGroup(group.id)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
              aria-label="Remove group"
            >
              ✕
            </Button>
          </div>

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
              value={rawValues[group.id] ?? group.attributes.join(", ")}
              onChange={(e) => updateAttributes(group.id, e.target.value)}
              placeholder="e.g., Day, Night"
            />
          </div>
        </div>
      ))}
      <Button
        onClick={addGroup}
        variant="outline"
        className="w-full bg-transparent"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Attribute Group
      </Button>
    </div>
  );
}
