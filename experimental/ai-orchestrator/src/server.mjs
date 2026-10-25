import {createServer} from "node:http";
import {timingSafeEqual} from "node:crypto";
import {fileURLToPath} from "node:url";
import {createAdapters} from "./providers.mjs";
import {PilotError, runPipeline} from "./core.mjs";

const MAX_BODY = 8192;
function respond(res, status, data) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(JSON.stringify(data));
}

function validToken(header, expected) {
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return false;
  const candidate = Buffer.from(header.slice(7));
  const secret = Buffer.from(expected);
  return candidate.length === secret.length && timingSafeEqual(candidate, secret);
}

export function createPilotServer({token, env = process.env, fetcher = fetch} = {}) {
  if (typeof token !== "string" || token.length < 24) {
    throw new PilotError("Configure AI_PILOT_TOKEN com no minimo 24 caracteres.", 503);
  }
  const mode = env.AI_PILOT_MODE || "mock";
  if (!["mock", "real"].includes(mode)) throw new PilotError("Modo invalido.", 503);
  return createServer(async (req, res) => {
    if (req.url === "/healthz" && req.method === "GET") {
      return respond(res, 200, {status: "ok", mode, productionAccess: false});
    }
    if (req.url !== "/v1/tasks/preview") return respond(res, 404, {error: "Nao encontrado."});
    if (req.method !== "POST") return respond(res, 405, {error: "Metodo nao permitido."});
    if (!validToken(req.headers.authorization, token)) return respond(res, 401, {error: "Nao autorizado."});
    if (!req.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
      return respond(res, 415, {error: "Content-Type deve ser application/json."});
    }
    try {
      if (Number(req.headers["content-length"]) > MAX_BODY) {
        throw new PilotError("Tarefa excedeu tamanho permitido.", 413);
      }
      let raw = "";
      for await (const chunk of req) {
        raw += chunk.toString("utf8");
        if (Buffer.byteLength(raw, "utf8") > MAX_BODY) {
          throw new PilotError("Tarefa excedeu tamanho permitido.", 413);
        }
      }
      let input;
      try { input = JSON.parse(raw); } catch { throw new PilotError("JSON invalido."); }
      const result = await runPipeline(input, createAdapters(env, fetcher), mode);
      return respond(res, 200, result);
    } catch (error) {
      return respond(res, error instanceof PilotError ? error.status : 502, {
        error: error instanceof PilotError ? error.message : "Falha controlada no piloto."
      });
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const server = createPilotServer({token: process.env.AI_PILOT_TOKEN});
  const host = "127.0.0.1"; // Nao expor porta publicamente por padrao.
  const port = Number(process.env.AI_PILOT_PORT || 8791);
  server.listen(port, host, () => {
    process.stdout.write("Piloto ativo em " + host + ":" + port + " (sem deploy)\n");
  });
}
