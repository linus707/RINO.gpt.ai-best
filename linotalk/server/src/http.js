// HTTP 응답을 만드는 작은 도구들.

/** 클라이언트에게 돌려줄 오류. code는 앱이 오류 종류를 구분하는 데 씁니다. */
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const errors = {
  unauthorized: () => new ApiError(401, "unauthorized", "인증에 실패했어요."),
  invalidInput: (detail) => new ApiError(400, "invalid_input", detail),
  notFound: () => new ApiError(404, "not_found", "없는 주소예요."),
  methodNotAllowed: () => new ApiError(405, "method_not_allowed", "지원하지 않는 요청 방식이에요."),
  rateLimited: () => new ApiError(429, "rate_limited", "요청이 너무 많아요. 잠시 후 다시 시도해 주세요."),
  refused: () => new ApiError(422, "refused", "이 내용은 처리할 수 없어요."),
  schemaError: () => new ApiError(502, "schema_error", "번역 결과 형식이 올바르지 않아요."),
  upstreamError: () => new ApiError(502, "upstream_error", "번역 서버에 문제가 생겼어요."),
  timeout: () => new ApiError(504, "timeout", "응답이 너무 오래 걸려요."),
  misconfigured: () => new ApiError(500, "server_misconfigured", "서버 설정이 끝나지 않았어요."),
};

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function errorResponse(error) {
  return json({ error: { code: error.code, message: error.message } }, error.status);
}

/** 요청 본문을 JSON으로 읽습니다. 너무 크거나 JSON이 아니면 400. */
export async function readJson(request, maxBytes = 16 * 1024) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > maxBytes) {
    throw errors.invalidInput("요청이 너무 커요.");
  }
  try {
    const body = JSON.parse(raw);
    if (body === null || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    throw errors.invalidInput("요청 본문이 올바른 JSON 객체가 아니에요.");
  }
}
