import type { AnyFieldApi } from "@tanstack/react-form";

export function FieldInfo({ field }: { field: AnyFieldApi }) {
  const { isTouched, isValid, isValidating, errors } = field.state.meta;

  if (isValidating) {
    return <p className="text-xs text-muted-foreground">Validating…</p>;
  }

  if (isTouched && !isValid) {
    return <p className="text-xs text-destructive">{errors.join(", ")}</p>;
  }

  return null;
}
