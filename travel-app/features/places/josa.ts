/** 받침에 맞는 조사 — josa('도톤보리', '을', '를') → '도톤보리를' */
export function josa(word: string, withFinal: string, withoutFinal: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
  return word + (hasFinal ? withFinal : withoutFinal);
}
