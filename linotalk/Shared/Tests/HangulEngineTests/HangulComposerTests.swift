import XCTest
@testable import HangulEngine

/// 두벌식 조합 테스트. 키 순서(자모)를 넣었을 때 기대한 글자가 나오는지 확인합니다.
/// "⌫"는 삭제 키입니다.
final class HangulComposerTests: XCTestCase {

    private func assertTyping(_ keys: String, gives expected: String,
                              file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertEqual(HangulComposer.compose(keys), expected, "키 입력: \(keys)", file: file, line: line)
    }

    // MARK: 요구사항에 명시된 기본 케이스

    func test01_안녕하세요() { assertTyping("ㅇㅏㄴㄴㅕㅇㅎㅏㅅㅔㅇㅛ", gives: "안녕하세요") }
    func test02_값이_겹받침뒤_ㅇ초성() { assertTyping("ㄱㅏㅂㅅㅇㅣ", gives: "값이") }
    func test03_닭이() { assertTyping("ㄷㅏㄹㄱㅇㅣ", gives: "닭이") }
    func test04_읽어요() { assertTyping("ㅇㅣㄹㄱㅇㅓㅇㅛ", gives: "읽어요") }
    func test05_왜_겹모음() { assertTyping("ㅇㅗㅐ", gives: "왜") }
    func test06_괜찮아() { assertTyping("ㄱㅗㅐㄴㅊㅏㄴㅎㅇㅏ", gives: "괜찮아") }

    // MARK: 받침이 다음 글자의 초성으로 넘어가기

    func test07_홑받침_이동() { assertTyping("ㄱㅏㄱㅏ", gives: "가가") }
    func test08_겹받침은_뒤쪽만_이동() { assertTyping("ㄷㅏㄹㄱㅣ", gives: "달기") }
    func test09_갑시다() { assertTyping("ㄱㅏㅂㅅㅣㄷㅏ", gives: "갑시다") }
    func test10_없어요() { assertTyping("ㅇㅓㅂㅅㅇㅓㅇㅛ", gives: "없어요") }
    func test11_앉아() { assertTyping("ㅇㅏㄴㅈㅇㅏ", gives: "앉아") }
    func test12_많이() { assertTyping("ㅁㅏㄴㅎㅇㅣ", gives: "많이") }
    func test13_쌍받침은_통째로_이동() { assertTyping("ㅇㅣㅆㅓ", gives: "이써") }

    // MARK: 겹받침 전부

    func test14_겹받침_11종() {
        assertTyping("ㄴㅓㄱㅅ", gives: "넋")
        assertTyping("ㅇㅏㄴㅈ", gives: "앉")
        assertTyping("ㅁㅏㄴㅎ", gives: "많")
        assertTyping("ㄷㅏㄹㄱ", gives: "닭")
        assertTyping("ㅅㅏㄹㅁ", gives: "삶")
        assertTyping("ㅂㅏㄹㅂ", gives: "밟")
        assertTyping("ㄱㅗㄹㅅ", gives: "곬")
        assertTyping("ㅎㅏㄹㅌ", gives: "핥")
        assertTyping("ㅇㅡㄹㅍ", gives: "읊")
        assertTyping("ㅅㅣㄹㅎ", gives: "싫")
        assertTyping("ㅇㅓㅂㅅ", gives: "없")
    }

    func test15_겹받침이_안되는_조합은_새글자() {
        assertTyping("ㄱㅏㄱㄱ", gives: "각ㄱ")
        assertTyping("ㄱㅏㄴㄱ", gives: "간ㄱ")
        assertTyping("ㄷㅏㄹㄱㅅ", gives: "닭ㅅ")
    }

    // MARK: 겹모음

    func test16_겹모음_7종() {
        assertTyping("ㄱㅗㅏ", gives: "과")
        assertTyping("ㄷㅗㅐ", gives: "돼")
        assertTyping("ㅇㅗㅣ", gives: "외")
        assertTyping("ㅁㅜㅓ", gives: "뭐")
        assertTyping("ㅇㅜㅔ", gives: "웨")
        assertTyping("ㅇㅜㅣ", gives: "위")
        assertTyping("ㅇㅡㅣ", gives: "의")
    }

