export const queryKeys = {
  orders: {
    all: ["orders"],
    byDate: (date: string) => ["orders", date],
    haver: ["orders_haver"],
    recent: ["orders_recent"],
    financeByDay: (date: string) => ["financeiro-orders-day", date],
    financeByMonth: (date: string) => ["financeiro-orders-month", date],
  },
  menuItems: {
    all: ["menu_items"],
    active: ["menu_items_active"],
    stock: ["menu_items_estoque"],
  },
  clients: {
    all: ["clientes"],
  },
  bills: {
    all: ["bills"],
    finance: ["financeiro-bills"],
  },
  expenses: {
    byMonth: (date: string) => ["financeiro-expenses-month", date],
    report: (start: string, end: string) => ["relatorios-expenses", start, end],
  },
  receitas: {
    byMonth: (date: string) => ["financeiro-receitas-month", date],
  },
  paymentMethods: {
    all: ["payment_methods"],
    active: ["payment_methods_active"],
  },
  pratos: {
    ranking: (monthStart: string) => ["pratos_ranking", monthStart],
    soldToday: (dayStart: string) => ["sold_today", dayStart],
  },
  orderItems: {
    today: (dayStart: string) => ["order_items_today_estoque", dayStart],
  },
  dashboard: {
    today: ["dashboard", "today"],
    recent: ["dashboard", "recent"],
  },
  assistente: {
    monthRevenue: ["assistente-receita-mes"],
  },
  financeCategories: {
    all: ["categorias_financeiras"],
  },
};
