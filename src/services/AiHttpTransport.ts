import { invoke } from '@tauri-apps/api/core';

export type AiTransport = (url: string, init: RequestInit) => Promise<Response>;
type NativeInvoke = (command: string, args: Record<string, unknown>) => Promise<unknown>;

/** Use the scoped HTTP plugin without eager reads or unhandled cleanup promises. */
export function createAiTransport(native: NativeInvoke = invoke): AiTransport {
  return async (url, init) => {
    const signal = init.signal;
    signal?.throwIfAborted();
    let requestRid: number | undefined;
    let bodyRid: number | undefined;
    let cancelled = false;
    let finished = false;
    const detach = () => signal?.removeEventListener('abort', onAbort);
    const closeBody = async () => {
      const rid = bodyRid;
      bodyRid = undefined;
      if (rid !== undefined) {
        try { await native('plugin:http|fetch_cancel_body', { rid }); }
        catch (error) {
          // EOF can win the race with cancellation on the native side.
          if (!/resource id .*invalid/i.test(String(error))) throw error;
        }
      }
    };
    const onAbort = () => {
      cancelled = true;
      const cleanup = bodyRid !== undefined ? closeBody()
        : requestRid !== undefined ? native('plugin:http|fetch_cancel', { rid: requestRid }) : Promise.resolve();
      void cleanup.catch(() => undefined);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      requestRid = await native('plugin:http|fetch', {
        clientConfig: {
          method: init.method || 'POST', url,
          headers: [...new Headers(init.headers).entries()],
          data: typeof init.body === 'string' ? Array.from(new TextEncoder().encode(init.body)) : null,
        },
      }) as number;
      if (signal?.aborted) { onAbort(); signal.throwIfAborted(); }
      const response = await native('plugin:http|fetch_send', { rid: requestRid }) as {
        rid: number; status: number; statusText: string; headers: [string, string][];
      };
      requestRid = undefined;
      bodyRid = response.rid;
      if (signal?.aborted) { await closeBody(); signal.throwIfAborted(); }
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          if (cancelled || finished || bodyRid === undefined) return;
          try {
            const data = new Uint8Array(await native('plugin:http|fetch_read_body', { rid: bodyRid }) as ArrayBuffer);
            if (cancelled || finished) return;
            if (data[data.length - 1] === 1) {
              // Native EOF already removed the resource. Do not close it again.
              bodyRid = undefined;
              finished = true;
              detach();
              controller.close();
            } else {
              controller.enqueue(data.slice(0, -1));
            }
          } catch (error) {
            if (!cancelled && !finished) {
              finished = true;
              controller.error(error);
            }
            detach();
            await closeBody().catch(() => undefined);
          }
        },
        async cancel() {
          cancelled = true;
          detach();
          await closeBody();
        },
      }, { highWaterMark: 0 }); // No native read races ahead of the parser's done frame.
      if ([101, 103, 204, 205, 304].includes(response.status)) {
        await body.cancel();
        return new Response(null, { status: response.status, headers: response.headers });
      }
      return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
    } catch (error) {
      detach();
      await closeBody().catch(() => undefined);
      if (signal?.aborted) throw signal.reason;
      throw error;
    }
  };
}

/** Route production AI calls through Rust so release builds use compile-time credentials. */
export function createRustAiTransport(native: NativeInvoke = invoke): AiTransport {
  return async (_url, init) => {
    init.signal?.throwIfAborted();
    const body = JSON.parse(String(init.body || '{}')) as {
      system?: string; prompt?: string; model?: string; think?: boolean;
    };
    const pending = native('generate_ia_response', {
      system: body.system || '',
      prompt: body.prompt || '',
      model: body.model || 'qwen3.8:latest',
      think: body.think ?? false,
    });
    const text = await new Promise<string>((resolve, reject) => {
      const abort = () => reject(init.signal?.reason || new DOMException('Operação cancelada.', 'AbortError'));
      init.signal?.addEventListener('abort', abort, { once: true });
      pending.then(value => resolve(String(value)), reject)
        .finally(() => init.signal?.removeEventListener('abort', abort));
    });
    return new Response(text, { headers: { 'content-type': 'application/json' } });
  };
}

export const fetchAi = createRustAiTransport();
