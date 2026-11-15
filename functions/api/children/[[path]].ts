import { jsonResponse, missingBucket, parseBucketPath } from "@/utils/bucket";
import { can_access_path, get_allow_list } from "@/utils/auth";

export async function onRequestGet(context) {
  try {
    const [bucket, path] = parseBucketPath(context);
    if (!bucket) return missingBucket();
    const prefix = path.replace(/^\/+|\/+$/g, "");
    const directory = prefix ? `${prefix}/` : "";
    if (directory.startsWith("_$flaredrive$/")) return jsonResponse({ error: "目录不存在。" }, 404);
    const allowList = await get_allow_list(context);
    if (!allowList) return jsonResponse({ error: "登录已失效，请重新登录。" }, 401);
    if (directory && !await can_access_path(context, directory)) {
      return jsonResponse({ error: "没有此目录的访问权限。" }, 403);
    }

    const url = new URL(context.request.url);
    const cursor = url.searchParams.get("cursor") || url.searchParams.get("marker") || undefined;
    const objList = await bucket.list({
      prefix: directory,
      delimiter: "/",
      include: ["httpMetadata", "customMetadata"],
      cursor,
    });
    let value = objList.objects
      .filter((obj) => !obj.key.endsWith("/_$folder$") && obj.key !== "_$folder$")
      .map(({ key, size, uploaded, httpMetadata, customMetadata }) => ({
        key, size, uploaded, httpMetadata: httpMetadata || {}, customMetadata: customMetadata || {},
      }));
    let folders = objList.delimitedPrefixes.filter((folder) => folder !== "_$flaredrive$/");
    if (!directory && !allowList.includes("*")) {
      value = value.filter((obj) => allowList.some((allow) => obj.key.startsWith(allow)));
      folders = folders.filter((folder) => allowList.some((allow) => folder.startsWith(allow)));
      // Add permitted nested directories even when their parents are not readable.
      for (const allow of allowList) if (!folders.includes(allow)) folders.push(allow);
    }
    const nextCursor = objList.truncated ? objList.cursor : null;
    return jsonResponse({ value, folders: [...new Set(folders)], cursor: nextCursor, marker: nextCursor });
  } catch (error) {
    console.error("File listing failed", error);
    return jsonResponse({ error: "文件列表加载失败，请检查 R2 绑定后重试。" }, 500);
  }
}
