# CaseGosto — Marmitaria

App de gestão para marmitaria/restaurante familiar (single-page app). Cobre
pedidos, cardápio, estoque/despesas, financeiro, clientes, prato do dia,
relatórios e um assistente financeiro com IA. Interface e vocabulário em
português (BR) — manter assim.

Gerado e mantido via **Lovable**. Os arquivos `src/integrations/supabase/client.ts`
e `src/integrations/supabase/types.ts` são auto-gerados — não editar à mão.

## Stack

- Vite + React 18 + TypeScript, React Router v6, TanStack Query
- Supabase (Postgres + Auth + Edge Functions)
- Tailwind + shadcn/ui (Radix), `react-hook-form` + `zod`
- `recharts` (gráficos), `sonner` (toasts), `date-fns`

## Supabase

- **Conta/organização:** JoaoFukagawa's Org (`thorziihqvooapszgfga`)
- **Projeto:** `casegosto`
- **Project ref:** `tsrhahfkpgjmercraccp`
- **URL:** https://tsrhahfkpgjmercraccp.supabase.co
- **Região:** sa-east-1
- Confirmado em `.env` (`VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`).

## Funcionalidades

- **Pedidos** com pagamento dividido (`order_payments`), incluindo método
  "haver" (crédito/fiado)
- **Cardápio online público** (`/cardapio-online`) — pedido sem login, com
  carrinho, validação de estoque e taxa de entrega fixa
- **Upload de fotos** do cardápio direto pro Supabase Storage
  (bucket `menu-photos`)
- **Assistente financeiro com IA** (`supabase/functions/assistente-financeiro`)
  — Edge Function Deno que usa o gateway de IA da Lovable
  (`google/gemini-2.5-flash`) para registrar e dar baixa em contas via
  linguagem natural

## Banco de dados

Tabelas principais: `orders`, `order_items`, `order_payments`, `menu_items`,
`bills`, `expenses`, `clientes`, `pratos`, `payment_methods`, `profiles`.
RLS majoritariamente permissiva (`FOR ALL USING (true)`, single-tenant);
algumas tabelas (ex.: `bills`) são escopadas por `user_id` — checar a
migration antes de assumir isolamento por usuário.

## Como rodar

```bash
npm install
npm run dev          # Vite dev server em http://localhost:8080
npm run build         # build de produção
npm run lint          # eslint
npm run test           # vitest (single pass)
```

## Deploy

Vercel (projeto `casegosto`, escopo `joaofukagawas-projects`).

## Roadmap / notas

Ver `summary.md` para o histórico do que já foi implementado (cardápio
online, upload de fotos) e próximos passos (notificação em tempo real,
acompanhamento de pedido pelo cliente, agendamento).
