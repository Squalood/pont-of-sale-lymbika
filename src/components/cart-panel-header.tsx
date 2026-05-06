import { ShoppingCart, Plus, X } from "lucide-react";

interface CartPanelHeaderProps {
  cartNumber: number;
  itemCount: number;
  onAddCart?: () => void;
  onClose?: () => void;
}

export function CartPanelHeader({ cartNumber, itemCount, onAddCart, onClose }: CartPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      {onClose ? (
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Cerrar carrito"
        >
          <X className="h-4 w-4" />
        </button>
      ) : (
        <div className="w-4" />
      )}
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-5 w-5" />
        <span className="font-semibold">Venta #{cartNumber}</span>
        {itemCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
            {itemCount}
          </span>
        )}
      </div>
      {onAddCart ? (
        <button
          onClick={(e) => { e.stopPropagation(); onAddCart(); }}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Nuevo carrito"
        >
          <Plus className="h-4 w-4" />
        </button>
      ) : (
        <div className="w-4" />
      )}
    </div>
  );
}
