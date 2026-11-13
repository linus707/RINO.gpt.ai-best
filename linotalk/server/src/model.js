// Claude API 호출. API 키는 서버의 비밀값(env.ANTHROPIC_API_KEY)에서만 읽습니다.

import Anthropic from "@anthropic-ai/sdk";
import { errors } from "./http.js";

export const DEFAULT_MODEL = "claude-haiku-5-5";

/**
 * 모델을 부르는 함수를 만듭니다.
 * 돌려주는 함수: ({ system, user, schema, maxTokens }) → 모델이 만든 JSON 객체
 * 실패하면 ApiError를 던집니다.
 */
export function createModelCaller(env) {
  if (!env.ANTHROPIC_API_KEY) {
    return async () => {
      throw errors.misconfigured();
    };
  }

  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    timeout: 8_000, // 밀리초. 키보드는 오래 기다릴 수 없어서 짧게 잡습니다.
    maxRetries: 0, // 재시도는 app.js에서 "형식이 깨졌을 때 1회"만 직접 합니다.
  });

  return async ({ system, user, schema, maxTokens }) => {
    let response;
    try {
      response = await client.messages.create({
        model: env.MODEL || DEFAULT_MODEL,
        max_tokens: maxTokens,
        // 짧은 번역은 빠른 응답이 중요해서 "생각하기"를 끄고 노력 수준을 낮춥니다.
        thinking: { type: "disabled" },
        output_config: {
          effort: "low",
          // 모델이 반드시 이 JSON 형식으로만 답하게 합니다.
          format: { type: "json_schema", schema },
        },
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: user }],
      });
    } catch (error) {
      // 주의: 오류 내용에 사용자 입력이 섞일 수 있으므로 메시지는 로그에 남기지 않습니다.
      if (error instanceof Anthropic.APIConnectionTimeoutError) throw errors.timeout();
      if (error instanceof Anthropic.APIError) {
        console.log(JSON.stringify({ event: "upstream_error", status: error.status ?? null }));
      }
      throw errors.upstreamError();
    }

    if (response.stop_reason === "refusal") throw errors.refused();
    if (response.stop_reason === "max_tokens") throw errors.schemaError();

    const block = response.content.find((b) => b.type === "text");
    try {
      return JSON.parse(block.text);
    } catch {
      throw errors.schemaError();
    }
  };
}
