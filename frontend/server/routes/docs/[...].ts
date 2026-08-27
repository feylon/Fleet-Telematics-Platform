import { defineEventHandler, proxyRequest } from 'h3';

export default defineEventHandler((event) => {
  const target = useRuntimeConfig().apiProxyTarget;
  return proxyRequest(event, `${target}${event.path}`);
});
