export interface OrderItem {
  id: string;
  quantity: number;
  weight: number | null;
  unit_price: number;
  menu_items: { name: string } | null;
}

export interface OrderPayment {
  id?: string;
  method_value: string;
  method_label: string;
  amount: number | string;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  created_at: string;
  status: string;
  delivery_type: string;
  delivery_address: string | null;
  delivery_fee: number;
  payment_method: string;
  total: number;
  notes: string | null;
  delivery_time?: string | null;
  order_items: OrderItem[];
  order_payments?: OrderPayment[];
}

export function buildCouponHtml(order: Order): string {
  const items = order.order_items || [];
  const date = new Date(order.created_at);
  const formattedDate = date.toLocaleDateString("pt-BR");
  const formattedTime = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const paymentLabel: Record<string, string> = {
    dinheiro: "Dinheiro",
    pix: "PIX",
    cartao: "Cartão",
    haver: "Haver",
  };

  const itemsHtml = items
    .map((item) => {
      const name = item.menu_items?.name || "Item";
      const qty = item.weight ? `${item.weight}kg` : `${item.quantity}x`;
      const subtotal = item.weight
        ? item.unit_price * item.weight
        : item.unit_price * item.quantity;
      return `
        <tr>
          <td style="text-align:left;padding:2px 0;">${qty} ${name}</td>
          <td style="text-align:right;padding:2px 0;">R$ ${subtotal.toFixed(2)}</td>
        </tr>`;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Cupom - ${order.customer_name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 72mm;
          margin: 0;
          padding: 2mm;
          color: #000;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        td { word-wrap: break-word; overflow-wrap: break-word; }
        .total-row td {
          font-weight: bold;
          font-size: 14px;
          padding-top: 4px;
        }
        .info { margin: 2px 0; word-wrap: break-word; }
        .notes {
          font-style: italic;
          margin-top: 4px;
          padding: 4px;
          border: 1px dashed #000;
        }
        @media print {
          @page { size: 80mm auto; margin: 0; }
          html, body {
            width: 72mm;
            margin: 0;
            padding: 2mm;
            font-size: 12px;
          }
          * {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="center bold" style="font-size:16px;margin-bottom:4px;">
        🍱 CASEGOSTO
      </div>
      <div class="center" style="font-size:10px;margin-bottom:6px;">
        ${formattedDate} · ${formattedTime}
      </div>
      <div class="divider"></div>

      <div class="bold" style="font-size:14px;margin:4px 0;">
        ${order.customer_name}
      </div>
      ${order.customer_phone ? `<div class="info">📞 ${order.customer_phone}</div>` : ""}
      <div class="info">
        ${order.delivery_type === "entrega" ? "🚚 ENTREGA" : "🏪 RETIRADA"}
      </div>
      ${order.delivery_time ? `<div class="info bold" style="font-size:14px;">⏰ HORÁRIO: ${order.delivery_time.slice(0, 5)}</div>` : ""}
      ${order.delivery_type === "entrega" && order.delivery_address ? `<div class="info">📍 ${order.delivery_address}</div>` : ""}

      <div class="divider"></div>

      <table>
        <thead>
          <tr>
            <th style="text-align:left;padding-bottom:4px;">Item</th>
            <th style="text-align:right;padding-bottom:4px;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="divider"></div>

      ${order.delivery_fee > 0 ? `
        <table>
          <tr>
            <td style="text-align:left;">Taxa de entrega</td>
            <td style="text-align:right;">R$ ${Number(order.delivery_fee).toFixed(2)}</td>
          </tr>
        </table>
      ` : ""}

      <table>
        <tr class="total-row">
          <td style="text-align:left;">TOTAL</td>
          <td style="text-align:right;">R$ ${order.total.toFixed(2)}</td>
        </tr>
      </table>

      <div class="divider"></div>

      ${
        order.order_payments && order.order_payments.length > 0
          ? `
            <div class="bold" style="margin-bottom:2px;">💳 PAGAMENTO</div>
            <table>
              ${order.order_payments
                .map(
                  (p) => `
                <tr>
                  <td style="text-align:left;">${paymentLabel[p.method_value] || p.method_label || p.method_value}</td>
                  <td style="text-align:right;">R$ ${Number(p.amount).toFixed(2)}</td>
                </tr>`
                )
                .join("")}
              ${
                order.order_payments.length > 1
                  ? `<tr><td style="text-align:left;padding-top:2px;border-top:1px dashed #000;" class="bold">Total pago</td>
                     <td style="text-align:right;padding-top:2px;border-top:1px dashed #000;" class="bold">R$ ${order.order_payments
                       .reduce((s, p) => s + Number(p.amount), 0)
                       .toFixed(2)}</td></tr>`
                  : ""
              }
            </table>
          `
          : `<div class="info bold">💳 ${paymentLabel[order.payment_method] || order.payment_method}</div>`
      }

      ${order.notes ? `
        <div class="divider"></div>
        <div class="notes">📝 OBS: ${order.notes}</div>
      ` : ""}

      <div class="divider"></div>
      <div class="center" style="font-size:10px;margin-top:4px;">
        Pedido #${order.id.slice(0, 6).toUpperCase()}
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;
}

export function printCouponViaWindow(order: Order) {
  const printWindow = window.open("", "_blank", "width=320,height=600");
  if (!printWindow) return;
  printWindow.document.write(buildCouponHtml(order));
  printWindow.document.close();
}

export function printCouponViaIframe(order: Order) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const html = buildCouponHtml(order).replace(/<script>[\s\S]*?<\/script>/, "");
  const onLoad = () => {
    const win = iframe.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 60000);
  };
  iframe.onload = onLoad;
  const doc = iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
  }
}
