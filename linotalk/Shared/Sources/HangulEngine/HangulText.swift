// 한글 문자열을 다루는 작은 도구들.

public enum HangulText {
    /// 문자열에 한글(완성형 음절 또는 낱자모)이 하나라도 있는지.
    /// 키보드가 "번역할 만한 입력인지" 판단할 때 씁니다.
    public static func containsHangul(_ text: String) -> Bool {
        text.unicodeScalars.contains { scalar in
            (0xAC00...0xD7A3).contains(scalar.value)      // 가 ~ 힣
                || (0x3131...0x318E).contains(scalar.value) // ㄱ ~ ㆎ (호환 자모)
        }
    }

    /// 한글 음절을 두벌식 키 순서로 풀어 줍니다. 한글이 아닌 글자는 그대로 둡니다.
    /// 예: "닭이" → "ㄷㅏㄹㄱㅇㅣ"
    public static func keystrokes(for text: String) -> String {
        var result = ""
        for character in text {
            guard let scalar = character.unicodeScalars.first,
                  character.unicodeScalars.count == 1,
                  (0xAC00...0xD7A3).contains(scalar.value) else {
                result.append(character)
                continue
            }
            let offset = Int(scalar.value) - 0xAC00
            let initial = HangulTables.initials[offset / (21 * 28)]
            let medial = HangulTables.medials[(offset / 28) % 21]
            let finalNumber = offset % 28

            result.append(initial)
            result.append(split(medial, using: HangulTables.compoundVowels))
            if finalNumber > 0 {
                result.append(split(HangulTables.finals[finalNumber - 1], using: HangulTables.compoundFinals))
            }
        }
        return result
    }

    /// 겹모음·겹받침을 원래 누른 키 두 개로 되돌립니다. 겹글자가 아니면 그대로.
    private static func split(_ jamo: Character, using table: [String: Character]) -> String {
        table.first { $0.value == jamo }?.key ?? String(jamo)
    }
}
