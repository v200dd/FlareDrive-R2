import { can_access_path } from "@/utils/auth";
import { jsonResponse, missingBucket, parseBucketPath } from "@/utils/bucket";

export async function onRequestGet(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return missingBucket();
  if (!path || !(await can_access_path(context, path))) {
    return jsonResponse({ error: "没有此文件的访问权限。" }, 401);
  }

  try {
    const request = context.request as Request;
    if (request.method === "HEAD") {
      const metadata = await bucket.head(path);
      if (!metadata) return jsonResponse({ error: "文件不存在。" }, 404);
      const headers = new Headers();
      metadata.writeHttpMetadata(headers);
      headers.set("ETag", metadata.httpEtag);
      headers.set("Last-Modified", metadata.uploaded.toUTCString());
      headers.set("Accept-Ranges", "bytes");
      headers.set("Content-Length", String(metadata.size));
      return new Response(null, { headers });
    }
    const rangeHeader = request.headers.get("Range");
    const ifRange = request.headers.get("If-Range");
    const options: R2GetOptions = { onlyIf: request.headers };
    let rangeBounds: { start: number; end: number } | null = null;

    if (rangeHeader) {
      const metadata = await bucket.head(path);
      if (!metadata) return jsonResponse({ error: "文件不存在。" }, 404);
      let useRange = true;
      // R2 does not apply If-Range itself, so preserve HTTP's full-response fallback.
      if (ifRange) {
        const etagMatch = ifRange === metadata.httpEtag || ifRange === metadata.etag;
        const date = new Date(ifRange);
        const dateMatch = !Number.isNaN(date.getTime()) && date.getTime() >= metadata.uploaded.getTime();
        useRange = etagMatch || dateMatch;
      }

      if (useRange) {
        const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
        if (!match || (!match[1] && !match[2])) return jsonResponse({ error: "不支持此字节范围请求。" }, 416, { "Content-Range": `bytes */${metadata.size}` });
        let start: number;
        let end: number;
        if (!match[1]) {
          const suffix = Number(match[2]);
          if (!Number.isSafeInteger(suffix) || suffix <= 0) return jsonResponse({ error: "字节范围超出文件大小。" }, 416, { "Content-Range": `bytes */${metadata.size}` });
          start = Math.max(0, metadata.size - suffix);
          end = metadata.size - 1;
          options.range = { suffix };
        } else {
          start = Number(match[1]);
          end = match[2] ? Number(match[2]) : metadata.size - 1;
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= metadata.size || end < start) {
            return jsonResponse({ error: "字节范围超出文件大小。" }, 416, { "Content-Range": `bytes */${metadata.size}` });
          }
          end = Math.min(end, metadata.size - 1);
          options.range = { offset: start, length: end - start + 1 };
        }
        rangeBounds = { start, end };
      }
    }

    const object = await bucket.get(path, options);
    if (!object) return jsonResponse({ error: "文件不存在。" }, 404);

    const responseHeaders = new Headers();
    object.writeHttpMetadata(responseHeaders);
    responseHeaders.set("ETag", object.httpEtag);
    responseHeaders.set("Last-Modified", object.uploaded.toUTCString());
    responseHeaders.set("Accept-Ranges", "bytes");
    const returnedLength = rangeBounds ? rangeBounds.end - rangeBounds.start + 1 : object.size;
    responseHeaders.set("Content-Length", String(returnedLength));
    responseHeaders.set("Cache-Control", path.startsWith("_$flaredrive$/thumbnails/")
      ? "public, max-age=31536000, immutable"
      : "private, no-store");

    if (!("body" in object) || !object.body) {
      const headers = new Headers(responseHeaders);
      const ifMatch = request.headers.get("If-Match");
      const ifUnmodifiedSince = request.headers.get("If-Unmodified-Since");
      const ifNoneMatch = request.headers.get("If-None-Match");
      const ifModifiedSince = request.headers.get("If-Modified-Since");
      const matchesTag = (header: string, weak: boolean) => header.trim() === "*" || header.split(",").some((tag) => {
        const candidate = weak ? tag.trim().replace(/^W\//i, "") : tag.trim();
        return candidate === object.httpEtag;
      });
      if ((ifMatch && !matchesTag(ifMatch, false))
        || (ifUnmodifiedSince && !Number.isNaN(Date.parse(ifUnmodifiedSince))
          && Date.parse(ifUnmodifiedSince) < object.uploaded.getTime())) {
        headers.delete("Content-Length");
        return new Response(null, { status: 412, headers });
      }
      if ((ifNoneMatch && matchesTag(ifNoneMatch, true))
        || (!ifNoneMatch && ifModifiedSince && !Number.isNaN(Date.parse(ifModifiedSince))
          && Date.parse(ifModifiedSince) >= object.uploaded.getTime())) {
        headers.delete("Content-Length");
        return new Response(null, { status: 304, headers });
      }
      return new Response(null, { status: 412, headers });
    }

    if (rangeBounds && object.range) {
      responseHeaders.set("Content-Range", `bytes ${rangeBounds.start}-${rangeBounds.end}/${object.size}`);
      return new Response(object.body, { status: 206, headers: responseHeaders });
    }

    return new Response(object.body, { headers: responseHeaders });
  } catch (error) {
    console.error("R2 file read failed", error);
    return jsonResponse({ error: "文件读取失败，请检查 R2 绑定或稍后重试。" }, 500);
  }
}

export async function onRequestHead(context) {
  return onRequestGet(context);
}
