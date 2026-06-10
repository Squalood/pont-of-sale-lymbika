const COMPANY_INFO = {
  razonSocial: "Grupo Lymbika S.A. de C.V.",
  rfc: "GLY123456ABC",
  domicilio: "Calle Ejemplo #123, Col. Centro, CDMX, C.P. 06000",
  tel: "+52 55 0000 0000",
  email: "facturacion@lymbika.com",
};

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export interface InvoiceLine {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  impuesto: "iva16" | "iva8" | "exento";
}

export interface InvoiceData {
  invoiceNumber?: string;
  cliente: string;
  formaDePago: string;
  politicaDePago: string;
  uso: string;
  cfdiAlPublico: boolean;
  fechaFactura: Date;
  fechaVencimiento: Date | null;
  diario: string;
  cfdiOrigen: string;
  lines: InvoiceLine[];
}

export function printInvoice(data: InvoiceData): void {
  const invoiceNo = data.invoiceNumber?.trim() || "FAC-" + Date.now();

  const subtotal = data.lines.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
  const ivaBase16 = data.lines
    .filter((l) => l.impuesto === "iva16")
    .reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
  const ivaBase8 = data.lines
    .filter((l) => l.impuesto === "iva8")
    .reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
  const ivaAmount16 = ivaBase16 * 0.16;
  const ivaAmount8 = ivaBase8 * 0.08;
  const ivaAmount = ivaAmount16 + ivaAmount8;
  const total = subtotal + ivaAmount;

  const linesHtml = data.lines.length
    ? data.lines
        .map(
          (l) => `
      <tr>
        <td>${l.descripcion || "<em style='color:#9ca3af'>Sin descripción</em>"}</td>
        <td class="num">${l.cantidad}</td>
        <td class="num">$${fmt(l.precioUnitario)}</td>
        <td class="center">${l.impuesto === "iva16" ? "IVA 16%" : l.impuesto === "iva8" ? "IVA 8%" : "Exento"}</td>
        <td class="num">$${fmt(l.cantidad * l.precioUnitario)}</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:16px">Sin líneas de factura</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Factura ${invoiceNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; max-width: 170mm; margin: 0 auto; padding: 20px; }

    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 20px; }
    .logo { height: 48px; width: auto; display: block; margin-bottom: 8px; }
    .company { font-size: 10pt; line-height: 1.6; color: #374151; }
    .company strong { font-size: 13pt; color: #111; display: block; margin-bottom: 2px; }
    .invoice-meta { text-align: right; }
    .invoice-meta h1 { font-size: 22pt; font-weight: 800; letter-spacing: .04em; color: #111; margin-bottom: 6px; }
    .invoice-meta table { font-size: 10pt; margin-left: auto; }
    .invoice-meta td { padding: 1px 0 1px 12px; }
    .invoice-meta td:first-child { color: #6b7280; text-align: right; }
    .invoice-meta td:last-child { font-weight: 600; }

    hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
    hr.thick { border-top: 2px solid #111; }

    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 32px; font-size: 10pt; margin-bottom: 8px; }
    .meta span:nth-child(odd) { color: #6b7280; }

    h2 { font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #374151; margin-bottom: 10px; }

    table.items { width: 100%; border-collapse: collapse; font-size: 10pt; }
    table.items th { text-align: left; font-weight: 600; color: #6b7280; border-bottom: 2px solid #111; padding: 5px 6px; font-size: 9pt; text-transform: uppercase; }
    table.items td { padding: 7px 6px; border-bottom: 1px solid #f3f4f6; }
    table.items tr:last-child td { border-bottom: none; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .center { text-align: center; }

    .totals-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }
    .totals { width: 220px; font-size: 10pt; }
    .totals .row { display: flex; justify-content: space-between; padding: 3px 0; }
    .totals .row span:last-child { font-variant-numeric: tabular-nums; }
    .totals .row.total { font-weight: 700; font-size: 12pt; border-top: 2px solid #111; padding-top: 8px; margin-top: 4px; }

    .footer-note { text-align: center; color: #9ca3af; font-size: 8pt; margin-top: 32px; }

    @media print {
      body { padding: 0; }
      @page { size: A4; margin: 15mm 20mm; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="company">
      <img src="/Logotipo-print.png" alt="Logo" class="logo" />
      <strong>${COMPANY_INFO.razonSocial}</strong>
      RFC: ${COMPANY_INFO.rfc}<br/>
      ${COMPANY_INFO.domicilio}<br/>
      Tel: ${COMPANY_INFO.tel}<br/>
      ${COMPANY_INFO.email}
    </div>
    <div class="invoice-meta">
      <h1>FACTURA</h1>
      <table>
        <tr><td>No.</td><td>${invoiceNo}</td></tr>
        <tr><td>Fecha</td><td>${fmtDate(data.fechaFactura)}</td></tr>
        ${data.fechaVencimiento ? `<tr><td>Vencimiento</td><td>${fmtDate(data.fechaVencimiento)}</td></tr>` : ""}
        ${data.diario ? `<tr><td>Diario</td><td>${data.diario}</td></tr>` : ""}
      </table>
    </div>
  </div>

  <hr class="thick" />

  <h2>Datos del cliente</h2>
  <div class="meta">
    <span>Cliente</span><span>${data.cliente || "—"}</span>
    <span>Forma de pago</span><span>${data.formaDePago || "—"}</span>
    ${data.uso ? `<span>Uso CFDI</span><span>${data.uso}</span>` : ""}
    ${data.politicaDePago ? `<span>Política de pago</span><span>${data.politicaDePago}</span>` : ""}
    ${data.cfdiOrigen ? `<span>CFDI Origen</span><span>${data.cfdiOrigen}</span>` : ""}
    <span>CFDI al público</span><span>${data.cfdiAlPublico ? "Sí" : "No"}</span>
  </div>

  <hr />

  <h2>Líneas de factura</h2>
  <table class="items">
    <thead>
      <tr>
        <th>Descripción</th>
        <th class="num">Cant.</th>
        <th class="num">Precio Unit.</th>
        <th class="center">Impuesto</th>
        <th class="num">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${linesHtml}
    </tbody>
  </table>

  <div class="totals-wrapper">
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>$${fmt(subtotal)}</span></div>
      ${ivaAmount16 > 0 ? `<div class="row"><span>IVA (16%)</span><span>$${fmt(ivaAmount16)}</span></div>` : ""}
      ${ivaAmount8 > 0 ? `<div class="row"><span>IVA (8%)</span><span>$${fmt(ivaAmount8)}</span></div>` : ""}
      <div class="row total"><span>Total</span><span>$${fmt(total)}</span></div>
    </div>
  </div>

  <p class="footer-note">Este documento es una representación impresa de una factura electrónica.</p>

  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 300);
    };
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}
