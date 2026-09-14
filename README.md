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
