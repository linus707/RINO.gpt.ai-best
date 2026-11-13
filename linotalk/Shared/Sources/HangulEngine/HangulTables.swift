// 한글 조합에 쓰는 표 모음.
// 유니코드 한글 음절 = 0xAC00 + (초성 번호 × 21 + 중성 번호) × 28 + 종성 번호

enum HangulTables {
    /// 초성 19개 (유니코드 순서)
    static let initials: [Character] = [
        "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
        "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
    ]

    /// 중성 21개 (유니코드 순서)
    static let medials: [Character] = [
        "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ",
        "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ",
    ]

    /// 종성 27개 (유니코드 순서, 번호는 1부터. 0은 "받침 없음")
    static let finals: [Character] = [
        "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ",
        "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
    ]

    /// 겹모음: 자판으로 두 번 눌러 만드는 모음 (예: ㅗ + ㅏ = ㅘ)
    static let compoundVowels: [String: Character] = [
        "ㅗㅏ": "ㅘ", "ㅗㅐ": "ㅙ", "ㅗㅣ": "ㅚ",
        "ㅜㅓ": "ㅝ", "ㅜㅔ": "ㅞ", "ㅜㅣ": "ㅟ",
        "ㅡㅣ": "ㅢ",
    ]

    /// 겹받침: 자판으로 두 번 눌러 만드는 받침 (예: ㄹ + ㄱ = ㄺ)
    static let compoundFinals: [String: Character] = [
        "ㄱㅅ": "ㄳ", "ㄴㅈ": "ㄵ", "ㄴㅎ": "ㄶ",
        "ㄹㄱ": "ㄺ", "ㄹㅁ": "ㄻ", "ㄹㅂ": "ㄼ", "ㄹㅅ": "ㄽ",
        "ㄹㅌ": "ㄾ", "ㄹㅍ": "ㄿ", "ㄹㅎ": "ㅀ",
        "ㅂㅅ": "ㅄ",
    ]

    static let initialIndex: [Character: Int] = index(of: initials)
    static let medialIndex: [Character: Int] = index(of: medials)
    /// 종성 번호 (1부터 시작)
    static let finalIndex: [Character: Int] = index(of: finals).mapValues { $0 + 1 }

    private static func index(of list: [Character]) -> [Character: Int] {
        var result: [Character: Int] = [:]
        for (offset, jamo) in list.enumerated() { result[jamo] = offset }
        return result
    }

    static func isConsonant(_ c: Character) -> Bool { initialIndex[c] != nil }
    static func isVowel(_ c: Character) -> Bool { medialIndex[c] != nil }
}
