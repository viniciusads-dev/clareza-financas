"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
export default function Picker({
  label,
  value,
  onChange,
  options,
  allowEmpty = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allowEmpty?: boolean;
}) {
  const selectedValue =
    value || (allowEmpty ? "__empty__" : (options[0]?.value ?? ""));
  return (
    <div className="field">
      <span>{label}</span>
      <Select
        value={selectedValue}
        onValueChange={(next) => onChange(next === "__empty__" ? "" : next)}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent position="popper">
          {allowEmpty && <SelectItem value="__empty__">Nenhuma</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
