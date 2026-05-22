import { CierreResumenData } from "@/types/cierre";
import { ReporteCierreData } from "@/api/getReporteCierre";

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" });
}

function diffColor(diff: number) {
  if (diff > 0) return "#16a34a";
  if (diff < 0) return "#dc2626";
  return "#6b7280";
}

function diffLabel(diff: number) {
  return diff > 0 ? `+$${fmt(diff)}` : `-$${fmt(Math.abs(diff))}`;
}

export function printCierre(resumen: CierreResumenData, reporte: ReporteCierreData) {
  const { pagos, productos } = reporte;

  const productosHtml = productos.length
    ? productos
        .map(
          (p) => `
          <tr>
            <td>${p.nombre}</td>
            <td class="num">${p.cantidad}</td>
            <td class="num">$${fmt(p.total)}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="3" style="text-align:center;color:#9ca3af">Sin productos</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Corte de Caja — ${resumen.pharmacyName ?? ""}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 32px; }
    h1 { font-size: 18pt; font-weight: 700; margin-bottom: 2px; }
    h2 { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #374151; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; margin: 20px 0 10px; }
    .subtitle { color: #6b7280; font-size: 10pt; margin-bottom: 16px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 10pt; margin-bottom: 8px; }
    .meta span:nth-child(odd) { color: #6b7280; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    th { text-align: left; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding: 4px 6px; font-size: 9pt; text-transform: uppercase; }
    td { padding: 5px 6px; border-bottom: 1px solid #f3f4f6; }
    tr:last-child td { border-bottom: none; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .total-row td { font-weight: 700; border-top: 1px solid #d1d5db; padding-top: 7px; }
    .diff-pos { color: #16a34a; font-weight: 600; }
    .diff-neg { color: #dc2626; font-weight: 600; }
    .diff-zero { color: #6b7280; }
    @media print {
      body { padding: 16px; }
      @page { margin: 20mm; }
    }
  </style>
</head>
<body>
  <h1>Corte de Caja</h1>
  ${resumen.pharmacyName ? `<p class="subtitle">${resumen.pharmacyName}</p>` : ""}

  <h2>Información de turno</h2>
  <div class="meta">
    <span>Apertura</span><span>${fmtTime(resumen.apertura)}</span>
    <span>Cierre</span><span>${fmtTime(resumen.cierre)}</span>
    <span>Operador</span><span>${resumen.cerradoPor}</span>
    <span>Fondo inicial</span><span>$${fmt(resumen.fondoInicial)}</span>
  </div>

  <h2>Ventas por método de pago</h2>
  <table>
    <thead>
      <tr>
        <th>Método</th>
        <th class="num">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${pagos.efectivoMXN > 0 ? `<tr><td>Efectivo (MXN)</td><td class="num">$${fmt(pagos.efectivoMXN)}</td></tr>` : ""}
      ${pagos.efectivoUSD > 0 ? `<tr><td>Efectivo (USD)</td><td class="num">$${pagos.efectivoUSD.toFixed(2)} USD</td></tr>` : ""}
      ${pagos.tarjeta > 0 ? `<tr><td>Tarjeta</td><td class="num">$${fmt(pagos.tarjeta)}</td></tr>` : ""}
      ${pagos.transferencia > 0 ? `<tr><td>Transferencia</td><td class="num">$${fmt(pagos.transferencia)}</td></tr>` : ""}
      <tr class="total-row">
        <td>Total (${pagos.numVentas} venta${pagos.numVentas !== 1 ? "s" : ""})</td>
        <td class="num">$${fmt(pagos.totalImporte)}</td>
      </tr>
    </tbody>
  </table>

  ${resumen.devolucionesMXN > 0 ? `
  <h2>Devoluciones</h2>
  <div class="meta">
    <span>Total devuelto (MXN)</span><span>-$${fmt(resumen.devolucionesMXN)}</span>
  </div>` : ""}

  <h2>Corte de efectivo</h2>
  <table>
    <thead>
      <tr>
        <th></th>
        <th class="num">Esperado</th>
        <th class="num">Declarado</th>
        <th class="num">Diferencia</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Pesos (MXN)</td>
        <td class="num">$${fmt(resumen.expectedMXN)}</td>
        <td class="num">$${fmt(resumen.finalCashMXN)}</td>
        <td class="num" style="color:${diffColor(resumen.diffMXN)};font-weight:600">${diffLabel(resumen.diffMXN)}</td>
      </tr>
      <tr>
        <td>Dólares (USD)</td>
        <td class="num">$${resumen.expectedUSD.toFixed(2)}</td>
        <td class="num">$${resumen.finalCashUSD.toFixed(2)}</td>
        <td class="num" style="color:${diffColor(resumen.diffUSD)};font-weight:600">${diffLabel(resumen.diffUSD)}</td>
      </tr>
      ${resumen.expectedCard > 0 ? `
      <tr>
        <td>Tarjeta (MXN)</td>
        <td class="num">$${fmt(resumen.expectedCard)}</td>
        <td class="num">$${fmt(resumen.finalCard)}</td>
        <td class="num" style="color:${diffColor(resumen.diffCard)};font-weight:600">${diffLabel(resumen.diffCard)}</td>
      </tr>` : ""}
      ${resumen.expectedTransfe > 0 ? `
      <tr>
        <td>Transferencia (MXN)</td>
        <td class="num">$${fmt(resumen.expectedTransfe)}</td>
        <td class="num">$${fmt(resumen.finalTransfe)}</td>
        <td class="num" style="color:${diffColor(resumen.diffTransfe)};font-weight:600">${diffLabel(resumen.diffTransfe)}</td>
      </tr>` : ""}
    </tbody>
  </table>

  <h2>Productos vendidos</h2>
  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th class="num">Cant.</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>
      ${productosHtml}
    </tbody>
  </table>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
