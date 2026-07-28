## What was built

### Cardápio Online (Público)
- **Rota:** `/cardapio-online` — pública, sem login
- **Página:** `src/pages/CardapioOnline.tsx`
  - Mostra itens ativos do cardápio com foto, nome, descrição, preço e estoque
  - Carrinho lateral com controle de quantidade
  - Formulário do cliente (nome, WhatsApp, forma de pagamento, retirada/entrega, endereço)
  - Taxa de entrega fixa de R$ 6,00
  - Validação de estoque antes de finalizar
  - Tela de confirmação após pedido
- **Serviço:** `src/services/public-orders.ts`
  - `getPublicMenuItems()` — busca itens ativos
  - `checkStock()` — valida estoque antes do pedido (desconta vendas de hoje)
  - `createPublicOrder()` — insere pedido + itens na mesma tabela `orders`

### Upload de Fotos no MenuItemDialog
- Campo de foto com upload direto para Supabase Storage (bucket `menu-photos`)
- Alternativa de colar URL manualmente
- Criação automática do bucket se não existir
- Visualização e remoção da foto

### Botão Compartilhar
- Na página Cardápio (admin), botão que copia o link público pro clipboard

### SQL Migration
- `migrations/001_public_ordering.sql` — cria coluna `photo_url`, bucket `menu-photos`, e políticas de storage

## Para rodar
1. Executar `migrations/001_public_ordering.sql` no SQL Editor do Supabase
2. O bucket `menu-photos` será criado automaticamente no primeiro upload se não existir
3. Adicionar fotos nos itens do cardápio (admin > Cardápio)
4. Compartilhar link: `http://localhost:8080/cardapio-online`

## Roadmap futuro
- Notificação sonora/toast pra novos pedidos no admin (usar Supabase Realtime)
- Página de acompanhamento pro cliente ver status do pedido
- Agendamento de pedidos (data/hora futura)
