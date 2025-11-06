"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Plus } from "lucide-react";
import { useHoveredEntity } from "@/hooks/use-hovered-entity";
import {
  generateRecordColor,
  cn,
  formatAttributesByGroup,
} from "@/lib/utils";
import type { Record, AttributeGroup } from "@/lib/types";

interface RecordInputProps {
  records: Record[];
  setRecords: (records: Record[]) => void;
  attributeGroups: AttributeGroup[];
}

export function RecordInput({
  records,
  setRecords,
  attributeGroups,
}: RecordInputProps) {
  const { hoveredEntity, setHoveredEntity } = useHoveredEntity();
  const combinationByRecordId = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((record) => {
      map.set(
        record.id,
        formatAttributesByGroup(record.attributes, attributeGroups)
      );
    });
    return map;
  }, [records, attributeGroups]);

  const hoveredRecordId =
    hoveredEntity?.type === "record" ? hoveredEntity.recordId : null;
  const hoveredCombination =
    hoveredEntity?.type === "combination"
      ? hoveredEntity.combination
      : hoveredEntity?.type === "record"
      ? combinationByRecordId.get(hoveredEntity.recordId) ?? null
      : null;
  const addRecord = () => {
    const newRecord: Record = {
      id: crypto.randomUUID(),
      value: 1,
      attributes: [],
    };
    setRecords([...records, newRecord]);
  };

  const updateRecord = (id: string, updates: Partial<Record>) => {
    setRecords(records.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const removeRecord = (id: string) => {
    setRecords(records.filter((r) => r.id !== id));
  };

  const toggleAttribute = (
    recordId: string,
    groupId: string,
    attribute: string
  ) => {
    const record = records.find((r) => r.id === recordId);
    if (!record) return;

    const group = attributeGroups.find((g) => g.id === groupId);
    if (!group) return;

    // Remove any existing attributes from this group
    const filteredAttributes = record.attributes.filter(
      (a) => !group.attributes.includes(a)
    );

    // Toggle the selected attribute
    const newAttributes = record.attributes.includes(attribute)
      ? filteredAttributes
      : [...filteredAttributes, attribute];

    updateRecord(recordId, { attributes: newAttributes });
  };

  return (
    <div className="space-y-2">
      {records.map((record, index) => {
        const recordColor = generateRecordColor(record.id);
        const combinationKey = combinationByRecordId.get(record.id) ?? "";
        const isRecordHovered = hoveredRecordId === record.id;
        const isCombinationHovered =
          hoveredCombination === combinationKey && !isRecordHovered;
        return (
          <div
            key={record.id}
            className={cn(
              "p-3 rounded-md transition-all border-2",
              isRecordHovered
                ? "border-primary brightness-90 saturate-125"
                : isCombinationHovered
                ? "border-primary/70 brightness-95 saturate-110"
                : "border-border hover:brightness-90 hover:saturate-125"
            )}
            style={{ backgroundColor: recordColor }}
            onMouseEnter={() =>
              setHoveredEntity({ type: "record", recordId: record.id })
            }
            onMouseLeave={() =>
              setHoveredEntity((current) =>
                current?.type === "record" && current.recordId === record.id
                  ? null
                  : current
              )
            }
          >
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-3">
                <div className="flex-none w-8 text-center font-bold text-muted-foreground">
                  #{index + 1}
                </div>
                <div className="flex-none w-24">
                  <Label className="text-xs mb-1 block">Value</Label>
                  <Input
                    type="number"
                    value={record.value}
                    onChange={(e) =>
                      updateRecord(record.id, { value: Number(e.target.value) })
                    }
                    min={0}
                    step={0.1}
                    className="h-8"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <Label className="text-xs block">Attributes</Label>
                <div className="flex flex-col gap-2">
                  {attributeGroups.map((group) => (
                    <div key={group.id} className="flex items-center gap-2">
                      <div className="flex gap-1 flex-wrap">
                        {group.attributes.map((attr) => (
                          <button
                            key={attr}
                            onClick={() =>
                              toggleAttribute(record.id, group.id, attr)
                            }
                            className={cn(
                              "px-3 py-1.5 text-sm rounded border transition-all duration-200 inline-flex items-center gap-1.5 whitespace-nowrap",
                              record.attributes.includes(attr)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-input hover:bg-accent"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-flex transition-all duration-200 overflow-hidden",
                                record.attributes.includes(attr)
                                  ? "w-3.5"
                                  : "w-0"
                              )}
                            >
                              <Check className="h-3.5 w-3.5 shrink-0" />
                            </span>
                            {attr}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRecord(record.id)}
                className="h-8 w-8 flex-none p-0 text-muted-foreground hover:text-foreground"
                aria-label={`Remove record ${index + 1}`}
              >
                ✕
              </Button>
            </div>
          </div>
        );
      })}
      <Button onClick={addRecord} variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Record
      </Button>
    </div>
  );
}
