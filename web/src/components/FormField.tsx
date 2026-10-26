import type { ReactNode } from "react";

export const FormField = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="form-field">
    <span>{label}</span>
    {children}
  </label>
);