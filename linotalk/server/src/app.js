// 요청을 받아 처리하는 본체.
// callModel(모델을 부르는 함수)을 바깥에서 받기 때문에, 테스트에서는 가짜 모델로 바꿔 끼울 수 있습니다.

import { requireAppToken } from "./auth.js";
import { ApiError, errorResponse, errors, json, readJson } from "./http.js";
import {
  chatSystem, chatUserMessage, TRANSLATE_SYSTEM, translateUserMessage,
} from "./prompts.js";
import { enforceRateLimit } from "./ratelimit.js";
import {
  CHAT_OUTPUT_SCHEMA, checkChatOutput, checkTranslateOutput,
  parseChatRequest, parseTranslateRequest, TRANSLATE_OUTPUT_SCHEMA,
} from "./schema.js";

/**
 * 모델을 부르고 결과 형식을 검사합니다. 형식이 깨졌으면 딱 1번만 다시 시도합니다.
 * check: 모델 출력 → 정리된 결과(또는 형식이 틀리면 null)
 */
async function callWithSchemaRetry(callModel, request, check) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const checked = check(await callModel(request));
      if (checked !== null) return { value: checked, attempts: attempt };
    } catch (error) {
      // 형식 오류만 재시도합니다. 시간 초과·거절·서버 오류는 바로 알립니다.
      if (!(error instanceof ApiError) || error.code !== "schema_error") throw error;
    }
  }
  throw errors.schemaError();
}

async function handleTranslate(body, callModel, log) {
  const input = parseTranslateRequest(body);
  log.chars = [...input.text].length;
  log.targets = input.targets.join("+");

  const { value: results, attempts } = await callWithSchemaRetry(
    callModel,
    {
      system: TRANSLATE_SYSTEM,
      user: translateUserMessage(input),
      schema: TRANSLATE_OUTPUT_SCHEMA,
      maxTokens: 2000,
    },
    (output) => checkTranslateOutput(output, input.targets),
  );
  log.attempts = attempts;

  // source는 모델이 아니라 서버가 직접 채웁니다 (모델이 원문을 바꿔 적는 것 방지).
  return { source: input.text, results };
}

async function handleChat(body, callModel, log) {
  const input = parseChatRequest(body);
  log.lang = input.lang;
  log.turns = input.history.length;
  log.chars = input.history.reduce((sum, turn) => sum + [...turn.text].length, 0);

  const isOpening = input.history.length === 0;
  const { value, attempts } = await callWithSchemaRetry(
    callModel,
    {
      system: chatSystem(input),
      user: chatUserMessage(input),
      schema: CHAT_OUTPUT_SCHEMA,
      maxTokens: 1500,
    },
    (output) => checkChatOutput(output, { isOpening }),
  );
  log.attempts = attempts;
  return value;
}

const ROUTES = { "/translate": handleTranslate, "/chat": handleChat };

export function createApp({ callModelFor, now = () => Date.now(), writeLog = (entry) => console.log(JSON.stringify(entry)) }) {
  return {
    async fetch(request, env) {
      const started = now();
      const { pathname } = new URL(request.url);
      // 로그에는 입력 내용을 절대 넣지 않습니다. 길이·언어·걸린 시간·결과 코드만 남깁니다.
      const log = { path: pathname };
      let response;

      try {
        if (pathname === "/health") {
          if (request.method !== "GET") throw errors.methodNotAllowed();
          return json({ ok: true });
        }
        const handler = ROUTES[pathname];
        if (!handler) throw errors.notFound();
        if (request.method !== "POST") throw errors.methodNotAllowed();

        await requireAppToken(request, env);
        await enforceRateLimit(request, env, now());

        const body = await readJson(request);
        response = json(await handler(body, callModelFor(env), log));
      } catch (error) {
        const apiError = error instanceof ApiError ? error : errors.upstreamError();
        log.error = apiError.code;
        response = errorResponse(apiError);
      }

      log.status = response.status;
      log.ms = now() - started;
      writeLog(log);
      return response;
    },
  };
}
