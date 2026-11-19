const TYPES: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
  webp: "image/webp", avif: "image/avif", bmp: "image/bmp", svg: "image/svg+xml",
  heic: "image/heic", heif: "image/heif", mp4: "video/mp4", webm: "video/webm",
  mov: "video/quicktime", pdf: "application/pdf",
};

// Old uploads used axios' form default. Recover known media types without rewriting R2 objects.
export function fileContentType(key: string, storedType = ""): string {
  const type = storedType.split(";")[0].trim().toLowerCase();
  if (type && !["application/x-www-form-urlencoded", "application/octet-stream"].includes(type)) return type;
  return TYPES[key.split(".").pop()?.toLowerCase() || ""] || type || "application/octet-stream";
}
