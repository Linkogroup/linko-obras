# Linko Obras — stack React + Node.js

Migração para hospedagem separada:

- frontend/: React/Vite para Vercel;
- backend/: Node.js/Express para Render;
- supabase/: SQL do banco e controle de primeiro acesso;
- render.yaml e vercel.json: configuração inicial.

## Publicação

1. Crie um repositório GitHub e suba o conteúdo desta pasta.
2. Na Vercel, importe o repositório e defina Root Directory como frontend.
3. No Render, crie um Web Service com Root Directory backend e Start Command npm start.
4. No Render, configure SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY e FRONTEND_URL.
5. Na Vercel, configure VITE_API_URL, VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.
6. Execute supabase/02-primeiro-acesso.sql no Supabase antes de liberar os logins.

A chave secreta service_role fica somente no Render. O frontend usa somente a chave publicável. O endereço anterior permanece disponível durante a transição.

## Cadastro de obras e relatórios gerenciais

Execute `supabase/03-obras-relatorios.sql` no SQL Editor do Supabase **depois de 01 e 02 e antes de publicar a API e o frontend atualizados**. Em um banco existente, não execute novamente o schema inicial. A migração 03 pode ser reexecutada: atribui um ID Linko aos cadastros antigos que ainda não possuem código e preserva os códigos existentes.

- **Cadastrar obra**: formulário com empresa, identificação, categoria, datas, metragem, capacidade de cabo, fusões, canalização e caixas. O banco gera códigos únicos no formato `LINKO-000001`.
- **Gestor**: consulta todas as empresas; cadastra, edita e exclui obras; pode corrigir o ID Linko e o vínculo da empresa. A chave interna UUID não é editável. A exclusão pede confirmação e remove também os registros de anexos vinculados.
- **Empresa**: cadastra e edita somente suas obras; não exclui, não altera o ID Linko e não transfere obras para outra empresa. O vínculo é definido pelo perfil autenticado.
- **Relatórios gerenciais**: disponíveis para ambos os perfis, com filtros de categoria, status e período de recebimento. Gestores também filtram por empresa. Exibe contagens, produção acumulada das obras filtradas e exportação CSV compatível com Excel, restrita aos mesmos dados. Datas do filtro referem-se ao recebimento da demanda, não à data da execução dos serviços.
- **Acesso**: todas as rotas operacionais verificam primeiro acesso e situação ativa da empresa. Consultas e alterações usam o token do usuário e as políticas do banco, incluindo relatórios. A chave administrativa é usada apenas para validar sessão e localizar o perfil.

O código automático é sequencial e pode conter intervalos após operações canceladas. IDs já utilizados não devem ser considerados uma contagem de obras. Para correções, o gestor pode usar de 3 a 64 letras maiúsculas, números, hífen ou sublinhado; duplicidades são rejeitadas.

## Verificação

Em `backend`, execute `npm install` e `npm test`. Os testes verificam a API e executam as migrações em PostgreSQL via PGlite com dois perfis de empresa e um gestor. O ambiente de teste simula apenas as funções de autenticação do Supabase; não usa dados ou credenciais de produção. Em `frontend`, execute `npm install` e `npm run build`. O GitHub Actions executa essas verificações em pull requests.

Antes de liberar em produção, execute a migração 03, publique API e frontend e confirme cadastro, edição e relatórios usando os logins reais de gestor e empresa. A alteração no repositório não executa a migração automaticamente.
