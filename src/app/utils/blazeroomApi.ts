// Client for the blazeroom API (/api on the same origin), authenticated with our Matrix token.

export class ApiError extends Error {
  code: string;

  status: number;

  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export type ApiRequest = (path: string, method: string, jsonBody?: unknown) => Promise<Response>;

// Rejects with ApiError: the body's `error` as code (and `message`, if any), or 'network'.
export const createApiRequest =
  (
    getToken: () => string | null,
    fetchImpl: typeof fetch = (...args) => fetch(...args)
  ): ApiRequest =>
  async (path, method, jsonBody) => {
    const headers: Record<string, string> = { Authorization: `Bearer ${getToken() ?? ''}` };
    const init: RequestInit = { method, headers };
    if (jsonBody !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(jsonBody);
    }
    let res: Response;
    try {
      res = await fetchImpl(path, init);
    } catch {
      throw new ApiError('network', 0);
    }
    if (!res.ok) {
      let body: { error?: unknown; message?: unknown } = {};
      try {
        body = await res.json();
      } catch {
        // non-JSON or empty error body
      }
      throw new ApiError(
        typeof body.error === 'string' ? body.error : 'unknown',
        res.status,
        typeof body.message === 'string' ? body.message : undefined
      );
    }
    return res;
  };
