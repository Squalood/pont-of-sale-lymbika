import { NotebookPen } from "lucide-react";

interface NoteInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function NoteInput({ value, onChange }: NoteInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <NotebookPen className="h-3.5 w-3.5" />
        Nota (opcional)
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ej. nombre del paciente, indicaciones..."
        rows={2}
        className="w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}
