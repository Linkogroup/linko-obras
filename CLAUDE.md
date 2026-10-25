# CLAUDE.md — Claude Code / Gestão de Obras

Leia AGENTS.md e README.md. Trabalhe com diffs pequenos em branch por tarefa e crie PR draft.
- Limite-se ao objetivo autorizado e execute testes por perfil, sobretudo controle de acesso da parceira.
- Supabase RLS e operações na base produtiva exigem revisão e autorização; não ajustar permissões automaticamente para contornar falhas.
- Backend service_role é segredo exclusivo do servidor.
- Rodar os testes existentes antes de declarar sucesso; em falta de dependências, registrar bloqueio.
- Não executar merge, deploy, SQL produtivo, alteração de env, ou exclusão de dados sem aprovação expressa.
