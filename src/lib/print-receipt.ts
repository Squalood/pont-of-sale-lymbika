export interface ReceiptItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalLine: number;
}

interface ReceiptData {
  receiptId: number;
  operador: string;
  items: ReceiptItem[];
  subtotal: number;
  iva: number;
  total: number;
  paymentMethod: string;
  received: number;
  change: number;
  fecha?: Date | string;
  pharmacyName?: string;
  isMember?: boolean;
  cardSurcharge?: number;
  montoTarjeta?: number;
  montoTransfe?: number;
  recibidoUSD?: number;
  tipoCambioUsado?: number;
  ivaRate?: 0 | 8 | 16;
  manualIva?: number;
}

export function printReceipt(data: ReceiptData) {
  const {
    receiptId,
    operador,
    items,
    subtotal,
    total,
    paymentMethod,
    received,
    change,
    isMember,
    cardSurcharge = 0,
    montoTarjeta = 0,
    montoTransfe = 0,
    recibidoUSD = 0,
    tipoCambioUsado = 0,
    pharmacyName,
  } = data;
  const effectiveTotal = total + cardSurcharge;
  const now = data.fecha ? new Date(data.fecha) : new Date();
  const date = now.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const time = now.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const receiptNo = `#${String(receiptId).padStart(5, "0")}`;

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="text-align:left; padding:2px 0;">${item.productName}</td>
        <td style="text-align:center;">${item.quantity}</td>
        <td style="text-align:right;">$${item.unitPrice.toFixed(2)}</td>
        <td style="text-align:right;">$${item.totalLine.toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const methodLabel =
    paymentMethod === "efectivo"
      ? "Efectivo"
      : paymentMethod === "tarjeta"
        ? "Tarjeta"
        : paymentMethod === "transfe"
          ? "Transferencia"
          : "Mixto";
  const hasCash = paymentMethod === "efectivo" || paymentMethod === "mixto";
  const hasCard = paymentMethod === "tarjeta" || (paymentMethod === "mixto" && montoTarjeta > 0);
  const hasTransfe = paymentMethod === "transfe" || (paymentMethod === "mixto" && montoTransfe > 0);
  const cardCharge = paymentMethod === "tarjeta" ? effectiveTotal : montoTarjeta + cardSurcharge;
  const transfeCharge = paymentMethod === "transfe" ? total : montoTransfe;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Recibo ${receiptNo}</title>
      <style>
        @page {
          margin: 5mm;
          size: 80mm auto;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 100%;
          color: #000;
        }
        .header {
          text-align: center;
          margin-bottom: 8px;
        }
        .header img {
          height: 40px;
          width: auto;
          display: block;
          margin: 0 auto 4px;
        }
        .header h1 {
          font-size: 16px;
          margin-bottom: 2px;
        }
        .header p {
          font-size: 11px;
        }
        .header .receipt-no {
          font-size: 13px;
          font-weight: bold;
          margin-top: 4px;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        th {
          text-align: left;
          padding: 2px 0;
          border-bottom: 1px solid #000;
          font-size: 11px;
        }
        th:nth-child(2) { text-align: center; }
        th:nth-child(3), th:nth-child(4) { text-align: right; }
        .totals {
          font-size: 12px;
          margin-top: 4px;
        }
        .totals .row {
          display: flex;
          justify-content: space-between;
          padding: 1px 0;
        }
        .totals .total {
          font-weight: bold;
          font-size: 14px;
          border-top: 1px solid #000;
          padding-top: 4px;
          margin-top: 2px;
        }
        .payment {
          margin-top: 6px;
          font-size: 11px;
        }
        .payment .row {
          display: flex;
          justify-content: space-between;
          padding: 1px 0;
        }
        .totals .member-note {
          font-style: italic;
          font-size: 11px;
          color: #444;
        }
        .footer {
          text-align: center;
          margin-top: 12px;
          font-size: 11px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="/Logotipo-print.png" alt="Logo" />
        <p>Punto de Venta</p>
        <h1>${pharmacyName ?? ""}</h1>
        <p>${date} — ${time}</p>
        <p class="receipt-no">Recibo ${receiptNo}</p>
      </div>

      <div class="divider"></div>

      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cant</th>
            <th>P.U.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="divider"></div>

      <div class="totals">
        <div class="row">
          <span>Subtotal</span>
          <span>$${subtotal.toFixed(2)}</span>
        </div>
        ${(() => {
          const manualIva = data.manualIva ?? 0;
          const extractedIva = data.iva - manualIva;
          const rows = [];
          if (extractedIva > 0) rows.push(`<div class="row"><span>IVA incluído (8%)</span><span>$${extractedIva.toFixed(2)}</span></div>`);
          if (manualIva > 0) rows.push(`<div class="row"><span>IVA (${data.ivaRate}%)</span><span>$${manualIva.toFixed(2)}</span></div>`);
          return rows.join("");
        })()}
        ${isMember ? `<div class="row member-note"><span>&#9733; Precio Health Pass</span></div>` : ""}
        ${cardSurcharge > 0 ? `<div class="row"><span>Cargo tarjeta (3%)</span><span>+$${cardSurcharge.toFixed(2)}</span></div>` : ""}
        <div class="row total">
          <span>TOTAL</span>
          <span>$${effectiveTotal.toFixed(2)}</span>
        </div>
      </div>

      <div class="divider"></div>

      <div class="payment">
        <div class="row">
          <span>Método de pago</span>
          <span>${methodLabel}</span>
        </div>
        ${hasCard ? `
        <div class="row">
          <span>Tarjeta</span>
          <span>$${cardCharge.toFixed(2)}</span>
        </div>` : ""}
        ${hasTransfe ? `
        <div class="row">
          <span>Transferencia</span>
          <span>$${transfeCharge.toFixed(2)}</span>
        </div>` : ""}
        ${hasCash ? `
        <div class="row">
          <span>Efectivo recibido</span>
          <span>$${received.toFixed(2)} MXN</span>
        </div>
        ${recibidoUSD > 0 ? `
        <div class="row" style="font-size:10px;color:#555;padding-left:8px;">
          <span>&#x2514; en pesos</span>
          <span>$${(received - recibidoUSD * tipoCambioUsado).toFixed(2)} MXN</span>
        </div>
        <div class="row" style="font-size:10px;color:#555;padding-left:8px;">
          <span>&#x2514; en dólares</span>
          <span>$${recibidoUSD.toFixed(2)} USD</span>
        </div>
        <div class="row" style="font-size:10px;color:#555;padding-left:8px;">
          <span>&#x2514; tipo de cambio</span>
          <span>$${tipoCambioUsado.toFixed(2)}</span>
        </div>` : ""}
        <div class="row">
          <span>Cambio</span>
          <span>$${change.toFixed(2)}</span>
        </div>` : ""}
        <div class="row" style="margin-top:4px;">
          <span>Cajero</span>
          <span>${operador}</span>
        </div>
      </div>

      <div class="divider"></div>

      <div class="footer">
        <p>¡Gracias por su compra!</p>
      </div>

      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() { window.close(); };
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=300,height=600");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
