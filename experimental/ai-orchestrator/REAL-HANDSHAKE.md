# Autenticacao de homologacao: GPT → Claude → GPT

Este fluxo **nao publica** alteracoes e nao possui acesso a dados de producao. O gatilho nao executa chamadas pagas por padrao.

## Configuracao segura (somente pelo GitHub, nunca pelo chat)

Repositorio: Linkogroup/linko-obras

1. Em Settings > Environments, preparar o ambiente `ai-homologacao` com revisores obrigatorios e as duas credenciais de API como segredos de ambiente: `OPENAI_API_KEY` e `ANTHROPIC_API_KEY`. Não reutilizar segredos produtivos de Supabase/Render/Cloudflare.
2. Em Settings > Secrets and variables > Actions > Variables, criar `OPENAI_MODEL` e `ANTHROPIC_MODEL` com IDs válidos das contas habilitadas. Os IDs nao sao chaves.
3. Definir `AI_PILOT_REAL_APPROVED=yes` como variavel de **repositório**, depois de confirmar orçamento e cobranca.
4. Conferir o commit exato da HEAD do PR #5, revisar a diferenca e definir `AI_PILOT_APPROVED_COMMIT` como variavel de repositório, igual ao SHA revisado. Se o PR receber novo commit, a variavel deve ser atualizada **somente após nova revisão**.
5. Somente entao, adicionar a label `ai-real-test` ao PR #5. Isso dispara o workflow `GPT-Claude live handshake (approval gated)`. Em caso de erro ou falha, analisar logs sem expor segredos. Reaplicar a label apenas após correção/revisão.

## Escopo e gastos

O teste faz, no maximo por execucao regular, **2 chamadas OpenAI Responses + 1 chamada Anthropic Messages**, usando objetivo com empresas/obras fictícias e limite de resposta de 600/700 tokens por chamada. Nao executa ferramentas e nao escreve em repositorio, banco, serviços ou banco de dados. Um workflow repetido pode gastar novamente; garantir limite de custo e alertas nos provedores antes de habilitar.

O codigo nao possui rate limiting persistente: **nao expor o endpoint local à internet**. CI executa teste unico. O log imprime somente aprovação ou erro genérico, sem respostas dos modelos nem tokens.

## Gates
- Event: `pull_request` com ação `labeled`, somente PR #5 e label exata `ai-real-test`.
- Branch fixa `ai/gpt-claude-pilot-20261025`, repositório do titular e PR aberto pelo Linkogroup.
- Variáveis `AI_PILOT_REAL_APPROVED` e `AI_PILOT_APPROVED_COMMIT` devem confirmar aprovação e SHA.
- `environment: ai-homologacao` deve ter proteção por revisor.
- Sem qualquer permissão de escrita no GitHub Actions.
- GitHub App Claude é integração separada; o handshake prova a comunicação entre **APIs dos modelos**, não operação de Claude Code no repositório.

Nenhum merge na main, deploy de Render, Vercel, Supabase ou Cloudflare é necessário para este teste; ele é executado em GitHub Actions. Se as credenciais estiverem apenas no console Anthropic ou OpenAI, **isso não as torna disponíveis ao runner GitHub**: é preciso configurar os segredos de ambiente diretamente na interface GitHub.

## Evidencia de sucesso
A execução deve exibir status de CI concluído como sucesso e a saída curta `OK: GPT planejou, Claude propôs e GPT revisou`. Um workflow ignorado (`skipped`) **nao** é um teste real aprovado.
