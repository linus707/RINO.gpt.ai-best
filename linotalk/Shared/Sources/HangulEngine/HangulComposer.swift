// 두벌식 한글 조합 오토마타.
//
// 사용법 (키보드 쪽에서):
//   var composer = HangulComposer()
//   let edit = composer.input("ㅇ")   // 자모 키를 누를 때마다 호출
//   → edit.deleteCount 만큼 deleteBackward() 한 뒤 edit.insert 를 insertText()
//
// 이 파일은 UI·네트워크를 전혀 모르는 순수 로직입니다. 그래서 Xcode 없이도 테스트할 수 있습니다.

/// 입력창에 반영할 변경 사항. "커서 앞 글자를 몇 개 지우고, 무엇을 넣을지"를 뜻합니다.
public struct TextEdit: Equatable, Sendable {
    /// 커서 앞에서 지울 글자 수
    public let deleteCount: Int
    /// 지운 뒤 넣을 문자열
    public let insert: String

    public init(deleteCount: Int, insert: String) {
        self.deleteCount = deleteCount
        self.insert = insert
    }

    /// 아무것도 바꾸지 않는 편집
    public var isEmpty: Bool { deleteCount == 0 && insert.isEmpty }
}

public struct HangulComposer: Sendable {
    // 조합 중인 글자 하나를 "누른 키" 단위로 기억합니다.
    // 이렇게 해 두면 삭제할 때 마지막에 누른 키 하나만 되돌리기 쉽습니다.
    private var initial: Character?      // 초성 (예: ㄷ)
    private var vowelKeys: [Character] = []   // 중성을 만든 키 1~2개 (예: ㅗ, ㅏ → ㅘ)
    private var finalKeys: [Character] = []   // 종성을 만든 키 1~2개 (예: ㄹ, ㄱ → ㄺ)

    public init() {}

    /// 지금 조합 중인 글자 (없으면 빈 문자열). 예: "ㄷ", "다", "닭"
    public var composingText: String { Self.render(initial, vowelKeys, finalKeys) }

    /// 조합 중인 글자가 있는지
    public var isComposing: Bool { initial != nil || !vowelKeys.isEmpty }

    // MARK: - 입력

    /// 키 하나를 입력합니다. 한글 자모가 아니면 조합을 끝내고 그 글자를 그대로 넣습니다.
    public mutating func input(_ key: Character) -> TextEdit {
        let before = composingText
        var committed = ""   // 이번 입력으로 조합이 끝나 확정된 글자들

        if HangulTables.isConsonant(key) {
            inputConsonant(key, committed: &committed)
        } else if HangulTables.isVowel(key) {
            inputVowel(key, committed: &committed)
        } else {
            // 띄어쓰기, 숫자, 영문, 기호 등: 조합을 끝내고 그대로 입력
            committed = before + String(key)
            reset()
        }
        return Self.makeEdit(from: before, to: committed + composingText)
    }

    private mutating func inputConsonant(_ key: Character, committed: inout String) {
        // 초성+중성이 있고 받침 자리가 비었거나 겹받침이 가능한 경우에만 받침으로 붙습니다.
        if initial != nil, !vowelKeys.isEmpty {
            if finalKeys.isEmpty, HangulTables.finalIndex[key] != nil {
                finalKeys = [key]          // 가 + ㄱ → 각
                return
            }
            if finalKeys.count == 1,
               HangulTables.compoundFinals[String(finalKeys[0]) + String(key)] != nil {
                finalKeys.append(key)      // 달 + ㄱ → 닭
                return
            }
        }
        // 그 외에는 지금 글자를 확정하고 새 글자의 초성으로 시작합니다.
        committed = composingText
        reset()
        initial = key
    }

