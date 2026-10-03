-- Integração iFood: pedidos importados via Order/Events API (Edge Functions ifood-sync e ifood-order-action).

-- Pedido do iFood: id do pedido no iFood (evita importar duas vezes) e o número curto mostrado no app deles.
-- external_status: último status oficial do iFood (fullCode dos eventos: PLACED, CONFIRMED, READY_TO_PICKUP...).
alter table public.orders
  add column if not exists external_id text,
  add column if not exists display_id text,
  add column if not exists external_status text;

create unique index if not exists orders_external_id_key
  on public.orders (external_id)
  where external_id is not null;

-- Item como veio do iFood: nome original, observação do cliente e complementos escolhidos.
alter table public.order_items
  add column if not exists item_name text,
  add column if not exists notes text,
  add column if not exists options jsonb;

-- Estado da integração. Só a service role (Edge Functions) acessa: RLS ligado e nenhuma policy.
create table if not exists public.ifood_state (
  id text primary key default 'default',
  access_token text,
  token_expires_at timestamptz,
  locked_until timestamptz,
  last_poll_at timestamptz,
  baseline_done boolean not null default false,
  merchant_ids text,
  last_error text,
  last_error_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.ifood_state enable row level security;

insert into public.ifood_state (id) values ('default') on conflict (id) do nothing;

-- Garante um único consumidor da fila de eventos por vez (o iFood entrega cada evento a quem fizer polling primeiro).
create or replace function public.ifood_try_lock(p_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ifood_state
     set locked_until = now() + make_interval(secs => p_seconds)
   where id = 'default'
     and (locked_until is null or locked_until < now());
  return found;
end;
$$;

create or replace function public.ifood_release_lock()
returns void
language sql
security definer
set search_path = public
as $$
  update public.ifood_state set locked_until = null where id = 'default';
$$;

revoke all on function public.ifood_try_lock(integer) from public, anon, authenticated;
revoke all on function public.ifood_release_lock() from public, anon, authenticated;
grant execute on function public.ifood_try_lock(integer) to service_role;
grant execute on function public.ifood_release_lock() to service_role;

-- Grava pedido + itens + pagamentos numa transação só. Idempotente por external_id.
-- Item sem correspondência no cardápio (menu_item_id nulo) aponta para um item inativo "ITEM IFOOD SEM VINCULO",
-- para não quebrar relatórios que agrupam por menu_item_id; o nome real fica em order_items.item_name.
create or replace function public.ifood_insert_order(p_order jsonb, p_items jsonb, p_payments jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_user uuid := (p_order->>'user_id')::uuid;
  v_placeholder uuid;
begin
  select id into v_id from orders where external_id = p_order->>'external_id';
  if v_id is not null then
    return v_id;
  end if;

  if exists (select 1 from jsonb_array_elements(p_items) i where i->>'menu_item_id' is null) then
    select id into v_placeholder
      from menu_items
     where category = 'ifood' and name = 'ITEM IFOOD SEM VINCULO'
     order by created_at
     limit 1;
    if v_placeholder is null then
      insert into menu_items (name, description, price, category, active, unit_type, stock, user_id)
      values ('ITEM IFOOD SEM VINCULO',
              'Itens de pedidos do iFood sem item com o mesmo nome no cardápio. Não apagar.',
              0, 'ifood', false, 'unidade', null, v_user)
      returning id into v_placeholder;
    end if;
  end if;

  insert into orders (customer_name, customer_phone, status, notes, total, created_at, delivery_type,
                      delivery_address, payment_method, delivery_fee, delivery_time, user_id, source,
                      external_id, display_id, external_status)
  values (p_order->>'customer_name',
          p_order->>'customer_phone',
          coalesce(p_order->>'status', 'pendente'),
          p_order->>'notes',
          (p_order->>'total')::numeric,
          coalesce((p_order->>'created_at')::timestamptz, now()),
          p_order->>'delivery_type',
          p_order->>'delivery_address',
          p_order->>'payment_method',
          coalesce((p_order->>'delivery_fee')::numeric, 0),
          (p_order->>'delivery_time')::time,
          v_user,
          'ifood',
          p_order->>'external_id',
          p_order->>'display_id',
          p_order->>'external_status')
  returning id into v_id;

  insert into order_items (order_id, menu_item_id, quantity, unit_price, user_id, item_name, notes, options)
  select v_id,
         coalesce((i->>'menu_item_id')::uuid, v_placeholder),
         (i->>'quantity')::integer,
         (i->>'unit_price')::numeric,
         v_user,
         i->>'item_name',
         i->>'notes',
         nullif(i->'options', 'null'::jsonb)
    from jsonb_array_elements(p_items) i;

  insert into order_payments (order_id, method_value, method_label, amount, user_id)
  select v_id, p->>'method_value', p->>'method_label', (p->>'amount')::numeric, v_user
    from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) p;

  return v_id;
end;
$$;

revoke all on function public.ifood_insert_order(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.ifood_insert_order(jsonb, jsonb, jsonb) to service_role;

-- Status da integração para a tela (sem expor o token).
create or replace function public.ifood_status()
returns table (last_poll_at timestamptz, last_error text, last_error_at timestamptz, baseline_done boolean)
language sql
security definer
set search_path = public
as $$
  select last_poll_at, last_error, last_error_at, baseline_done from public.ifood_state where id = 'default';
$$;

revoke all on function public.ifood_status() from public, anon;
grant execute on function public.ifood_status() to authenticated;
