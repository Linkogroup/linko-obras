# Piloto isolado — GPT + Claude | Linko Regional Sul

**Estado:** piloto nao implantado e nao ligado ao banco de producao.
Este codigo fica em uma branch experimental do repositorio de Gestao de Obras.
Nao importa nem altera arquivos existentes da API, frontend, D1 ou Supabase.

## O que faz
- Processa somente projeto autorizado + objetivo sem dados pessoais.
- Etapa 1: GPT define plano; etapa 2: Claude apresenta proposta tecnica; etapa 3: GPT revisa.
- Resposta eh **proposta textual**; nao edita codigo, nao abre PRs e nao opera infraestrutura.
- Por padrao roda em `mock`: retorna textos explicitamente identificados como simulacao sem acessar API ou consumir creditos.
- Modo `real` so ativa quando parametros e permissao no ambiente forem explicitamente habilitados; 2 chamadas OpenAI + 1 chamada Anthropic por tarefa. **Nao esta habilitado neste PR.**

## Testar com Node.js >= 22
Execute a partir desta pasta:
1. `npm run check`
2. `npm test`

O workflow GitHub Actions executa estes testes de forma isolada sem segredos, acesso a banco ou chamadas pagas. A pasta nao tem dependencias npm externas.

## Servico HTTP local (opcional; sem deployment)
Configurar `AI_PILOT_TOKEN` com valor aleatorio de pelo menos 24 caracteres em seu proprio secret manager/ambiente.
Executar `npm start`. O servico escuta somente `127.0.0.1:8791` e nao expoe endpoint publico por padrao.
- GET /healthz: health minimo, sem segredo.
- POST /v1/tasks/preview: exige Authorization Bearer e JSON contendo exatamente `project` e `goal`.
- Projetos: `abre-portas`, `kpi-regional-sul`, `gestao-obras`.
- Limite de corpo: 8 KiB; objetivo: 12 a 1000 caracteres.
- Sem CORS e sem persistencia. Nao armazenar tokens em arquivos nem copiar para chats/PRs.

## Configuracao futura de API, nao ativada
- `AI_PILOT_MODE=real`
- `AI_REAL_CALLS_APPROVED=yes` (habilitar **somente** depois de aprovacao de custo, dados e ambiente).
- `OPENAI_API_KEY` e `ANTHROPIC_API_KEY`: secrets protegidos, restritos ao runtime de teste.
- `OPENAI_MODEL` e `ANTHROPIC_MODEL`: IDs validos, escolhidos conforme acesso e orcamento.
- `ANTHROPIC_VERSION`: versao da API (padrao no codigo: 2026-10-21); `ANTHROPIC_WORKSPACE_ID` se necessario.

**Atencao:** esse piloto nao eh o Claude Code nem um agente que modifica repositorios.
Para desenvolvimento real: configurar Claude Code GitHub Action com aprovacao de PR e permissao minima. Para comandos do GPT dispararem a API privada, criar depois uma ferramenta MCP autenticada em ambiente dedicado, nunca reaproveitando a API operacional Linko.

## Gates antes de usar APIs reais
- Conta e cobranca autorizadas dos dois provedores e limites de gasto.
- Segredos exclusivamente no provedor de secrets do runtime de testes.
- Autenticacao reforcada e politica de rede antes de expor endpoint fora de localhost.
- Logs sem payload, token ou PII; rate-limit e limites de custo por tarefa.
- Testar erros de API, timeout e protecao contra prompt injection.
- Revisao humana antes de qualquer PR, merge, deploy, SQL ou mudanca de permissao.
- Definir ambiente isolado com runtime apropriado. **Nao utilizar Render linko-obras em producao.**

Fontes: https://developers.openai.com/api/reference/resources/responses/methods/create e https://platform.claude.com/docs/en/api/messages/create
