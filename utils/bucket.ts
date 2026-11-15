export function notFound() {
  return new Response("Not found", { status: 404 });
}

type BucketContext = {
  request: Request;
  env: Record<string, unknown>;
  params: { path?: string | string[] };
};

function isBucket(value: unknown): value is R2Bucket {
  return typeof value === "object" && value !== null && "get" in value && "list" in value;
}

export function parseBucketPath(context: BucketContext): [R2Bucket | undefined, string] {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const driveid = url.hostname.replace(/\..*/, "");
  const bucket = isBucket(env[driveid]) ? env[driveid] : env.BUCKET;
  const routes = ["/api/children/", "/api/write/items/", "/raw/"];
  const route = routes.find((prefix) => url.pathname.startsWith(prefix));
  const segments = Array.isArray(params.path) ? params.path.join("/") : params.path || "";
  // Pages route params are already decoded. Raw paths come from the URL and need decoding once.
  const path = route === "/raw/"
    ? decodeURIComponent(url.pathname.slice(route.length))
    : segments;
  return [isBucket(bucket) ? bucket : undefined, path];
}

export function jsonResponse(value: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(value), { status, headers });
}

export function missingBucket(): Response {
  return jsonResponse({ error: "尚未绑定 R2 存储桶。请在 Cloudflare Pages 设置中添加名为 BUCKET 的 R2 绑定，然后重新部署。" }, 503);
}
