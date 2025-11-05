"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Requirement } from "@/lib/types"

interface RequirementsTreeProps {
  requirement: Requirement
  setRequirement: (req: Requirement) => void
}

export function RequirementsTree({ requirement, setRequirement }: RequirementsTreeProps) {
  const updateRequirement = (id: string, updates: Partial<Requirement>) => {
    const update = (req: Requirement): Requirement => {
      if (req.id === id) {
        return { ...req, ...updates }
      }
      if (req.type === "complex") {
        return {
          ...req,
          children: req.children.map(update),
        }
      }
      return req
    }
    setRequirement(update(requirement))
  }

  const addChild = (parentId: string, childType: "simple" | "complex") => {
    const newChild: Requirement =
      childType === "simple"
        ? {
            id: Date.now().toString(),
            type: "simple",
            constraint: "maximum",
            value: 1,
            attributes: [],
          }
        : {
            id: Date.now().toString(),
            type: "complex",
            operator: "AND",
            children: [],
          }

    const update = (req: Requirement): Requirement => {
      if (req.id === parentId && req.type === "complex") {
        return {
          ...req,
          children: [...req.children, newChild],
        }
      }
      if (req.type === "complex") {
        return {
          ...req,
          children: req.children.map(update),
        }
      }
      return req
    }
    setRequirement(update(requirement))
  }

  const removeRequirement = (id: string) => {
    const remove = (req: Requirement): Requirement | null => {
      if (req.type === "complex") {
        const filteredChildren = req.children.map(remove).filter((c): c is Requirement => c !== null)
        return { ...req, children: filteredChildren }
      }
      return req
    }

    const removeFromParent = (req: Requirement): Requirement => {
      if (req.type === "complex") {
        return {
          ...req,
          children: req.children.filter((c) => c.id !== id).map(removeFromParent),
        }
      }
      return req
    }

    setRequirement(removeFromParent(requirement))
  }

  const updateAttributes = (id: string, value: string) => {
    const attributes = value
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a.length > 0)
    updateRequirement(id, { attributes })
  }

  const renderRequirement = (req: Requirement, depth = 0) => {
    if (req.type === "simple") {
      return (
        <div
          key={req.id}
          className="p-4 border border-border rounded-md space-y-3 bg-accent/30"
          style={{ marginLeft: `${depth * 16}px` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Simple Condition</span>
            {depth > 0 && (
              <Button variant="ghost" size="sm" onClick={() => removeRequirement(req.id)}>
                ✕
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Constraint</Label>
              <select
                value={req.constraint}
                onChange={(e) =>
                  updateRequirement(req.id, {
                    constraint: e.target.value as "minimum" | "maximum",
                  })
                }
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="minimum">Minimum</option>
                <option value="maximum">Maximum</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Value</Label>
              <Input
                type="number"
                value={req.value}
                onChange={(e) => updateRequirement(req.id, { value: Number(e.target.value) })}
                min={0}
                step={0.1}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Attributes (comma-separated)</Label>
            <Input
              value={req.attributes.join(", ")}
              onChange={(e) => updateAttributes(req.id, e.target.value)}
              placeholder="e.g., Day, Free"
            />
          </div>
        </div>
      )
    }

    return (
      <div
        key={req.id}
        className="p-4 border-2 border-primary/30 rounded-md space-y-3 bg-card"
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Complex Condition</span>
          {depth > 0 && (
            <Button variant="ghost" size="sm" onClick={() => removeRequirement(req.id)}>
              ✕
            </Button>
          )}
        </div>
        <div>
          <Label className="text-xs">Operator</Label>
          <select
            value={req.operator}
            onChange={(e) =>
              updateRequirement(req.id, {
                operator: e.target.value as "AND" | "OR",
              })
            }
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="AND">AND (all must be satisfied)</option>
            <option value="OR">OR (at least one must be satisfied)</option>
          </select>
        </div>
        <div className="space-y-2">{req.children.map((child) => renderRequirement(child, depth + 1))}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => addChild(req.id, "simple")} className="flex-1">
            + Simple Condition
          </Button>
          <Button variant="outline" size="sm" onClick={() => addChild(req.id, "complex")} className="flex-1">
            + Complex Condition
          </Button>
        </div>
      </div>
    )
  }

  return <div className="space-y-4">{renderRequirement(requirement)}</div>
}
