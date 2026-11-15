import {
  authenticate_account, clear_session_cookie, create_session_cookie,
  get_identity, has_access_configuration,
} from "@/utils/auth";
import { jsonResponse, missingBucket, parseBucketPath } from "@/utils/bucket";

function checkConfiguration(context) {
  const [bucket] = parseBucketPath({ ...context, params: {} });
  if (!bucket) return missingBucket();
  if (!has_access_configuration(context)) {
    return jsonResponse({ error: "尚未配置访问权限。请添加 FLAREDRIVE_USERS Secret，或配置 GUEST 目录，然后重新部署。" }, 503);
  }
  return null;
}

export async function onRequestGet(context) {
  const error = checkConfiguration(context);
  if (error) return error;
  const identity = await get_identity(context);
  if (!identity) return jsonResponse({ authenticated: false, username: "", allowList: [] });
  return jsonResponse({ authenticated: true, ...identity });
}

export async function onRequestPost(context) {
  const error = checkConfiguration(context);
  if (error) return error;
  const origin = context.request.headers.get("Origin");
  if (origin && origin !== new URL(context.request.url).origin) {
    return jsonResponse({ error: "登录请求来源无效，请从网盘页面重新登录。" }, 403);
  }
  let body: { username?: unknown; password?: unknown };
  try { body = await context.request.json(); }
  catch { return jsonResponse({ error: "登录信息格式无效。" }, 400); }
  if (!body || typeof body.username !== "string" || typeof body.password !== "string"
    || !body.username || body.username.includes(":") || body.username.length + body.password.length > 2048) {
    return jsonResponse({ error: "请输入有效的账号和密码。" }, 400);
  }
  const identity = authenticate_account(context, body.username, body.password);
  if (!identity) return jsonResponse({ error: "账号或密码错误。" }, 401);
  return jsonResponse({ authenticated: true, ...identity }, 200, {
    "Set-Cookie": await create_session_cookie(context, body.username, body.password),
  });
}

export async function onRequestDelete(context) {
  return jsonResponse({ authenticated: false, username: "", allowList: [] }, 200, {
    "Set-Cookie": clear_session_cookie(context),
  });
}
