import { Redis } from "@upstash/redis";

// Chave única no Redis onde o estado inteiro do planner (um único usuário) é salvo.
const STATE_KEY = "hrc-planner:state";

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Banco de dados não configurado. Conecte um banco Redis/KV (Upstash) ao projeto na Vercel e defina UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN."
    );
  }
  return new Redis({ url, token });
}

function checkAuth(req: any): boolean {
  const expected = process.env.PLANNER_PASSWORD;
  if (!expected) {
    // Sem senha configurada no servidor: nega tudo por segurança em vez de deixar público.
    return false;
  }
  const provided = req.headers["x-planner-password"];
  return typeof provided === "string" && provided === expected;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (!checkAuth(req)) {
    res.status(401).json({ error: "Senha inválida ou ausente." });
    return;
  }

  try {
    const redis = getRedis();

    if (req.method === "GET") {
      const data = await redis.get(STATE_KEY);
      res.status(200).json(data || null);
      return;
    }

    if (req.method === "POST") {
      const body = req.body && typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
      await redis.set(STATE_KEY, body);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Método não permitido." });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erro desconhecido no servidor." });
  }
}
