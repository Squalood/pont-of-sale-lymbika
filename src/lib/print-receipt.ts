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
}

export function printReceipt(data: ReceiptData) {
  const { receiptId, operador, items, subtotal, iva, total, paymentMethod, received, change } = data;
  const now = new Date();
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
        .footer {
          text-align: center;
          margin-top: 12px;
          font-size: 11px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Farmacia Lymbika</h1>
        <p>Punto de Venta</p>
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
        <div class="row">
          <span>IVA (16%)</span>
          <span>$${iva.toFixed(2)}</span>
        </div>
        <div class="row total">
          <span>TOTAL</span>
          <span>$${total.toFixed(2)}</span>
        </div>
      </div>

      <div class="divider"></div>

      <div class="payment">
        <div class="row">
          <span>Método de pago</span>
          <span>${paymentMethod === "efectivo" ? "Efectivo" : "Tarjeta"}</span>
        </div>
        ${
          paymentMethod === "efectivo"
            ? `
        <div class="row">
          <span>Recibido</span>
          <span>$${received.toFixed(2)}</span>
        </div>
        <div class="row">
          <span>Cambio</span>
          <span>$${change.toFixed(2)}</span>
        </div>`
            : ""
        }
        <div class="row" style="margin-top:4px;">
          <span>Operador</span>
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
