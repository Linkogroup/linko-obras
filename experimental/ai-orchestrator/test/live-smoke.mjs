import {runPipeline} from "../src/core.mjs";
import {createAdapters} from "../src/providers.mjs";

// Teste de integracao com prompt sintetico e sem dados operacionais.
// Dois pedidos OpenAI e um pedido Anthropic, todos somente texto.
const env = process.env;
if (env.AI_PILOT_MODE !== "real" || env.AI_REAL_CALLS_APPROVED !== "yes") {
  throw new Error("Execucao real nao habilitada.");
}
if (!env.OPENAI_API_KEY || !env.ANTHROPIC_API_KEY || !env.OPENAI_MODEL || !env.ANTHROPIC_MODEL) {
  throw new Error("Credenciais ou IDs de modelo ausentes no ambiente protegido.");
}
const result = await runPipeline({
  project: "gestao-obras",
  goal: "Planejar testes com duas empresas ficticias e uma obra ficticia, sem acessar dados nem sistemas."
}, createAdapters(env), "real");
if (result.simulated || result.writesPerformed || result.productionAccess ||
    !result.plan || !result.proposal || !result.review) {
  throw new Error("Resposta do piloto invalida ou fora do modo permitido.");
}
// Nao imprime respostas, prompts, tokens ou informacoes de uso do provedor.
process.stdout.write("OK: GPT planejou, Claude propôs e GPT revisou; sem gravacoes ou acesso produtivo.\\n");
