export const VERCEL_TRPC_MOUNT_PATH = "/api/trpc";

/**
 * Vercel passes the full function URL to the standalone tRPC adapter, while
 * tRPC expects only the procedure segment. Preserve the query string and
 * remove the serverless function mount path before dispatch.
 */
export function stripVercelTrpcMountPath(url: string | undefined) {
  const safeUrl = url ?? "/";
  const [pathname, query = ""] = safeUrl.split("?", 2);
  const procedurePath =
    pathname === VERCEL_TRPC_MOUNT_PATH
      ? "/"
      : pathname.startsWith(`${VERCEL_TRPC_MOUNT_PATH}/`)
        ? pathname.slice(VERCEL_TRPC_MOUNT_PATH.length)
        : pathname;

  return query ? `${procedurePath}?${query}` : procedurePath;
}
