import { can_access_path, get_auth_status, get_identity } from "@/utils/auth";
import { jsonResponse, missingBucket, parseBucketPath } from "@/utils/bucket";

async function writeDenied(context) {
  const identity = await get_identity(context);
  return jsonResponse({ error: !identity ? "请登录后上传，或进入开放的访客目录。"
    : identity.username ? "没有此目录的写入权限。"
    : "访客没有此目录的写入权限，请进入开放目录或登录后上传。" }, identity ? 403 : 401);
}

export async function onRequestPostCreateMultipart(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return missingBucket();

  const request: Request = context.request;
  const customMetadata: Record<string, string> = {};
  const thumbnail = request.headers.get("fd-thumbnail");
  if (thumbnail) customMetadata.thumbnail = thumbnail;

  const multipartUpload = await bucket.createMultipartUpload(path, {
    httpMetadata: { contentType: request.headers.get("content-type") || undefined },
    customMetadata,
  });

  return jsonResponse({ key: multipartUpload.key, uploadId: multipartUpload.uploadId });
}

export async function onRequestPostCompleteMultipart(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return missingBucket();

  const url = new URL(context.request.url);
  const uploadId = url.searchParams.get("uploadId");
  if (!uploadId) return jsonResponse({ error: "缺少分片上传标识。" }, 400);
  const multipartUpload = bucket.resumeMultipartUpload(path, uploadId);
  const completeBody: { parts?: R2UploadedPart[] } = await context.request.json();
  if (!Array.isArray(completeBody.parts)) return jsonResponse({ error: "分片信息无效。" }, 400);

  try {
    const object = await multipartUpload.complete(completeBody.parts);
    return new Response(null, { headers: { etag: object.httpEtag } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "分片合并失败。";
    return jsonResponse({ error: message }, 400);
  }
}

export async function onRequestPost(context) {
  if (!(await get_auth_status(context))) {
    return writeDenied(context);
  }

  const url = new URL(context.request.url);
  if (url.searchParams.has("uploads")) return onRequestPostCreateMultipart(context);
  if (url.searchParams.has("uploadId")) return onRequestPostCompleteMultipart(context);
  return jsonResponse({ error: "不支持此操作。" }, 405, { Allow: "POST" });
}

export async function onRequestPutMultipart(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return missingBucket();

  const url = new URL(context.request.url);
  const uploadId = url.searchParams.get("uploadId");
  const partNumber = Number(url.searchParams.get("partNumber"));
  if (!uploadId || !Number.isInteger(partNumber) || partNumber < 1) {
    return jsonResponse({ error: "分片上传参数无效。" }, 400);
  }
  const uploadedPart = await bucket.resumeMultipartUpload(path, uploadId).uploadPart(partNumber, context.request.body);
  return new Response(null, { headers: { "Content-Type": "application/json", etag: uploadedPart.etag } });
}

export async function onRequestPut(context) {
  if (!(await get_auth_status(context))) {
    return writeDenied(context);
  }

  const url = new URL(context.request.url);
  if (url.searchParams.has("uploadId")) return onRequestPutMultipart(context);

  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return missingBucket();

  const request: Request = context.request;
  let content: ReadableStream | string | null = request.body;
  const customMetadata: Record<string, string> = {};
  let httpMetadata: R2HTTPMetadata | undefined = request.headers.get("content-type")
    ? { contentType: request.headers.get("content-type") || undefined } : undefined;
  const copySource = request.headers.get("x-amz-copy-source");
  if (copySource) {
    const sourceName = decodeURIComponent(copySource);
    if (!(await can_access_path(context, sourceName))) {
      return jsonResponse({ error: "没有源文件的访问权限。" }, 403);
    }
    const source = await bucket.get(sourceName);
    if (!source) return jsonResponse({ error: "源文件不存在。" }, 404);
    content = source.body;
    httpMetadata = source.httpMetadata;
    Object.assign(customMetadata, source.customMetadata || {});
  }

  const thumbnail = request.headers.get("fd-thumbnail");
  if (thumbnail) customMetadata.thumbnail = thumbnail;

  const object = await bucket.put(path, content, {
    customMetadata,
    httpMetadata,
  });
  return jsonResponse({ key: object.key, size: object.size, uploaded: object.uploaded });
}

export async function onRequestDelete(context) {
  if (!(await get_auth_status(context))) {
    return writeDenied(context);
  }
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return missingBucket();
  await bucket.delete(path);
  return new Response(null, { status: 204 });
}
