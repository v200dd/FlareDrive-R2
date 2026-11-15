import { get_auth_status } from "@/utils/auth";
import { jsonResponse } from "@/utils/bucket";

export async function onRequest(context) {
  return await get_auth_status(context)
    ? new Response("access", { status: 200 })
    : jsonResponse({ error: "登录已失效或没有此目录的写入权限。" }, 401);
}
