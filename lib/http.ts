interface SuccessData<T> {
  success: true;
  data: T;
  error: undefined;
}

interface ErrorData {
  success: false;
  data: undefined;
  error: unknown;
}

function wfetch(url: RequestInfo | URL, init?: RequestInit) {
  let _error: unknown;
  let _request: Promise<Response>;
  let _done: Response | undefined;

  return {
    async _resolve() {
      if (_error) return this;
      if (!_request) {
        _error = new Error("request not initialised");
        return this;
      }

      try {
        const response = await _request;
        if (response.status >= 400) {
          _error = new Error(
            `Request failed with Error ${response.status} Code: ${response.statusText}`
          );

          return this;
        }
        _done = response;
        return this;
      } catch (error) {
        _error = error;
        return this;
      }
    },
    get() {
      _request = fetch(url, {
        method: "GET",
        ...init,
      });
      return this;
    },
    async json<T>(): Promise<SuccessData<T> | ErrorData> {
      await this._resolve();
      if (_error || !_done) {
        return {
          success: false,
          data: undefined,
          error: _error,
        };
      }

      try {
        const data = (await _done.json()) as T;

        return {
          success: true,
          data,
          error: undefined,
        };
      } catch (error) {
        return {
          success: false,
          data: undefined,
          error,
        };
      }
    },
  };
}

export default wfetch;