    func test17_겹모음이_안되는_조합은_따로() {
        assertTyping("ㄱㅏㅏ", gives: "가ㅏ")
        assertTyping("ㅇㅗㅓ", gives: "오ㅓ")
        assertTyping("ㄱㅗㅏㅣ", gives: "과ㅣ")
    }

    func test18_겹모음뒤_받침() { assertTyping("ㄱㅗㅏㄴㄱㅗㅏㅇ", gives: "관광") }
    func test19_시프트_모음() { assertTyping("ㅇㅒㄱㅣ", gives: "얘기"); assertTyping("ㅇㅖ", gives: "예") }

    // MARK: 쌍자음

    func test20_쌍자음_초성() {
        assertTyping("ㄲㅏㅊㅣ", gives: "까치")
        assertTyping("ㅇㅏㅃㅏ", gives: "아빠")
        assertTyping("ㅉㅏㅈㅡㅇ", gives: "짜증")
    }

    func test21_쌍자음_받침() {
        assertTyping("ㅇㅣㅆㅇㅓㅇㅛ", gives: "있어요")
        assertTyping("ㅂㅏㄲ", gives: "밖")
    }

    func test22_받침이_될수없는_쌍자음() {
        assertTyping("ㅇㅏㄸ", gives: "아ㄸ")
        assertTyping("ㅇㅏㅃ", gives: "아ㅃ")
        assertTyping("ㅇㅏㅉ", gives: "아ㅉ")
    }

    // MARK: 낱자모

    func test23_자음만_연속() { assertTyping("ㅋㅋㅋ", gives: "ㅋㅋㅋ") }
    func test24_모음만_연속() { assertTyping("ㅠㅠ", gives: "ㅠㅠ") }
    func test25_초성없는_겹모음() { assertTyping("ㅗㅏ", gives: "ㅘ") }
    func test26_모음뒤_자음() { assertTyping("ㅏㄱㅏ", gives: "ㅏ가") }

    // MARK: 한글이 아닌 입력

    func test27_띄어쓰기는_조합을_끝냄() {
        assertTyping("ㅇㅏㄴ ㄴㅕㅇ", gives: "안 녕")
        assertTyping("ㄱㅏㄱ ㅏ", gives: "각 ㅏ")
    }

    func test28_영문_숫자_기호_섞기() {
        assertTyping("ㄱㅏaㄴㅏ", gives: "가a나")
        assertTyping("ㅅㅏㅁ3ㄱㅐ", gives: "삼3개")
        assertTyping("ㅁㅜㅓ?", gives: "뭐?")
    }

    // MARK: 삭제 (자모 단위)

    func test29_받침부터_한단계씩_삭제() {
        assertTyping("ㄷㅏㄹㄱ⌫", gives: "달")
        assertTyping("ㄷㅏㄹㄱ⌫⌫", gives: "다")
        assertTyping("ㄷㅏㄹㄱ⌫⌫⌫", gives: "ㄷ")
        assertTyping("ㄷㅏㄹㄱ⌫⌫⌫⌫", gives: "")
    }

    func test30_겹모음_삭제() {
        assertTyping("ㅇㅗㅐ⌫", gives: "오")
        assertTyping("ㅇㅗㅐ⌫⌫", gives: "ㅇ")
    }

    func test31_받침이_넘어간뒤_삭제() {
        assertTyping("ㄱㅏㅂㅅㅣ⌫", gives: "갑ㅅ")
        assertTyping("ㄱㅏㅂㅅㅣ⌫⌫", gives: "갑")
    }

    func test32_확정된_글자는_통째로_삭제() {
        assertTyping("ㅇㅏㄴㄴㅕㅇ⌫⌫⌫", gives: "안")
        assertTyping("ㅇㅏㄴㄴㅕㅇ⌫⌫⌫⌫", gives: "")
    }

    func test33_삭제후_다시_입력() {
        assertTyping("ㄱㅏㄱ⌫ㄴ", gives: "간")
        assertTyping("ㄱㅗㅏ⌫ㅐ", gives: "괘")
        assertTyping("ㅇㅏㄴㅎ⌫ㅈㅇㅏ", gives: "앉아")
    }

    func test34_빈상태에서_삭제는_nil() {
        var composer = HangulComposer()
        XCTAssertNil(composer.backspace())
        XCTAssertFalse(composer.isComposing)
    }

    // MARK: 조합 끝내기

