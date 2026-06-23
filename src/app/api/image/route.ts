export const runtime = "edge";

const ALLOWED_ORIGIN_PREFIXES = [
  "https://i.scdn.co/image/",
  "https://image-cdn-ak.spotifycdn.com/image/",
] as const;

/** Browser/CDN cache for proxied cover art (Spotify URLs are stable). */
const CACHE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const STALE_WHILE_REVALIDATE_SECONDS = 60 * 60 * 24;

const FORWARDED_UPSTREAM_HEADERS = [
  "content-type",
  "content-length",
  "etag",
  "last-modified",
] as const;

function buildProxyResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();

  for (const name of FORWARDED_UPSTREAM_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }

  headers.set(
    "Cache-Control",
    `public, max-age=${CACHE_MAX_AGE_SECONDS}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}, immutable`,
  );

  return headers;
}

async function GET(request: Request) {
  const urlParam = new URL(request.url).searchParams.get("url");
  if (!urlParam) {
    return new Response("No URL provided", { status: 400 });
  }

  if (!ALLOWED_ORIGIN_PREFIXES.some((prefix) => urlParam.startsWith(prefix))) {
    return new Response("Not allowed origin", { status: 403 });
  }

  const upstream = await fetch(urlParam);
  if (!upstream.ok) {
    return new Response("Failed to fetch image", {
      status: upstream.status === 404 ? 404 : 502,
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: buildProxyResponseHeaders(upstream),
  });
}

export { GET };
