// One Redis counter of page views, in the Upstash Redis that Vercel's storage
// integration provides, reached through its REST API — so the repo keeps its
// no-dependencies rule. A missing environment, a bot, or a Redis hiccup all
// answer the same quiet way: { views: null }, and the header pill stays hidden.
const KEY = 'hk-tolls:views';

const BOT = /bot|crawl|spider|slurp|bing|google|baidu|yandex|duckduck|facebookexternal|preview|monitor/i;

export const isBot = (userAgent) => BOT.test(userAgent ?? '');

const redisEnv = () => ({
  url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'method not allowed' });
  }
  if (isBot(request.headers?.['user-agent'])) {
    return response.status(200).json({ views: null });
  }
  const { url, token } = redisEnv();
  if (!url || !token) return response.status(200).json({ views: null });
  try {
    const result = await fetch(`${url}/incr/${KEY}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await result.json();
    return response.status(200).json({ views: typeof data.result === 'number' ? data.result : null });
  } catch {
    return response.status(200).json({ views: null });
  }
}
