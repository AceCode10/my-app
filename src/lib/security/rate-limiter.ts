/**
 * Rate Limiter
 * API protection and abuse prevention
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  api: { windowMs: 60000, maxRequests: 100 },
  auth: { windowMs: 900000, maxRequests: 10 },
  upload: { windowMs: 3600000, maxRequests: 20 },
  message: { windowMs: 60000, maxRequests: 30 },
  search: { windowMs: 60000, maxRequests: 50 },
};

export class RateLimiter {
  private config: RateLimitConfig;
  private prefix: string;

  constructor(type: keyof typeof DEFAULT_CONFIGS = 'api', customConfig?: Partial<RateLimitConfig>) {
    this.config = { ...DEFAULT_CONFIGS[type], ...customConfig };
    this.prefix = type;
  }

  /**
   * Check if request should be rate limited
   */
  check(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
    const key = `${this.prefix}:${identifier}`;
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    
    if (!entry || now >= entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + this.config.windowMs
      };
    }
    
    entry.count++;
    rateLimitStore.set(key, entry);
    
    const allowed = entry.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - entry.count);
    const resetIn = Math.max(0, entry.resetAt - now);
    
    return { allowed, remaining, resetIn };
  }

  /**
   * Get rate limit headers for response
   */
  getHeaders(identifier: string): Record<string, string> {
    const { remaining, resetIn } = this.check(identifier);
    return {
      'X-RateLimit-Limit': String(this.config.maxRequests),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000))
    };
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    const key = `${this.prefix}:${identifier}`;
    rateLimitStore.delete(key);
  }

  /**
   * Clean up expired entries
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now >= entry.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }
}

// Run cleanup periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => RateLimiter.cleanup(), 60000);
}

// Pre-configured limiters
export const apiLimiter = new RateLimiter('api');
export const authLimiter = new RateLimiter('auth');
export const uploadLimiter = new RateLimiter('upload');
export const messageLimiter = new RateLimiter('message');
export const searchLimiter = new RateLimiter('search');

/**
 * Rate limit middleware for API routes
 */
export function withRateLimit(
  handler: (req: Request) => Promise<Response>,
  limiterType: keyof typeof DEFAULT_CONFIGS = 'api'
): (req: Request) => Promise<Response> {
  const limiter = new RateLimiter(limiterType);
  
  return async (req: Request) => {
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    const { allowed, remaining, resetIn } = limiter.check(ip);
    
    if (!allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests', 
          retryAfter: Math.ceil(resetIn / 1000) 
        }),
        { 
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(resetIn / 1000)),
            ...limiter.getHeaders(ip)
          }
        }
      );
    }
    
    const response = await handler(req);
    
    // Add rate limit headers to response
    const headers = new Headers(response.headers);
    const rateLimitHeaders = limiter.getHeaders(ip);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  };
}

/**
 * Check rate limit and throw if exceeded
 */
export function checkRateLimit(
  identifier: string,
  limiterType: keyof typeof DEFAULT_CONFIGS = 'api'
): void {
  const limiter = new RateLimiter(limiterType);
  const { allowed, resetIn } = limiter.check(identifier);
  
  if (!allowed) {
    const error = new Error('Rate limit exceeded') as Error & { retryAfter: number };
    error.retryAfter = Math.ceil(resetIn / 1000);
    throw error;
  }
}
