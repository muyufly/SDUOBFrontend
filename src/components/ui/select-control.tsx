import type { ReactNode } from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export function SelectControl({
  value,
  onValueChange,
  options,
  icon,
  className,
  disabled,
  "aria-label": label,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  // Prefix every value so optional choices can represent an empty string in Radix.
  const encode = (value: string) => `choice:${value}`;
  return (
    <SelectPrimitive.Root
      value={encode(value)}
      onValueChange={(value) => onValueChange(value.slice(7))}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        className={cn("select-control", className)}
        aria-label={label}
      >
        {icon && (
          <span className="select-leading-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon className="select-chevron">
          <ChevronDown size={15} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="select-content"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          data-ui
        >
          <SelectPrimitive.ScrollUpButton className="select-scroll">
            <ChevronUp size={15} />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="select-options">
            {options.map((option) => (
              <SelectPrimitive.Item
                className="select-option"
                key={option.value}
                value={encode(option.value)}
                disabled={option.disabled}
              >
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
                <span className="select-option-indicator">
                  <SelectPrimitive.ItemIndicator>
                    <Check size={15} />
                  </SelectPrimitive.ItemIndicator>
                </span>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="select-scroll">
            <ChevronDown size={15} />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
