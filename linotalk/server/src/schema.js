// 요청과 응답의 형식 검사.
// - 요청 검사: 앱이 보낸 값이 규칙에 맞는지 (길이, 허용 값)
// - 응답 검사: 모델이 만든 JSON이 약속한 형식인지. 깨졌으면 앱에 보내지 않습니다.

import { errors } from "./http.js";
import { LEVEL_NAMES, SCENARIOS } from "./prompts.js";

export const MAX_TEXT_LENGTH = 200;
export const MAX_CANDIDATES = 3;
export const MAX_HISTORY_TURNS = 12;
export const MAX_TURN_LENGTH = 300;

const LANGS = ["en", "ja"];
const VERDICTS = ["ok", "caution", "wrong"];
const REGISTERS = ["casual", "neutral", "polite"];
const FLAGS = ["profanity", "sensitive"];

// 글자 수는 "사용자가 보는 글자" 기준으로 셉니다 (이모지·한글 1자 = 1).
const length = (s) => [...s].length;

const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] };

// ───────── 모델에게 강제하는 출력 형식 (JSON Schema) ─────────

export const TRANSLATE_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["results"],
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["target_lang", "candidates"],
        properties: {
          target_lang: { type: "string", enum: LANGS },
          candidates: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "text", "reading", "reading_kana", "sense", "back_translation",
                "confidence", "verdict", "note", "register", "flags",
              ],
              properties: {
                text: { type: "string" },
                reading: nullableString,
                reading_kana: nullableString,
                sense: nullableString,
                back_translation: { type: "string" },
                confidence: { type: "number" },
                verdict: { type: "string", enum: VERDICTS },
                note: nullableString,
                register: { type: "string", enum: REGISTERS },
                flags: { type: "array", items: { type: "string", enum: FLAGS } },
              },
            },
          },
        },
      },
    },
  },
};

export const CHAT_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "reply_reading", "reply_ko", "correction"],
  properties: {
    reply: { type: "string" },
    reply_reading: nullableString,
    reply_ko: { type: "string" },
    correction: {
      type: "object",
      additionalProperties: false,
      required: ["needed", "better", "explanation_ko"],
      properties: {
        needed: { type: "boolean" },
        better: nullableString,
        explanation_ko: nullableString,
      },
    },
  },
};

// ───────── 요청 검사 ─────────

function parseLevel(value) {
  if (value === undefined) return "beginner";
  if (typeof value !== "string" || !(value in LEVEL_NAMES)) {
    throw errors.invalidInput("level은 starter, beginner, intermediate 중 하나여야 해요.");
  }
  return value;
}

export function parseTranslateRequest(body) {
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length === 0) throw errors.invalidInput("text가 비어 있어요.");
  if (length(text) > MAX_TEXT_LENGTH) {
    throw errors.invalidInput(`text는 ${MAX_TEXT_LENGTH}자까지 보낼 수 있어요.`);
  }

  const targets = body.targets;
  if (
    !Array.isArray(targets) || targets.length === 0 || targets.length > LANGS.length ||
    !targets.every((t) => LANGS.includes(t)) || new Set(targets).size !== targets.length
  ) {
    throw errors.invalidInput('targets는 ["en"], ["ja"], ["en","ja"] 중 하나여야 해요.');
  }

  return { text, targets, level: parseLevel(body.level) };
}

export function parseChatRequest(body) {
  if (typeof body.scenario !== "string" || !Object.hasOwn(SCENARIOS, body.scenario)) {
    throw errors.invalidInput("scenario가 올바르지 않아요.");
  }
  if (!LANGS.includes(body.lang)) throw errors.invalidInput("lang은 en 또는 ja여야 해요.");

  const history = body.history ?? [];
  if (!Array.isArray(history) || history.length > MAX_HISTORY_TURNS) {
    throw errors.invalidInput(`history는 최근 ${MAX_HISTORY_TURNS}개까지 보낼 수 있어요.`);
  }
  const turns = history.map((turn) => {
    const ok =
      turn !== null && typeof turn === "object" &&
      (turn.role === "user" || turn.role === "assistant") &&
      typeof turn.text === "string" && turn.text.trim().length > 0 &&
      length(turn.text.trim()) <= MAX_TURN_LENGTH;
    if (!ok) {
      throw errors.invalidInput(`history의 각 항목은 role(user/assistant)과 ${MAX_TURN_LENGTH}자 이하의 text가 필요해요.`);
    }
    return { role: turn.role, text: turn.text.trim() };
  });
  if (turns.length > 0 && turns.at(-1).role !== "user") {
    throw errors.invalidInput("history의 마지막 항목은 사용자의 말이어야 해요.");
  }

  return { scenario: body.scenario, lang: body.lang, level: parseLevel(body.level), history: turns };
}

