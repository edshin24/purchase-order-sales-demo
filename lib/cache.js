const cache = new Map();

export function setCache(key, value) {
  cache.set(key, value);
}

export function getCache(key) {
  return cache.get(key);
}

export function clearCache(key) {
  cache.delete(key);
}