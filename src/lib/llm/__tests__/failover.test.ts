import { describe, expect, it, vi } from 'vitest';

import { FailoverLlmProvider } from '../index';
import {
  isProviderUnavailableError,
  isTransientLlmError,
  type CompleteOptions,
  type LlmProvider,
  type LlmResult,
} from '../provider';

/** An error shaped like the SDKs' — a status plus a message. */
function apiError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

function stubProvider(
  name: string,
  behaviour: { fail?: Error; failTimes?: number } = {},
): LlmProvider & { calls: number } {
  let remaining = behaviour.failTimes ?? (behaviour.fail ? Infinity : 0);

  const provider = {
    name,
    model: `${name}-model`,
    calls: 0,
    async complete<T>(): Promise<LlmResult<T>> {
      provider.calls += 1;
      if (behaviour.fail && remaining > 0) {
        remaining -= 1;
        throw behaviour.fail;
      }
      return {
        json: { ok: name } as T,
        usage: { inputTokens: 10, outputTokens: 5 },
        model: provider.model,
        provider: name,
      };
    },
    async vision<T>(): Promise<LlmResult<T>> {
      return provider.complete<T>();
    },
  };

  return provider;
}

const OPTS: CompleteOptions = { system: 's', user: 'u' };

describe('isProviderUnavailableError', () => {
  it('catches an empty Anthropic credit balance (a 400)', () => {
    const err = apiError(400, 'Your credit balance is too low to access the Anthropic API.');
    expect(isProviderUnavailableError(err)).toBe(true);
    // The bug this fixes: a 400 is not transient, so it used to throw.
    expect(isTransientLlmError(err)).toBe(false);
  });

  it('catches an exhausted OpenAI quota', () => {
    expect(
      isProviderUnavailableError(apiError(429, 'You exceeded your current quota, insufficient_quota')),
    ).toBe(true);
  });

  it('catches auth failures', () => {
    expect(isProviderUnavailableError(apiError(401, 'invalid x-api-key'))).toBe(true);
    expect(isProviderUnavailableError(apiError(403, 'Forbidden'))).toBe(true);
    expect(isProviderUnavailableError(apiError(402, 'Payment Required'))).toBe(true);
  });

  it('catches a key that was never configured', () => {
    expect(isProviderUnavailableError(new Error('ANTHROPIC_API_KEY is not set'))).toBe(true);
  });

  it('does not claim a malformed request', () => {
    expect(isProviderUnavailableError(apiError(400, 'messages: at least one message is required'))).toBe(
      false,
    );
  });

  it('catches a model this key cannot reach', () => {
    // The shape Anthropic returns for an unknown or unentitled model id. It is
    // not transient and not a caller bug, so without this it used to throw
    // instead of trying the other provider.
    const err = apiError(404, 'not_found_error: model: claude-sonnet-5');
    expect(isProviderUnavailableError(err)).toBe(true);
    expect(isTransientLlmError(err)).toBe(false);

    expect(
      isProviderUnavailableError(new Error('The model `gpt-4o` does not exist')),
    ).toBe(true);
  });

  it('does not claim a plain rate limit', () => {
    const err = apiError(429, 'Number of requests has exceeded your rate limit');
    expect(isProviderUnavailableError(err)).toBe(false);
    expect(isTransientLlmError(err)).toBe(true);
  });
});

describe('FailoverLlmProvider', () => {
  it('fails over on an empty credit balance instead of throwing', async () => {
    const primary = stubProvider('anthropic', {
      fail: apiError(400, 'Your credit balance is too low to access the Anthropic API.'),
    });
    const secondary = stubProvider('openai');

    const result = await new FailoverLlmProvider(primary, secondary).complete(OPTS);

    expect(result.provider).toBe('openai');
    // No wasted retry: a billing failure fails identically a second later.
    expect(primary.calls).toBe(1);
    expect(secondary.calls).toBe(1);
  });

  it('retries the primary once on a transient error before failing over', async () => {
    vi.useFakeTimers();
    const primary = stubProvider('anthropic', { fail: apiError(503, 'overloaded'), failTimes: 1 });
    const secondary = stubProvider('openai');

    const promise = new FailoverLlmProvider(primary, secondary).complete(OPTS);
    await vi.runAllTimersAsync();
    const result = await promise;
    vi.useRealTimers();

    expect(result.provider).toBe('anthropic');
    expect(primary.calls).toBe(2);
    expect(secondary.calls).toBe(0);
  });

  it('falls over when the primary keeps failing transiently', async () => {
    vi.useFakeTimers();
    const primary = stubProvider('anthropic', { fail: apiError(500, 'server error') });
    const secondary = stubProvider('openai');

    const promise = new FailoverLlmProvider(primary, secondary).complete(OPTS);
    await vi.runAllTimersAsync();
    const result = await promise;
    vi.useRealTimers();

    expect(result.provider).toBe('openai');
    expect(primary.calls).toBe(2);
  });

  it('throws a malformed request rather than paying twice for it', async () => {
    const primary = stubProvider('anthropic', {
      fail: apiError(400, 'messages: at least one message is required'),
    });
    const secondary = stubProvider('openai');

    await expect(new FailoverLlmProvider(primary, secondary).complete(OPTS)).rejects.toThrow(
      'at least one message',
    );
    expect(secondary.calls).toBe(0);
  });

  it('fails over when the primary cannot serve the model', async () => {
    const primary = stubProvider('anthropic', {
      fail: apiError(404, 'not_found_error: model: claude-sonnet-5'),
    });
    const secondary = stubProvider('openai');

    const result = await new FailoverLlmProvider(primary, secondary).complete(OPTS);

    expect(result.provider).toBe('openai');
    expect(secondary.calls).toBe(1);
    // Not retried on the primary: the model will not appear a second later.
    expect(primary.calls).toBe(1);
  });

  it('throws when there is no secondary to fall back to', async () => {
    const primary = stubProvider('anthropic', { fail: apiError(400, 'credit balance is too low') });

    await expect(new FailoverLlmProvider(primary).complete(OPTS)).rejects.toThrow('credit balance');
  });

  it('counts tokens across both providers', async () => {
    const primary = stubProvider('anthropic', { fail: apiError(401, 'invalid x-api-key') });
    const secondary = stubProvider('openai');

    const failover = new FailoverLlmProvider(primary, secondary);
    await failover.complete(OPTS);

    expect(failover.stats).toEqual({ calls: 1, inputTokens: 10, outputTokens: 5 });
  });
});
