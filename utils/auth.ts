const THUMBNAIL_PREFIX = "_$flaredrive$/thumbnails/";
const SESSION_COOKIE = "flaredrive_session";
const SESSION_SECONDS = 8 * 60 * 60;

export type AuthContext = {
  request: Request;
  env: Record<string, unknown>;
};

type Identity = { username: string; allowList: string[] };
type Account = Identity & { password: string };

function parseAllowList(value: unknown): string[] {
  const entries = Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : typeof value === "string" ? value.split(",") : [];

  return entries
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (entry === "*") return entry;
      const path = entry.replace(/^\/+|\/+$/g, "");
      return path ? `${path}/` : "";
    })
    .filter(Boolean);
}

function legacyAccounts(context: AuthContext): Account[] {
  return Object.entries(context.env)
    .filter(([key, value]) => key.indexOf(":") > 0 && typeof value === "string")
    .map(([key, value]) => {
      const separator = key.indexOf(":");
      return {
        username: key.slice(0, separator),
        password: key.slice(separator + 1),
        allowList: parseAllowList(value),
      };
    })
    .filter((account) => account.username && account.password && account.allowList.length > 0);
}

function configuredAccounts(context: AuthContext): Account[] {
  const accounts = new Map(legacyAccounts(context).map((account) => [account.username, account]));
  const configured = context.env.FLAREDRIVE_USERS;
  if (typeof configured === "string" || (configured && typeof configured === "object")) {
    try {
      const parsed = typeof configured === "string" ? JSON.parse(configured) : configured;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [username, value] of Object.entries(parsed)) {
          if (!username || !value || typeof value !== "object" || Array.isArray(value)) continue;
          const account = value as { password?: unknown; allowList?: unknown };
          const allowList = parseAllowList(account.allowList);
          if (typeof account.password === "string" && account.password.length > 0 && allowList.length > 0) {
            accounts.set(username, { username, password: account.password, allowList });
          }
        }
      }
    } catch { /* Invalid user configuration fails closed. */ }
  }
  return [...accounts.values()].sort((left, right) => left.username.localeCompare(right.username));
}

export function has_access_configuration(context: AuthContext): boolean {
  return configuredAccounts(context).length > 0 || parseAllowList(context.env.GUEST).length > 0;
}

function secretsEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let diff = leftBytes.length ^ rightBytes.length;
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < maxLength; index++) diff |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  return diff === 0;
}

export function authenticate_account(context: AuthContext, username: string, password: string): Identity | null {
  const account = configuredAccounts(context).find((candidate) => candidate.username === username && secretsEqual(candidate.password, password));
  return account ? { username: account.username, allowList: account.allowList } : null;
}

function encodeBase64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "=")), (char) => char.charCodeAt(0));
}

async function sessionKey(context: AuthContext): Promise<CryptoKey> {
  // Rotating an account or its permissions invalidates existing sessions.
  const material = new TextEncoder().encode(JSON.stringify({
    accounts: configuredAccounts(context),
    guest: parseAllowList(context.env.GUEST),
  }));
  const digest = await crypto.subtle.digest("SHA-256", material);
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function sessionData(context: AuthContext): Uint8Array {
  return new TextEncoder().encode(`flaredrive-session-v1:${new URL(context.request.url).origin}`);
}

function cookieAttributes(context: AuthContext, maxAge: number): string {
  const secure = new URL(context.request.url).protocol === "https:" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export async function create_session_cookie(context: AuthContext, username: string, password: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = new TextEncoder().encode(JSON.stringify({ username, password, expires: Date.now() + SESSION_SECONDS * 1000 }));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: sessionData(context) }, await sessionKey(context), payload,
  );
  return `${SESSION_COOKIE}=${encodeBase64(iv)}.${encodeBase64(new Uint8Array(encrypted))}; ${cookieAttributes(context, SESSION_SECONDS)}`;
}

export function clear_session_cookie(context: AuthContext): string {
  return `${SESSION_COOKIE}=; ${cookieAttributes(context, 0)}`;
}

export async function get_identity(context: AuthContext): Promise<Identity | null> {
  const authorization = context.request.headers.get("Authorization");
  if (authorization && /^Basic\s+/i.test(authorization)) {
    try {
      const bytes = decodeBase64(authorization.replace(/^Basic\s+/i, ""));
      let account: string;
      try { account = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); }
      catch { account = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""); }
      const separator = account.indexOf(":");
      if (separator > 0) {
        const identity = authenticate_account(context, account.slice(0, separator), account.slice(separator + 1));
        if (identity) return identity;
      }
    } catch { /* An invalid Basic header does not shadow a valid session cookie. */ }
  }

  const cookie = (context.request.headers.get("Cookie") || "").split(";")
    .map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (cookie) {
    try {
      const [iv, ciphertext] = cookie.slice(SESSION_COOKIE.length + 1).split(".");
      const payload = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: decodeBase64(iv), additionalData: sessionData(context) },
        await sessionKey(context), decodeBase64(ciphertext),
      );
      const session = JSON.parse(new TextDecoder().decode(payload));
      if (typeof session.username === "string" && typeof session.password === "string"
        && typeof session.expires === "number" && session.expires > Date.now()) {
        const identity = authenticate_account(context, session.username, session.password);
        if (identity) return identity;
      }
    } catch { /* Expired or invalid cookies fall back to the configured guest account. */ }
  }

  const allowList = parseAllowList(context.env.GUEST);
  return allowList.length ? { username: "", allowList } : null;
}

export async function get_allow_list(context: AuthContext): Promise<string[] | null> {
  return (await get_identity(context))?.allowList || null;
}

export async function can_access_path(context: AuthContext, targetPath: string): Promise<boolean> {
  const allowList = await get_allow_list(context);
  if (!allowList) return false;
  if (targetPath.startsWith(THUMBNAIL_PREFIX)) return true;
  return allowList.includes("*") || allowList.some((allow) => targetPath.startsWith(allow));
}

export async function can_write_path(context: AuthContext, targetPath: string): Promise<boolean> {
  const allowList = await get_allow_list(context);
  return !!allowList && (allowList.includes("*") || allowList.some((allow) => targetPath.startsWith(allow)));
}

export async function get_auth_status(context: AuthContext): Promise<boolean> {
  const pathname = new URL(context.request.url).pathname;
  const route = "/api/write/items/";
  if (!pathname.startsWith(route)) return false;
  try {
    const target = decodeURIComponent(pathname.slice(route.length));
    return !!target && await can_write_path(context, target);
  } catch { return false; }
}
