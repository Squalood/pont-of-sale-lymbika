"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CashInputProps {
  total: number;
  amounts: number[];
  onAmountsChange: (amounts: number[]) => void;
}

export function CashInput({ total, amounts, onAmountsChange }: CashInputProps) {
  const [currentAmount, setCurrentAmount] = useState("");

  const receivedTotal = amounts.reduce((sum, a) => sum + a, 0);
  const remaining = total - receivedTotal;
  const change = receivedTotal - total;

  function addAmount() {
    const value = parseFloat(currentAmount);
    if (!value || value <= 0) return;
    onAmountsChange([...amounts, value]);
    setCurrentAmount("");
  }

  function removeAmount(index: number) {
    onAmountsChange(amounts.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addAmount();
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Recibido</label>

      {/* Input + add button */}
      <div className="flex gap-2">
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
          onClick={addAmount}
          disabled={!currentAmount || parseFloat(currentAmount) <= 0}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick amounts */}
      <div className="flex flex-wrap gap-2">
        {[20, 50, 100, 200, 500, 1000].map((amount) => (
          <Button
            key={amount}
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onAmountsChange([...amounts, amount])}
          >
            ${amount}
          </Button>
        ))}
      </div>

      {/* Amounts list */}
      {amounts.length > 0 && (
        <div className="space-y-1.5">
          <div className="max-h-48 space-y-1.5 overflow-y-auto">
          {amounts.map((amount, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5"
            >
              <span className="text-sm">${amount.toFixed(2)}</span>
              <button
                onClick={() => removeAmount(index)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          </div>
          <div className="flex justify-between border-t pt-1.5 text-sm font-medium">
            <span>Total recibido</span>
            <span>${receivedTotal.toFixed(2)}</span>
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
