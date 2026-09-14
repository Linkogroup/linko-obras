# Linko Obras — atualização de primeiro acesso

## Estado desta entrega

O aplicativo agora usa Supabase Auth e lê/grava obras no banco real. A demonstração com dados fictícios foi removida deste fluxo. O projeto inclui login, troca obrigatória de senha para empresas, painel com contagens reais, filtros, criação/edição de obras com os campos de execução, consulta das empresas e dos perfis pelo gestor e saída da sessão.

A mudança obrigatória não é apenas uma tela: o banco bloqueia leitura/gravação de obras, empresas e metadados de anexos enquanto a troca estiver pendente. O usuário pode ler seu próprio perfil e alterar a senha pelo Supabase Auth. Um trigger acompanha a mudança efetiva do hash de senha no Auth e libera o acesso. Atualizar metadados do usuário não remove o bloqueio.

## Ativar no projeto já configurado

1. No Supabase, abra SQL Editor → New query.
2. Cole TODO o conteúdo de `supabase/02-primeiro-acesso.sql` e execute como administrador.
3. O resultado final deve mostrar `troca_senha_obrigatoria = true` para empresas e `false` para gestores. Reexecutar não redefine senhas e não reabre trocas já concluídas.
4. Substitua a pasta `dist` antiga pela pasta `dist` deste pacote. A URL e a chave pública já estão em `config.js`.
5. Sirva a pasta `dist` em HTTP local para teste, ou HTTPS para uso online. Não abra só o HTML no visualizador de arquivos do iPhone: os arquivos JS precisam ser servidos junto.
6. Entre com um usuário parceiro e a senha provisória já definida. O app exigirá nova senha e confirmação antes de carregar o painel. O primeiro acesso de cada empresa fica pendente a partir da aplicação desta migração.
7. Após trocar a senha, verifique uma obra nova e recarregue a consulta. O armazenamento é no banco; nada é salvo como obra em localStorage.

A chave pública não permite executar essa migração. Ela precisa ser aplicada no painel pelo administrador. Não envie a senha do gestor ou chaves secretas no chat.

## Teste local

```bash
python3 -m http.server 4173 --directory dist
```

Abra http://localhost:4173. O Supabase e o SDK requerem internet. A sessão fica em memória: ao fechar/recarregar a página, entre novamente. A senha só é enviada ao Supabase Auth e não é armazenada em arquivos ou tabelas do aplicativo.

## Validação

`tests/security.mjs`: integração em PostgreSQL embutido (PGlite), com papéis auth simulados: bloqueio antes da troca, tentativa de promoção do próprio perfil, bypass por metadados, isolamento entre empresas, visão com RLS, atribuição do autor/empresa no backend, empresa inativa, exclusão restrita ao gestor, acesso anônimo e reexecução da migração.

`tests/browser.cjs`: Playwright com SDK simulado para testar a interface e respostas de falha, sem alterar usuários reais.

As simulações não confirmam implantação no seu Supabase. O teste ponta a ponta com autenticação real depende da execução da migração e de um login de teste autorizado; nenhuma senha de parceiro foi alterada remotamente nesta entrega.

## Limitações ainda existentes

- Cadastro/redefinição de logins continua sendo feito pelo gestor no painel Supabase; não há API administrativa implantada no app.
- Upload de fotos/as built, notificações, relatórios, histórico e aprovação do as built ainda não estão implementados.
- `manifest.webmanifest` é apenas metadado: não há cache offline ou pacote nativo iOS/Android.
- Não há URL de hospedagem criada por este pacote.
- O SQL inicial anterior tinha falhas. Para instalações novas, executar `schema.sql` e imediatamente `02-primeiro-acesso.sql` ANTES de cadastrar ou liberar usuários.

## Referências técnicas

- https://supabase.com/docs/reference/javascript/auth-updateuser
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/managing-user-data