    func test35_commit후에는_받침이_넘어가지_않음() {
        var composer = HangulComposer()
        _ = composer.input("ㄱ"); _ = composer.input("ㅏ"); _ = composer.input("ㄱ")
        XCTAssertEqual(composer.composingText, "각")
        composer.commit()
        XCTAssertFalse(composer.isComposing)
        XCTAssertEqual(composer.input("ㅏ"), TextEdit(deleteCount: 0, insert: "ㅏ"))
        XCTAssertNil({ composer.commit(); return composer.backspace() }())
    }

    // MARK: 입력창에 보낼 편집 내용

    func test36_편집은_최소한만_지우고_넣음() {
        var composer = HangulComposer()
        XCTAssertEqual(composer.input("ㄱ"), TextEdit(deleteCount: 0, insert: "ㄱ"))
        XCTAssertEqual(composer.input("ㅏ"), TextEdit(deleteCount: 1, insert: "가"))
        XCTAssertEqual(composer.input("ㄱ"), TextEdit(deleteCount: 1, insert: "각"))
        XCTAssertEqual(composer.input("ㅏ"), TextEdit(deleteCount: 1, insert: "가가"))
        XCTAssertEqual(composer.composingText, "가")
        // 띄어쓰기: 이미 있는 "가"는 건드리지 않고 공백만 추가
        XCTAssertEqual(composer.input(" "), TextEdit(deleteCount: 0, insert: " "))
        XCTAssertFalse(composer.isComposing)
    }

    func test37_삭제_편집() {
        var composer = HangulComposer()
        _ = composer.input("ㄱ"); _ = composer.input("ㅏ")
        XCTAssertEqual(composer.backspace(), TextEdit(deleteCount: 1, insert: "ㄱ"))
        XCTAssertEqual(composer.backspace(), TextEdit(deleteCount: 1, insert: ""))
        XCTAssertNil(composer.backspace())
    }

    // MARK: 왕복 검사 — 글자를 키 순서로 풀었다가 다시 치면 원래 글자가 나와야 함

    func test38_문장_왕복() {
        let samples = [
            "안녕하세요", "감사합니다", "죄송합니다", "괜찮아요", "화장실이 어디예요?",
            "이거 얼마예요?", "아이스 아메리카노 한 잔 주세요", "닭갈비 먹고 싶어요",
            "값이 너무 비싸요", "책을 읽었어요", "여기 앉아도 돼요?", "많이 드세요",
            "없었던 일로 해요", "삶은 달걀", "넓은 방으로 주세요", "핥다 읊다 싫다 넋 곬",
            "의사 선생님 뵙고 싶어요", "웬일이야", "꽃이 예뻐요", "짧은 치마",
            "옆자리 괜찮으세요?", "깎아 주세요", "계산서 좀 갖다 주시겠어요?",
            "공항까지 얼마나 걸려요?", "쓰레기통", "뷔페", "훨씬 좋아요", "귀찮아",
            "됐어요", "왠지 궁금해", "밟았다", "흙을 밟고", "앉았다 일어났다",
        ]
        for sample in samples {
            let keys = HangulText.keystrokes(for: sample)
            XCTAssertEqual(HangulComposer.compose(keys), sample, "키 순서: \(keys)")
        }
    }

    func test39_모든_한글음절_왕복() {
        // 가(0xAC00)부터 힣(0xD7A3)까지 11,172자 전부, 앞뒤에 다른 글자를 붙여 검사
        for code in 0xAC00...0xD7A3 {
            let syllable = String(Character(Unicode.Scalar(code)!))
            let word = "가" + syllable + "나"
            XCTAssertEqual(HangulComposer.compose(HangulText.keystrokes(for: word)), word)
        }
    }

    // MARK: 도구

    func test40_keystrokes() {
        XCTAssertEqual(HangulText.keystrokes(for: "닭이"), "ㄷㅏㄹㄱㅇㅣ")
        XCTAssertEqual(HangulText.keystrokes(for: "왜 a1"), "ㅇㅗㅐ a1")
    }

    func test41_containsHangul() {
        XCTAssertTrue(HangulText.containsHangul("hello 안녕"))
        XCTAssertTrue(HangulText.containsHangul("ㅋㅋ"))
        XCTAssertFalse(HangulText.containsHangul("hello 123 こんにちは"))
        XCTAssertFalse(HangulText.containsHangul(""))
    }
}
