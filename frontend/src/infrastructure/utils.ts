import type { ApiError, ApiResponse } from "../domain/utils";

export async function handleResponse<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(input, {
      credentials: "include",
      ...init,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        data: null,
        error: {
          status: res.status,
          detail: data?.detail || "Error desconocido",
        },
      };
    }

    return {
      data,
      error: null,
    };
  } catch {
    const error: ApiError = {
      status: 500,
      detail: "Error de red o inesperado",
    };

    return {
      data: null,
      error,
    };
  }
}
