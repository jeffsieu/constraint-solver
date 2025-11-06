"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { Requirement } from "@/lib/types";

interface RequirementsTreeProps {
  requirement: Requirement;
  setRequirement: (req: Requirement) => void;
  attributeGroups?: { id: string; name: string; attributes: string[] }[];
}

export function RequirementsTree({
  requirement,
  setRequirement,
  attributeGroups = [],
}: RequirementsTreeProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateRequirement = (id: string, updates: Partial<Requirement>) => {
    const update = (req: Requirement): Requirement => {
      if (req.id === id) {
        if (req.type === "simple") {
          return {
            ...req,
            ...(updates as Partial<Requirement>),
          } as Requirement;
        } else {
          // Strip simple-only fields if accidentally provided
          const { constraint, value, attributes, ...rest } = updates as any;
          return { ...req, ...rest } as Requirement;
        }
      }
      if (req.type === "complex") {
        return {
          ...req,
          children: req.children.map(update),
        };
      }
      return req;
    };
    setRequirement(update(requirement));
  };

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
          };

    const update = (req: Requirement): Requirement => {
      if (req.id === parentId && req.type === "complex") {
        return {
          ...req,
          children: [...req.children, newChild],
        };
      }
      if (req.type === "complex") {
        return {
          ...req,
          children: req.children.map(update),
        };
      }
      return req;
    };
    setRequirement(update(requirement));
  };

  const removeRequirement = (id: string) => {
    const remove = (req: Requirement): Requirement | null => {
      if (req.type === "complex") {
        const filteredChildren = req.children
          .map(remove)
          .filter((c): c is Requirement => c !== null);
        return { ...req, children: filteredChildren };
      }
      return req;
    };

    const removeFromParent = (req: Requirement): Requirement => {
      if (req.type === "complex") {
        return {
          ...req,
          children: req.children
            .filter((c) => c.id !== id)
            .map(removeFromParent),
        };
      }
      return req;
    };

    setRequirement(removeFromParent(requirement));
  };

  const renderRequirement = (req: Requirement, depth = 0) => {
    if (req.type === "simple") {
      return (
        <div key={req.id} className="flex items-start gap-2">
          {depth > 0 && (
            <div className="flex items-center pt-6">
              <div className="w-4 h-px bg-border" />
            </div>
          )}
          <div className="flex-1 p-4 border border-border rounded-md space-y-3 bg-accent/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Simple Condition
              </span>
              {depth > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRequirement(req.id)}
                >
                  ✕
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Constraint</Label>
                <Select
                  value={req.constraint}
                  onValueChange={(val) =>
                    updateRequirement(req.id, {
                      constraint: val as "minimum" | "maximum",
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimum">Minimum</SelectItem>
                    <SelectItem value="maximum">Maximum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Value</Label>
                <Input
                  type="number"
                  value={req.value}
                  onChange={(e) =>
                    updateRequirement(req.id, { value: Number(e.target.value) })
                  }
                  min={0}
                  step={0.1}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Attributes</Label>
              <MultiSelect
                options={attributeGroups.map((g) => {
                  // Check if any attribute from this group is already selected
                  const hasSelectedFromGroup = g.attributes.some((attr) =>
                    req.attributes.includes(attr)
                  );

                  // If an attribute from this group is selected, disable all others in the group
                  return {
                    label: g.name,
                    options: g.attributes.map((attr) => ({
                      value: attr,
                      disabled:
                        hasSelectedFromGroup && !req.attributes.includes(attr),
                    })),
                  } as const;
                })}
                selected={req.attributes}
                onChange={(next) =>
                  updateRequirement(req.id, { attributes: next })
                }
                placeholder="Select attributes"
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={req.id} className="flex items-start gap-2">
        {depth > 0 && (
          <div className="flex items-center pt-6">
            <div className="w-4 h-px bg-border" />
          </div>
        )}
        <div className="flex-1">
          <div className="p-4 border rounded-md space-y-3 bg-[#ffd7a8] border-border">
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleCollapse(req.id)}
                className="flex items-center gap-2 text-sm font-semibold text-foreground hover:opacity-70 transition-opacity"
              >
                <svg
                  className={cn(
                    "w-4 h-4 transition-transform",
                    collapsed[req.id] ? "-rotate-90" : ""
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
                <span>
                  Complex Condition
                  {collapsed[req.id] && req.children.length > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({req.children.length} child
                      {req.children.length !== 1 ? "ren" : ""})
                    </span>
                  )}
                </span>
              </button>
              {depth > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRequirement(req.id)}
                >
                  ✕
                </Button>
              )}
            </div>
            {!collapsed[req.id] && (
              <>
                <div>
                  <Label className="text-xs">Operator</Label>
                  <Select
                    value={req.operator}
                    onValueChange={(val) =>
                      updateRequirement(req.id, {
                        operator: val as "AND" | "OR",
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">
                        AND (all must be satisfied)
                      </SelectItem>
                      <SelectItem value="OR">
                        OR (at least one must be satisfied)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addChild(req.id, "simple")}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Simple Condition
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addChild(req.id, "complex")}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Complex Condition
                  </Button>
                </div>
              </>
            )}
          </div>
          {!collapsed[req.id] && req.children.length > 0 && (
            <div className="relative ml-8 mt-2">
              {/* Vertical connector line */}
              <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
              {/* Children */}
              <div className="space-y-2 pl-2">
                {req.children.map((child) =>
                  renderRequirement(child, depth + 1)
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return <div className="space-y-4">{renderRequirement(requirement)}</div>;
}
