// Simple in-memory rate limiter for Cloudflare Workers / Pages Functions
const limits = new Map();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 5; // 5 emails per hour per IP

export function rateLimit(ip) {
  const now = Date.now();
  const entry = limits.get(ip);

  if (!entry || now > entry.resetAt) {
    limits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count };
}

// Clean up happens naturally — entries expire and get overwritten