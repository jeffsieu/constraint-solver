import * as React from "react";
import { Check as CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
} from "./select";

type MultiSelectOption = {
  value: string;
  disabled?: boolean;
};

type MultiSelectOptionGroup = {
  label: string;
  options: (string | MultiSelectOption)[];
};

type OptionInput = string | MultiSelectOption | MultiSelectOptionGroup;

type MultiSelectProps = {
  options?: OptionInput[];
  selected: string[];
  placeholder?: string;
  onChange: (next: string[]) => void;
};

export function MultiSelect({
  options = [],
  selected,
  placeholder = "Select...",
  onChange,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = React.useState(selected.length);

  const toggle = () => setOpen((v) => !v);

  // Calculate how many chips can fit
  React.useEffect(() => {
    if (!containerRef.current || selected.length === 0) {
      setVisibleCount(selected.length);
      return;
    }

    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const chips = container.querySelectorAll<HTMLElement>("[data-chip]");

    let totalWidth = 0;
    let count = 0;
    const gap = 8; // gap-2 = 8px
    const moreIndicatorWidth = 60; // approximate width for "+X more"

    for (let i = 0; i < chips.length; i++) {
      const chipWidth = chips[i].offsetWidth;
      const widthNeeded = totalWidth + chipWidth + (i > 0 ? gap : 0);

      // If not the last chip and would need space for indicator
      if (i < chips.length - 1) {
        if (widthNeeded + gap + moreIndicatorWidth > containerWidth) {
          break;
        }
      } else {
        // Last chip, no indicator needed
        if (widthNeeded > containerWidth) {
          break;
        }
      }

      totalWidth = widthNeeded;
      count++;
    }

    setVisibleCount(count);
  }, [selected]);

  const normalizeOption = (
    opt: string | MultiSelectOption
  ): MultiSelectOption =>
    typeof opt === "string" ? { value: opt, disabled: false } : opt;

  // Helper guards
  const isGroup = (o: OptionInput): o is MultiSelectOptionGroup =>
    typeof o === "object" && o !== null && "options" in o && "label" in o;

  const isOptionObject = (o: OptionInput): o is MultiSelectOption =>
    typeof o === "object" && o !== null && "value" in o && !("options" in o);

  // Normalize incoming mixed options into groups for rendering
  const allGroups: MultiSelectOptionGroup[] = (() => {
    const groups: MultiSelectOptionGroup[] = [];
    let flatAcc: (string | MultiSelectOption)[] = [];

    for (const item of options) {
      if (isGroup(item)) {
        // flush accumulated flat options first
        if (flatAcc.length > 0) {
          groups.push({ label: "", options: flatAcc });
          flatAcc = [];
        }
        groups.push({ label: item.label, options: item.options });
      } else {
        // string or option object
        flatAcc.push(item as string | MultiSelectOption);
      }
    }

    if (flatAcc.length > 0) {
      groups.push({ label: "", options: flatAcc });
    }

    return groups;
  })();

  const isSelected = (value: string) => selected.includes(value);

  const onToggleOption = (value: string, disabled: boolean = false) => {
    if (disabled) return;

    if (isSelected(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="relative inline-block w-full">
      <Select open={open} onOpenChange={setOpen}>
        <SelectTrigger
          className="w-full flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground justify-between"
          onClick={toggle}
        >
          <div
            ref={containerRef}
            className="flex-1 flex gap-2 min-w-0 overflow-hidden"
          >
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <>
                {selected.slice(0, visibleCount).map((s) => (
                  <span
                    key={s}
                    data-chip
                    className="inline-flex items-center gap-2 bg-card text-sm px-2 py-0.5 rounded-md border border-input shrink-0 max-w-[200px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleOption(s);
                    }}
                  >
                    <span className="truncate">{s}</span>
                    <span className="cursor-pointer text-xs shrink-0">✕</span>
                  </span>
                ))}
                {visibleCount < selected.length && (
                  <span className="inline-flex items-center text-sm text-muted-foreground shrink-0">
                    +{selected.length - visibleCount} more
                  </span>
                )}
              </>
            )}
          </div>
        </SelectTrigger>

        <SelectContent className="mt-2 w-full p-2 max-h-48 relative **:data-[slot='select-scroll-up-button']:absolute **:data-[slot='select-scroll-up-button']:left-0 **:data-[slot='select-scroll-up-button']:right-0 **:data-[slot='select-scroll-up-button']:top-1 **:data-[slot='select-scroll-down-button']:absolute **:data-[slot='select-scroll-down-button']:left-0 **:data-[slot='select-scroll-down-button']:right-0 **:data-[slot='select-scroll-down-button']:bottom-1">
          <div className="relative flex flex-col gap-1 overflow-auto pt-3 pb-3">
            {allGroups.map((group, groupIndex) => (
              <React.Fragment key={groupIndex}>
                <SelectGroup>
                  {group.label && <SelectLabel>{group.label}</SelectLabel>}

                  {group.options.map((opt) => {
                    const normalizedOpt = normalizeOption(opt);
                    return (
                      <button
                        key={normalizedOpt.value}
                        type="button"
                        onClick={() =>
                          onToggleOption(
                            normalizedOpt.value,
                            normalizedOpt.disabled
                          )
                        }
                        disabled={normalizedOpt.disabled}
                        className={cn(
                          "group relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none border border-transparent [&_svg:not([class*='text-'])]:text-muted-foreground",
                          normalizedOpt.disabled &&
                            "opacity-50 cursor-not-allowed",
                          isSelected(normalizedOpt.value)
                            ? "bg-accent text-accent-foreground"
                            : "hover:border-accent hover:text-foreground"
                        )}
                      >
                        <span>{normalizedOpt.value}</span>
                        {isSelected(normalizedOpt.value) && (
                          <span className="absolute right-2 flex size-3.5 items-center justify-center">
                            <CheckIcon className="size-4 text-accent-foreground group-hover:text-white opacity-90" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </SelectGroup>
                {groupIndex < allGroups.length - 1 && <SelectSeparator />}
              </React.Fragment>
            ))}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}
