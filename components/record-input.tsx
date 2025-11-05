"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          <div className="flex items-center gap-3 mb-2">
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
            <div className="flex-1 min-w-0">
              {attributeGroups.map((group) => (
                <div
                  key={group.id}
                  className="inline-flex items-center gap-2 mr-4"
                >
                  <Label className="text-xs whitespace-nowrap">
                    {group.name}:
                  </Label>
                  <div className="inline-flex gap-1">
                    {group.attributes.map((attr) => (
                      <button
                        key={attr}
                        onClick={() =>
                          toggleAttribute(record.id, group.id, attr)
                        }
                        className={`px-2 py-0.5 text-xs rounded border transition-colors ${
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
      <Button
        onClick={addRecord}
        variant="outline"
        className="w-full h-8 bg-transparent"
      >
        + Add Record
      </Button>
    </div>
  );
}