// ───────── 응답 검사 ─────────
// 형식이 맞으면 정리된 객체를, 아니면 null을 돌려줍니다.

const isText = (v, max) => typeof v === "string" && v.trim().length > 0 && length(v) <= max;
const isNullableText = (v, max) => v === null || (typeof v === "string" && length(v) <= max);
const clean = (v) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : null);

function checkCandidate(c) {
  const valid =
    c !== null && typeof c === "object" &&
    isText(c.text, 600) && !/[\r\n]/.test(c.text.trim()) &&
    isNullableText(c.reading, 1200) && isNullableText(c.reading_kana, 1200) &&
    isNullableText(c.sense, 60) &&
    isText(c.back_translation, 600) &&
    typeof c.confidence === "number" && c.confidence >= 0 && c.confidence <= 1 &&
    VERDICTS.includes(c.verdict) &&
    isNullableText(c.note, 300) &&
    REGISTERS.includes(c.register) &&
    Array.isArray(c.flags) && c.flags.every((f) => FLAGS.includes(f));
  if (!valid) return null;

  // 안전장치: 자신 없다고 해 놓고 "확실"이라고 표시한 경우 "주의"로 낮춥니다.
  const verdict = c.verdict === "ok" && c.confidence < 0.7 ? "caution" : c.verdict;

  return {
    text: c.text.trim(),
    reading: clean(c.reading),
    reading_kana: clean(c.reading_kana),
    sense: clean(c.sense),
    back_translation: c.back_translation.trim(),
    confidence: Math.round(c.confidence * 100) / 100,
    verdict,
    note: clean(c.note),
    register: c.register,
    flags: [...new Set(c.flags)],
  };
}

export function checkTranslateOutput(output, targets) {
  if (output === null || typeof output !== "object" || !Array.isArray(output.results)) return null;

  const results = [];
  for (const lang of targets) {
    // 요청한 언어가 정확히 한 번씩 있어야 합니다.
    const matches = output.results.filter((r) => r && r.target_lang === lang);
    if (matches.length !== 1 || !Array.isArray(matches[0].candidates)) return null;

    const candidates = matches[0].candidates.slice(0, MAX_CANDIDATES).map(checkCandidate);
    if (candidates.length === 0 || candidates.includes(null)) return null;
    results.push({ target_lang: lang, candidates });
  }
  return results;
}

export function checkChatOutput(output, { isOpening }) {
  const c = output?.correction;
  const valid =
    output !== null && typeof output === "object" &&
    isText(output.reply, 800) &&
    isNullableText(output.reply_reading, 1600) &&
    isText(output.reply_ko, 800) &&
    c !== null && typeof c === "object" &&
    typeof c.needed === "boolean" &&
    isNullableText(c.better, 600) && isNullableText(c.explanation_ko, 600);
  if (!valid) return null;

  // 교정이 필요하다고 했으면 교정문이 있어야 하고, 대화의 첫마디에는 교정이 없습니다.
  const needed = c.needed && !isOpening;
  if (needed && clean(c.better) === null) return null;

  return {
    reply: output.reply.trim(),
    reply_reading: clean(output.reply_reading),
    reply_ko: output.reply_ko.trim(),
    correction: {
      needed,
      better: needed ? clean(c.better) : null,
      explanation_ko: needed ? clean(c.explanation_ko) : null,
    },
  };
}
