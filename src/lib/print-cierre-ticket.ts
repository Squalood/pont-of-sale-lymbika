import { CierreResumenData } from "@/types/cierre";
import { PagosResumen } from "@/api/getReporteCierre";

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDateTime(value: Date | string) {
  const d = new Date(value);
  const date = d.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
  const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
}

function row(label: string, value: string) {
  return `<div class="row"><span>${label}</span><span>${value}</span></div>`;
}

/** Ticket 80mm del corte: solo datos del turno y ventas por método. El detallado vive en print-cierre. */
export function printCierreTicket(resumen: CierreResumenData, pagos: PagosResumen) {
  const metodos = [
    pagos.efectivoMXN > 0 && row("Efectivo (MXN)", `$${fmt(pagos.efectivoMXN)}`),
    pagos.efectivoUSD > 0 && row("Efectivo (USD)", `$${fmt(pagos.efectivoUSD)} USD`),
    pagos.tarjeta > 0 && row("Tarjeta", `$${fmt(pagos.tarjeta)}`),
    pagos.transferencia > 0 && row("Transferencia", `$${fmt(pagos.transferencia)}`),
  ]
    .filter(Boolean)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Corte de Caja — Ticket</title>
  <style>
    @page { margin: 5mm; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; width: 100%; color: #000; }
    .header { text-align: center; margin-bottom: 8px; }
    .header img { height: 40px; width: auto; display: block; margin: 0 auto 4px; }
    .header p { font-size: 11px; line-height: 1.4; }
    .title { text-align: center; font-weight: bold; font-size: 13px; letter-spacing: 1px; line-height: 1.5; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 4px 0; margin-bottom: 6px; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    h2 { font-size: 12px; font-weight: bold; margin-bottom: 4px; }
    .row { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; }
    .row span:last-child { text-align: right; }
    .thead { font-size: 10px; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 2px; }
    .total { font-weight: bold; font-size: 13px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
    .footer { text-align: center; font-size: 11px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="header">
    <img src="/Logotipo-print.png" alt="Logo" />
    ${resumen.pharmacyDireccion ? `<p>${resumen.pharmacyDireccion}</p>` : ""}
    ${resumen.pharmacyTelefono ? `<p>Tel. ${resumen.pharmacyTelefono}</p>` : ""}
  </div>

  <div class="title">CORTE DE CAJA<br />CIERRE DE TURNO</div>

  <div class="divider"></div>

  <h2>DATOS DEL TURNO</h2>
  ${resumen.pharmacyName ? row("Farmacia", resumen.pharmacyName) : ""}
  ${row("Apertura", fmtDateTime(resumen.apertura))}
  ${resumen.operador ? row("Operador", resumen.operador) : ""}
  ${row("Fondo inicial", `$${fmt(resumen.fondoInicial)}`)}
  ${resumen.tipoCambio ? row("Tipo de cambio", `$${fmt(resumen.tipoCambio)} MXN/USD`) : ""}
  ${row("Cierre", fmtDateTime(resumen.cierre))}
  ${row("Cerrado por", resumen.cerradoPor)}

  <div class="divider"></div>

  <h2>VENTAS POR MÉTODO DE PAGO</h2>
  <div class="row thead"><span>MÉTODO</span><span>IMPORTE</span></div>
  ${metodos || `<div class="row"><span>Sin ventas</span><span></span></div>`}
  <div class="row total">
    <span>TOTAL (${pagos.numVentas} venta${pagos.numVentas !== 1 ? "s" : ""})</span>
    <span>$${fmt(pagos.totalImporte)}</span>
  </div>

  <div class="divider"></div>

  <div class="footer">
    <p>Impreso: ${fmtDateTime(new Date())}</p>
    <p>*** FIN DEL CORTE ***</p>
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=320,height=600");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}