    private mutating func inputVowel(_ key: Character, committed: inout String) {
        // 받침이 있는데 모음이 오면, 마지막 받침이 다음 글자의 초성으로 넘어갑니다.
        // 예: 각 + ㅏ → 가 + 가,  닭 + ㅣ → 달 + 기
        if let moved = finalKeys.popLast() {
            committed = composingText
            reset()
            initial = moved
            vowelKeys = [key]
            return
        }
        // 모음이 하나 있고 겹모음이 되는 조합이면 합칩니다. 예: ㅗ + ㅏ → ㅘ
        if vowelKeys.count == 1,
           HangulTables.compoundVowels[String(vowelKeys[0]) + String(key)] != nil {
            vowelKeys.append(key)
            return
        }
        // 초성만 있으면 모음을 붙입니다. 예: ㄱ + ㅏ → 가
        if initial != nil, vowelKeys.isEmpty {
            vowelKeys = [key]
            return
        }
        // 그 외(이미 모음이 있어 더 못 합침, 또는 아무것도 없음): 확정하고 모음만 새로 시작
        committed = composingText
        reset()
        vowelKeys = [key]
    }

    // MARK: - 삭제

    /// 마지막에 누른 자모 하나를 되돌립니다.
    /// 조합 중인 글자가 없으면 nil을 돌려줍니다 → 호출한 쪽에서 평소처럼 글자 하나를 지우면 됩니다.
    public mutating func backspace() -> TextEdit? {
        guard isComposing else { return nil }
        let before = composingText
        if !finalKeys.isEmpty {
            finalKeys.removeLast()
        } else if !vowelKeys.isEmpty {
            vowelKeys.removeLast()
        } else {
            initial = nil
        }
        return Self.makeEdit(from: before, to: composingText)
    }

    // MARK: - 조합 끝내기

    /// 조합을 끝냅니다. 입력창의 글자는 그대로 두고 내부 상태만 비웁니다.
    /// (커서를 옮겼을 때, 번역 후보를 눌렀을 때, 자판을 바꿨을 때 호출)
    public mutating func commit() {
        reset()
    }

    private mutating func reset() {
        initial = nil
        vowelKeys = []
        finalKeys = []
    }

    // MARK: - 글자 만들기

    private static func render(_ initial: Character?, _ vowelKeys: [Character], _ finalKeys: [Character]) -> String {
        let vowel = combine(vowelKeys, using: HangulTables.compoundVowels)
        let final = combine(finalKeys, using: HangulTables.compoundFinals)

        guard let initial else {
            return vowel.map(String.init) ?? ""        // 모음만: "ㅏ", "ㅘ"
        }
        guard let vowel else {
            return String(initial)                      // 초성만: "ㄱ"
        }
        guard let i = HangulTables.initialIndex[initial],
              let m = HangulTables.medialIndex[vowel] else { return "" }
        let f = final.flatMap { HangulTables.finalIndex[$0] } ?? 0
        let code = 0xAC00 + (i * 21 + m) * 28 + f
        return Unicode.Scalar(code).map { String(Character($0)) } ?? ""
    }

    private static func combine(_ keys: [Character], using table: [String: Character]) -> Character? {
        switch keys.count {
        case 0: return nil
        case 1: return keys[0]
        default: return table[String(keys[0]) + String(keys[1])]
        }
    }

    /// 바뀌기 전/후 문자열을 비교해, 앞부분이 같으면 그 부분은 건드리지 않는 최소 편집을 만듭니다.
    private static func makeEdit(from before: String, to after: String) -> TextEdit {
        let old = Array(before), new = Array(after)
        var same = 0
        while same < old.count, same < new.count, old[same] == new[same] { same += 1 }
        return TextEdit(deleteCount: old.count - same, insert: String(new[same...]))
    }
}

// MARK: - 편의 기능

public extension HangulComposer {
    /// 자모 키 순서를 한 번에 조합한 결과를 돌려줍니다. "⌫"는 삭제 키로 취급합니다.
    /// 예: compose("ㅇㅏㄴㄴㅕㅇ") → "안녕"
    static func compose(_ keys: String) -> String {
        var composer = HangulComposer()
        var text: [Character] = []
        for key in keys {
            if key == "⌫" {
                if let edit = composer.backspace() {
                    apply(edit, to: &text)
                } else if !text.isEmpty {
                    text.removeLast()
                }
            } else {
                apply(composer.input(key), to: &text)
            }
        }
        return String(text)
    }

    private static func apply(_ edit: TextEdit, to text: inout [Character]) {
        text.removeLast(min(edit.deleteCount, text.count))
        text.append(contentsOf: edit.insert)
    }
}
