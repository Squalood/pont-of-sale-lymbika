export interface ReturnReceiptItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalLine: number;
}

interface ReturnReceiptData {
  devolucionId: number;
  ventaId: number;
  operador: string;
  items: ReturnReceiptItem[];
  montoReembolso: number;
  metodo: string;
  motivo: string;
  fecha?: Date | string;
}

export function printReturnReceipt(data: ReturnReceiptData) {
  const { devolucionId, ventaId, operador, items, montoReembolso, metodo, motivo } = data;

  const now = data.fecha ? new Date(data.fecha) : new Date();
  const date = now.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
  const time = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  const devNo = `#${String(devolucionId).padStart(5, "0")}`;
  const ventaNo = `#${String(ventaId).padStart(5, "0")}`;

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
      <title>Devolución ${devNo}</title>
      <style>
        @page { margin: 5mm; size: 80mm auto; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 100%; color: #000; }
        .header { text-align: center; margin-bottom: 8px; }
        .header h1 { font-size: 16px; margin-bottom: 2px; }
        .header p { font-size: 11px; }
        .header .badge { font-size: 13px; font-weight: bold; margin-top: 4px; letter-spacing: 1px; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { text-align: left; padding: 2px 0; border-bottom: 1px solid #000; font-size: 11px; }
        th:nth-child(2) { text-align: center; }
        th:nth-child(3), th:nth-child(4) { text-align: right; }
        .totals { font-size: 12px; margin-top: 4px; }
        .totals .row { display: flex; justify-content: space-between; padding: 1px 0; }
        .totals .total { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 4px; margin-top: 2px; }
        .info { font-size: 11px; margin-top: 4px; }
        .info .row { display: flex; justify-content: space-between; padding: 1px 0; }
        .motivo { font-size: 11px; margin-top: 4px; }
        .footer { text-align: center; margin-top: 12px; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Farmacia Lymbika</h1>
        <p>Punto de Venta</p>
        <p>${date} — ${time}</p>
        <p class="badge">*** DEVOLUCIÓN ***</p>
        <p style="font-size:11px; margin-top:2px;">Dev. ${devNo} — Venta ${ventaNo}</p>
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
        <tbody>${itemsHtml}</tbody>
      </table>

      <div class="divider"></div>

      <div class="totals">
        <div class="row total">
          <span>REEMBOLSO</span>
          <span>$${montoReembolso.toFixed(2)}</span>
        </div>
      </div>

      <div class="divider"></div>

      <div class="info">
        <div class="row">
          <span>Método</span>
          <span>${metodo}</span>
        </div>
        <div class="row" style="margin-top:4px;">
          <span>Cajero</span>
          <span>${operador}</span>
        </div>
      </div>

      ${motivo ? `
      <div class="divider"></div>
      <div class="motivo">
        <p style="font-size:10px; color:#555;">Motivo:</p>
        <p>${motivo}</p>
      </div>` : ""}

      <div class="divider"></div>

      <div class="footer">
        <p>Devolución procesada</p>
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
