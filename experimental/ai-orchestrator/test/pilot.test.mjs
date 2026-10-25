import test from "node:test";
import assert from "node:assert/strict";
import {once} from "node:events";
import {PROJECTS, PilotError, validateTask, runPipeline, mockAdapters} from "../src/core.mjs";
import {createAdapters} from "../src/providers.mjs";
import {createPilotServer} from "../src/server.mjs";

const TASK = {
  project: "gestao-obras",
  goal: "Verificar permissao de acesso a obras entre empresas ficticias."
};

test("projetos permitidos e validação de dados", () => {
  assert.equal(Object.keys(PROJECTS).length, 3);
  assert.deepEqual(validateTask(TASK), TASK);
  assert.throws(() => validateTask({project: "outro", goal: TASK.goal}), PilotError);
  assert.throws(() => validateTask({...TASK, sql: "DROP TABLE obras"}), PilotError);
  assert.throws(() => validateTask({...TASK, goal: "curto"}), PilotError);
  assert.throws(() => validateTask({...TASK, goal: "x".repeat(1001)}), PilotError);
  assert.throws(() => validateTask({...TASK, goal: "Senha: abc123456789"}), PilotError);
  assert.throws(() => validateTask({...TASK, goal: "contatar nome@exemplo.com para testes"}), PilotError);
  assert.throws(() => validateTask({...TASK, goal: "chave sk-ABCabc12345678 vazou no log"}), PilotError);
});

test("mock passa por GPT, Claude, GPT sem escritas", async () => {
  const result = await runPipeline(TASK, mockAdapters(), "mock");
  assert.equal(result.simulated, true);
  assert.equal(result.writesPerformed, false);
  assert.equal(result.productionAccess, false);
  assert.equal(result.requiresHumanApproval, true);
  assert.match(result.plan, /SIMULACAO GPT/);
  assert.match(result.proposal, /SIMULACAO CLAUDE/);
  assert.match(result.review, /SIMULACAO GPT/);
});

test("sequencia real usa endpoints fixos e cliente simulado, nao chama rede", async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({url, options, body});
    if (url.includes("openai.com")) {
      return {ok: true, text: async () => JSON.stringify({
        output: [{type: "message", content: [{type: "output_text", text: "GPT resultado"}]}]
      })};
    }
    return {ok: true, text: async () => JSON.stringify({
      content: [{type: "text", text: "Claude proposta"}]
    })};
  };
  const adapters = createAdapters({
    AI_PILOT_MODE: "real",
    AI_REAL_CALLS_APPROVED: "yes",
    OPENAI_API_KEY: "TEST_OPENAI_DO_NOT_USE",
    ANTHROPIC_API_KEY: "TEST_ANTHROPIC_DO_NOT_USE",
    OPENAI_MODEL: "openai-model-ficticio",
    ANTHROPIC_MODEL: "claude-model-ficticio"
  }, fakeFetch);
  const result = await runPipeline(TASK, adapters, "real");
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map((c) => new URL(c.url).hostname), [
    "api.openai.com", "api.anthropic.com", "api.openai.com"
  ]);
  assert.equal(calls[0].body.store, false);
  assert.equal(calls[1].body.max_tokens, 700);
  assert.equal(calls[1].options.headers["anthropic-version"], "2026-10-21");
  assert.equal(result.review, "GPT resultado");
  assert.equal(result.proposal, "Claude proposta");
  assert.equal(result.writesPerformed, false);
});

test("chamadas reais ficam bloqueadas sem aprovacao e parametros", () => {
  assert.throws(() => createAdapters({AI_PILOT_MODE: "real"}), /nao aprovado/);
  assert.throws(() => createAdapters({AI_PILOT_MODE: "invalido"}), /invalido/);
});

test("servidor protegido aceita somente consulta de proposta e autenticacao", async () => {
  const token = "t".repeat(32);
  const server = createPilotServer({token, env: {AI_PILOT_MODE: "mock"}});
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    let res = await fetch(base + "/healthz");
    assert.equal(res.status, 200);
    assert.equal((await res.json()).productionAccess, false);

    res = await fetch(base + "/v1/tasks/preview", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify(TASK)
    });
    assert.equal(res.status, 401);

    res = await fetch(base + "/v1/tasks/preview", {
      method: "POST",
      headers: {"content-type": "application/json", authorization: "Bearer " + token},
      body: JSON.stringify(TASK)
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.simulated, true);
    assert.equal(body.project, "gestao-obras");
    assert.equal(body.requiresHumanApproval, true);

    res = await fetch(base + "/v1/tasks/preview", {
      method: "POST",
      headers: {"content-type": "application/json", authorization: "Bearer " + token},
      body: JSON.stringify({...TASK, project: "site-externo"})
    });
    assert.equal(res.status, 400);

    res = await fetch(base + "/v1/tasks/preview", {
      method: "POST",
      headers: {"content-type": "application/json", authorization: "Bearer " + token},
      body: "x".repeat(10000)
    });
    assert.equal(res.status, 413);

    res = await fetch(base + "/v1/tasks/preview", {
      method: "GET",
      headers: {authorization: "Bearer " + token}
    });
    assert.equal(res.status, 405);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
