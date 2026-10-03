import { describe, expect, it } from "vitest";
import { mapIfoodOrder, nextLocalStatus, OWNER_USER_ID } from "../../supabase/functions/_shared/ifood-map";

const menu = [
  { id: "m-bife", name: "BIFE A PARMEGIANA", active: true },
  { id: "m-guarana", name: "Guaraná Lata", active: true },
  { id: "m-frango-old", name: "Frango Grelhado", active: false },
  { id: "m-frango", name: "FRANGO GRELHADO", active: true },
];

const entregaPropria = {
  id: "ifood-order-1",
  displayId: "4821",
  orderType: "DELIVERY",
  orderTiming: "IMMEDIATE",
  status: "PLACED",
  createdAt: "2026-10-03T15:10:00.000Z",
  customer: { name: "Maria Souza", phone: { number: "0800 705 0500", localizer: "12345678" } },
  delivery: {
    deliveredBy: "MERCHANT",
    observations: "Portão azul",
    deliveryAddress: {
      formattedAddress: "Rua das Flores, 100",
      neighborhood: "Centro",
      complement: "Apto 12",
      reference: "Ao lado da padaria",
    },
  },
  items: [
    {
      name: "Bife à Parmegiana",
      quantity: 2,
      unitPrice: 27,
      optionsPrice: 2,
      totalPrice: 58,
      observations: "Sem cebola",
      options: [
        { name: "Arroz branco", quantity: 1, groupName: "Acompanhamento" },
        { name: "Batata extra", quantity: 1, groupName: "Adicionais", customizations: [{ name: "Bem passada", quantity: 1 }] },
      ],
    },
    { name: "guarana lata", quantity: 1, unitPrice: 5, totalPrice: 5 },
  ],
  total: { subTotal: 63, deliveryFee: 7, orderAmount: 70 },
  payments: { methods: [{ method: "CASH", type: "OFFLINE", value: 70, cash: { changeFor: 100 } }] },
};

describe("mapIfoodOrder — entrega própria com complementos", () => {
  const r = mapIfoodOrder(entregaPropria, menu);

  it("preenche o pedido com cliente, endereço, taxa, total e ids do iFood", () => {
    expect(r.order).toMatchObject({
      external_id: "ifood-order-1",
      display_id: "4821",
      customer_name: "Maria Souza",
      customer_phone: "0800 705 0500 · ID 12345678",
      status: "pendente",
      delivery_type: "entrega",
      delivery_address: "Rua das Flores, 100, Centro, Apto 12, Ref: Ao lado da padaria",
      delivery_fee: 7,
      total: 70,
      payment_method: "dinheiro",
      delivery_time: null,
      user_id: OWNER_USER_ID,
      created_at: "2026-10-03T15:10:00.000Z",
    });
  });

  it("liga itens pelo nome ignorando acentos e maiúsculas, com preço incluindo complementos", () => {
    expect(r.items).toEqual([
      {
        menu_item_id: "m-bife",
        item_name: "Bife à Parmegiana",
        quantity: 2,
        unit_price: 29,
        notes: "Sem cebola",
        options: [
          { name: "Arroz branco", quantity: 1, group: "Acompanhamento" },
          { name: "Batata extra", quantity: 1, group: "Adicionais" },
          { name: "Bem passada", quantity: 1, group: "Batata extra" },
        ],
      },
      { menu_item_id: "m-guarana", item_name: "guarana lata", quantity: 1, unit_price: 5, notes: null, options: null },
    ]);
    expect(r.unmatched).toEqual([]);
  });

  it("pagamento na entrega com troco vira pagamento em dinheiro + observação", () => {
    expect(r.payments).toEqual([{ method_value: "dinheiro", method_label: "Dinheiro (na entrega)", amount: 70 }]);
    expect(r.order.notes).toContain("Levar troco para R$ 100,00");
    expect(r.order.notes).toContain("Obs. entrega: Portão azul");
  });
});

describe("mapIfoodOrder — retirada paga online", () => {
  const r = mapIfoodOrder(
    {
      id: "ifood-order-2",
      displayId: "4822",
      orderType: "TAKEOUT",
      orderTiming: "SCHEDULED",
      schedule: { deliveryDateTimeStart: "2026-10-03T15:30:00.000Z" },
      customer: { name: "João" },
      takeout: { observations: "Retiro de moto" },
      items: [
        { name: "Marmita Grande", quantity: 1, totalPrice: 32, options: [{ name: "Frango grelhado", quantity: 1, groupName: "Prato" }] },
        { name: "Pudim da casa", quantity: 1, totalPrice: 8 },
      ],
      total: { subTotal: 40, deliveryFee: 0, benefits: 5, orderAmount: 35 },
      payments: { methods: [{ method: "CREDIT", type: "ONLINE", prepaid: true, value: 35, card: { brand: "VISA" } }] },
    },
    menu,
  );

  it("retirada não tem endereço nem taxa e mantém o horário agendado em São Paulo", () => {
    expect(r.order).toMatchObject({
      delivery_type: "retirada",
      delivery_address: null,
      delivery_fee: 0,
      total: 35,
      delivery_time: "12:30:00",
      payment_method: "ifood",
      customer_phone: null,
    });
    expect(r.order.notes).toContain("Pedido agendado para 12:30");
    expect(r.order.notes).toContain("Obs. retirada: Retiro de moto");
  });

  it("pago online vira pagamento iFood", () => {
    expect(r.payments).toEqual([{ method_value: "ifood", method_label: "iFood (pago online)", amount: 35 }]);
  });

  it("item sem par usa o complemento quando ele existe no cardápio (prefere o item ativo)", () => {
    expect(r.items[0].menu_item_id).toBe("m-frango");
    expect(r.items[0].item_name).toBe("Marmita Grande");
  });

  it("item sem par nenhum fica sem vínculo e é avisado nas observações", () => {
    expect(r.items[1].menu_item_id).toBeNull();
    expect(r.unmatched).toEqual(["Pudim da casa"]);
    expect(r.order.notes).toContain("Itens sem correspondência no cardápio (não baixam estoque): Pudim da casa");
  });
});

describe("mapIfoodOrder — pedido já cancelado no iFood", () => {
  it("entra como cancelado", () => {
    expect(mapIfoodOrder({ id: "x", status: "CANCELLED", items: [] }, menu).order.status).toBe("cancelado");
  });
});

describe("nextLocalStatus", () => {
  it("só avança o status local", () => {
    expect(nextLocalStatus("pendente", "READY_TO_PICKUP")).toBe("pronto");
    expect(nextLocalStatus("preparando", "DISPATCHED")).toBe("entregue");
    expect(nextLocalStatus("entregue", "READY_TO_PICKUP")).toBeNull();
    expect(nextLocalStatus("pronto", "CONCLUDED")).toBe("entregue");
  });

  it("cancelamento sempre vale, exceto se já cancelado; eventos desconhecidos não mexem", () => {
    expect(nextLocalStatus("entregue", "CANCELLED")).toBe("cancelado");
    expect(nextLocalStatus("cancelado", "CONCLUDED")).toBeNull();
    expect(nextLocalStatus("pendente", "CONFIRMED")).toBeNull();
  });
});
