// Upstash Redis (REST) istemcisi — ek paket gerektirmez.
// Vercel'de "Storage → Upstash for Redis" bağlandığında ortam değişkenleri otomatik gelir.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

const configured = () => Boolean(URL_ && TOKEN);

async function call(path, body) {
  if (!configured()) {
    const e = new Error("DB_NOT_CONFIGURED");
    e.code = "DB_NOT_CONFIGURED";
    throw e;
  }
  const res = await fetch(URL_.replace(/\/$/, "") + path, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error("DB_ERROR " + res.status + " " + JSON.stringify(data));
  return data;
}

// Tek komut: await cmd("SET", "k", "v")
async function cmd(...args) {
  const data = await call("", args.map(String));
  if (data.error) throw new Error("DB_ERROR " + data.error);
  return data.result;
}

// Birden fazla komut tek istekte: await pipe([["INCR","a"],["GET","b"]])
async function pipe(cmds) {
  if (!cmds.length) return [];
  const data = await call("/pipeline", cmds.map((c) => c.map(String)));
  return data.map((d) => (d && d.error ? null : d.result));
}

async function getJSON(key, fallback) {
  const v = await cmd("GET", key);
  if (v == null) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

async function setJSON(key, value, exSeconds) {
  const args = ["SET", key, JSON.stringify(value)];
  if (exSeconds) args.push("EX", exSeconds);
  return cmd(...args);
}

// HGETALL düz dizi döndürür → nesneye çevir
const hashToObj = (arr) => {
  const o = {};
  if (Array.isArray(arr)) for (let i = 0; i < arr.length; i += 2) o[arr[i]] = arr[i + 1];
  return o;
};

module.exports = { configured, cmd, pipe, getJSON, setJSON, hashToObj };
