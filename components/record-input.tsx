"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Plus } from "lucide-react";
import type { Record, AttributeGroup } from "@/lib/types";

interface RecordInputProps {
  records: Record[];
  setRecords: (records: Record[]) => void;
  attributeGroups: AttributeGroup[];
  hoveredRecordId?: string | null;
  onHoverRecord?: (id: string | null) => void;
}

export function RecordInput({
  records,
  setRecords,
  attributeGroups,
  hoveredRecordId,
  onHoverRecord,
}: RecordInputProps) {
  const addRecord = () => {
    const newRecord: Record = {
      id: Date.now().toString(),
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
      {records.map((record, index) => (
        <div
          key={record.id}
          className={`p-3 rounded-md transition-colors border-2 ${
            hoveredRecordId === record.id
              ? "border-primary bg-accent/20"
              : "bg-card border-border hover:bg-accent/10"
          }`}
          onMouseEnter={() => onHoverRecord?.(record.id)}
          onMouseLeave={() => onHoverRecord?.(null)}
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
                          className={`px-3 py-1.5 text-sm rounded border transition-all duration-200 inline-flex items-center gap-1.5 whitespace-nowrap ${
                            record.attributes.includes(attr)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-input hover:bg-accent"
                          }`}
                        >
                          <span
                            className={`inline-flex transition-all duration-200 overflow-hidden ${
                              record.attributes.includes(attr) ? "w-3.5" : "w-0"
                            }`}
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
      ))}
      <Button onClick={addRecord} variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Record
      </Button>
    </div>
  );
}
