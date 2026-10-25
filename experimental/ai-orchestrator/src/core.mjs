export const PROJECTS = Object.freeze({
  "abre-portas": "Fila e tratamentos da operacao ABRE PORTAS. Nao alterar Cloudflare Workers, D1 ou R2.",
  "kpi-regional-sul": "Indicadores PR, SC e RS. Diferenciar simulacao de producao e faturamento reais.",
  "gestao-obras": "Obras e materiais Linko. Isolamento entre empresas e politica RLS obrigatorios."
});

export class PilotError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "PilotError";
    this.status = status;
  }
}

export function validateTask(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new PilotError("Corpo da tarefa invalido.");
  }
  const keys = Object.keys(data);
  if (keys.some((key) => !["project", "goal"].includes(key))) {
    throw new PilotError("Somente project e goal sao aceitos.");
  }
  if (!Object.hasOwn(PROJECTS, data.project)) {
    throw new PilotError("Projeto fora da lista permitida.");
  }
  if (typeof data.goal !== "string" || data.goal.trim().length < 12 ||
      data.goal.length > 1000) {
    throw new PilotError("Objetivo precisa ter entre 12 e 1000 caracteres.");
  }
  // Defesa preliminar; filtros de padroes nao substituem governanca de dados.
  if (/\bsk-[A-Za-z0-9_-]{8,}|\b(?:api[ _-]?key|authorization|bearer|password|senha|token)\s*[:=]\s*\S+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/i.test(data.goal)) {
    throw new PilotError("Remova credenciais ou dados pessoais do objetivo.");
  }
  return {project: data.project, goal: data.goal.trim()};
}

export async function runPipeline(task, adapters, mode = "mock") {
  const clean = validateTask(task);
  const prefix = "Projeto: " + clean.project + "\nContexto autorizado: " +
    PROJECTS[clean.project] + "\nObjetivo: " + clean.goal +
    "\nNao acesse dados reais, nao modifique recursos externos e nao execute comandos.";
  const plan = await adapters.plan(prefix);
  if (typeof plan !== "string" || !plan.trim()) throw new PilotError("Planejamento vazio.", 502);
  const proposal = await adapters.propose(prefix + "\nPlano GPT:\n" + plan.slice(0, 6000));
  if (typeof proposal !== "string" || !proposal.trim()) throw new PilotError("Proposta vazia.", 502);
  const review = await adapters.review(prefix + "\nPlano GPT:\n" +
    plan.slice(0, 6000) + "\nProposta Claude:\n" + proposal.slice(0, 6000));
  if (typeof review !== "string" || !review.trim()) throw new PilotError("Revisao vazia.", 502);
  return {
    project: clean.project,
    mode,
    simulated: mode === "mock",
    plan: plan.slice(0, 8000),
    proposal: proposal.slice(0, 8000),
    review: review.slice(0, 8000),
    writesPerformed: false,
    requiresHumanApproval: true,
    productionAccess: false
  };
}

export function mockAdapters() {
  return {
    async plan() {
      return "SIMULACAO GPT: definir criterio de aceite, testes de regressao, riscos e rollback.";
    },
    async propose() {
      return "SIMULACAO CLAUDE: propor diff isolado, sem execucao de codigo e sem acesso ao GitHub.";
    },
    async review() {
      return "SIMULACAO GPT: revisao tecnica pendente; nenhuma implantacao autorizada.";
    }
  };
}
