import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
