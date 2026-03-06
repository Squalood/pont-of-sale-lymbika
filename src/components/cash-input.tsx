"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface CashEntry {
  amount: number;
  currency: "MXN" | "USD";
}

interface CashInputProps {
  total: number;
  tipoCambio: number;
  entries: CashEntry[];
  onEntriesChange: (entries: CashEntry[]) => void;
}

export function CashInput({ total, tipoCambio, entries, onEntriesChange }: CashInputProps) {
  const [currentAmount, setCurrentAmount] = useState("");
  const [currency, setCurrency] = useState<"MXN" | "USD">("MXN");

  const receivedTotal = entries.reduce(
    (sum, e) => sum + (e.currency === "MXN" ? e.amount : e.amount * tipoCambio),
    0
  );
  const remaining = total - receivedTotal;
  const change = receivedTotal - total;

  function addEntry() {
    const value = parseFloat(currentAmount);
    if (!value || value <= 0) return;
    onEntriesChange([...entries, { amount: value, currency }]);
    setCurrentAmount("");
  }

  function removeEntry(index: number) {
    onEntriesChange(entries.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addEntry();
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Recibido</label>

      {/* Input + currency toggle + add */}
      <div className="flex gap-2">
        <div className="flex shrink-0 overflow-hidden rounded-md border">
          <button
            type="button"
            onClick={() => setCurrency("MXN")}
            className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
              currency === "MXN"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            MXN
          </button>
          <button
            type="button"
            onClick={() => setCurrency("USD")}
            className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
              currency === "USD"
                ? "bg-green-600 text-white"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            USD
          </button>
        </div>
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
            $
          </span>
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-10 pl-7"
            autoFocus
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={addEntry}
          disabled={!currentAmount || parseFloat(currentAmount) <= 0}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick amounts — MXN */}
      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">Pesos MXN</p>
        <div className="flex flex-wrap gap-1.5">
          {[20, 50, 100, 200, 500, 1000].map((amount) => (
            <Button
              key={amount}
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => onEntriesChange([...entries, { amount, currency: "MXN" }])}
            >
              ${amount}
            </Button>
          ))}
        </div>
      </div>

      {/* Quick amounts — USD */}
      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">Dólares USD</p>
        <div className="flex flex-wrap gap-1.5">
          {[1, 5, 10, 20, 50, 100].map((amount) => (
            <Button
              key={amount}
              variant="outline"
              size="sm"
              className="h-8 border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => onEntriesChange([...entries, { amount, currency: "USD" }])}
            >
              ${amount}
            </Button>
          ))}
        </div>
      </div>

      {/* Entries list */}
      {entries.length > 0 && (
        <div className="space-y-1.5">
          <div className="max-h-36 space-y-1.5 overflow-y-auto">
            {entries.map((entry, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5"
              >
                {entry.currency === "MXN" ? (
                  <span className="text-sm">${entry.amount.toFixed(2)} MXN</span>
                ) : (
                  <span className="text-sm">
                    <span className="text-green-700">${entry.amount.toFixed(2)} USD</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      → ${(entry.amount * tipoCambio).toFixed(2)} MXN
                    </span>
                  </span>
                )}
                <button
                  onClick={() => removeEntry(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t pt-1.5 text-sm font-medium">
            <span>Total recibido</span>
            <span>${receivedTotal.toFixed(2)} MXN</span>
          </div>
        </div>
      )}

      {/* Remaining or Change */}
      {receivedTotal > 0 && remaining > 0 && (
        <div className="flex justify-between rounded-lg bg-amber-50 px-4 py-2 text-amber-700">
          <span className="text-sm font-medium">Falta</span>
          <span className="text-sm font-bold">${remaining.toFixed(2)}</span>
        </div>
      )}
      {receivedTotal >= total && receivedTotal > 0 && (
        <div className="flex justify-between rounded-lg bg-green-50 px-4 py-2 text-green-700">
          <span className="text-sm font-medium">Cambio</span>
          <span className="text-sm font-bold">${change.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
