import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AttributeGroup } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate color based on recordId for consistency using OKLCH
export function generateRecordColor(recordId: string) {
  // Simple hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < recordId.length; i++) {
    hash = recordId.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Convert to hue (0-360)
  const hue = Math.abs(hash % 360);
  // OKLCH: L (lightness 0-1), C (chroma 0-0.4), H (hue 0-360)
  // Using higher lightness (0.85) and lower chroma (0.1) for pastel colors
  return `oklch(0.85 0.1 ${hue})`;
}

export function formatAttributeCombination(attributes: string[]) {
  const sorted = attributes.toSorted();
  return sorted.length > 0 ? sorted.join(" + ") : "No attributes";
}

export type AttributeOrdering = {
  groupOrder: Map<string, number>;
  attributeOrderWithinGroup: Map<string, number>;
};

export function createAttributeOrdering(
  attributeGroups?: AttributeGroup[] | null
): AttributeOrdering {
  const groupOrder = new Map<string, number>();
  const attributeOrderWithinGroup = new Map<string, number>();

  attributeGroups?.forEach((group, groupIndex) => {
    group.attributes.forEach((attribute, attributeIndex) => {
      groupOrder.set(attribute, groupIndex);
      attributeOrderWithinGroup.set(attribute, attributeIndex);
    });
  });

  return { groupOrder, attributeOrderWithinGroup };
}

export function sortAttributesByGroup(
  attributes: string[],
  attributeGroups?: AttributeGroup[] | null,
  ordering?: AttributeOrdering
) {
  if (!attributes || attributes.length === 0) {
    return [] as string[];
  }

  const effectiveOrdering =
    ordering ?? createAttributeOrdering(attributeGroups);
  const { groupOrder, attributeOrderWithinGroup } = effectiveOrdering;

  if (groupOrder.size === 0 && attributeOrderWithinGroup.size === 0) {
    return attributes.slice().sort((a, b) => a.localeCompare(b));
  }

  const originalIndex = new Map<string, number>();
  attributes.forEach((attr, index) => {
    if (!originalIndex.has(attr)) {
      originalIndex.set(attr, index);
    }
  });

  const MAX_RANK = Number.MAX_SAFE_INTEGER;

  return attributes.slice().sort((a, b) => {
    const groupA = groupOrder.get(a);
    const groupB = groupOrder.get(b);

    const attrOrderA = attributeOrderWithinGroup.get(a);
    const attrOrderB = attributeOrderWithinGroup.get(b);

    if (groupA !== undefined || groupB !== undefined) {
      const groupRankA = groupA ?? MAX_RANK;
      const groupRankB = groupB ?? MAX_RANK;
      if (groupRankA !== groupRankB) {
        return groupRankA - groupRankB;
      }

      const attrRankA = attrOrderA ?? MAX_RANK;
      const attrRankB = attrOrderB ?? MAX_RANK;
      if (attrRankA !== attrRankB) {
        return attrRankA - attrRankB;
      }
    }

    const originalA = originalIndex.get(a) ?? MAX_RANK;
    const originalB = originalIndex.get(b) ?? MAX_RANK;
    if (originalA !== originalB) return originalA - originalB;

    return a.localeCompare(b);
  });
}

export function formatAttributesByGroup(
  attributes: string[],
  attributeGroups?: AttributeGroup[] | null,
  ordering?: AttributeOrdering
) {
  if (!attributeGroups || attributeGroups.length === 0) {
    return formatAttributeCombination(attributes);
  }

  const sorted = sortAttributesByGroup(attributes, attributeGroups, ordering);
  return sorted.length > 0 ? sorted.join(" + ") : "No attributes";
}
