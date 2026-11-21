import Foundation

/// 한국어와 짝지어 번역할 상대 언어.
enum Language: String, CaseIterable, Identifiable {
    case english = "en"
    case japanese = "ja"
    case chinese = "zh-CN"
    case spanish = "es"
    case french = "fr"
    case german = "de"
    case vietnamese = "vi"
    case thai = "th"
    case indonesian = "id"

    var id: String { rawValue }

    var name: String {
        switch self {
        case .english: return "영어"
        case .japanese: return "일본어"
        case .chinese: return "중국어"
        case .spanish: return "스페인어"
        case .french: return "프랑스어"
        case .german: return "독일어"
        case .vietnamese: return "베트남어"
        case .thai: return "태국어"
        case .indonesian: return "인도네시아어"
        }
    }

    private static let storageKey = "partnerLanguage"

    /// 마지막으로 고른 언어. 앱과 키보드는 저장 공간이 달라 각자 기억해요.
    static var saved: Language {
        get { UserDefaults.standard.string(forKey: storageKey).flatMap(Language.init(rawValue:)) ?? .english }
        set { UserDefaults.standard.set(newValue.rawValue, forKey: storageKey) }
    }
}

struct TranslateError: LocalizedError {
    let message: String
    var errorDescription: String? { message }

    static let quota = TranslateError(message: "오늘 무료 번역 한도를 다 썼어요. 내일 다시 시도해 주세요.")
    static let network = TranslateError(message: "인터넷 연결을 확인해 주세요.")
    static let failed = TranslateError(message: "번역하지 못했어요. 문장을 조금 바꿔 다시 시도해 주세요.")
    static let tooLong = TranslateError(message: "한 번에 \(Translator.maxCharacters)자까지 번역할 수 있어요.")
}

/// 무료 번역 서비스 MyMemory(translated.net)를 쓰는 번역기.
/// 한글이 섞여 있으면 "한국어 → 상대 언어", 아니면 "외국어(자동 감지) → 한국어"로 번역해요.
enum Translator {
    static let maxCharacters = 1000
    /// MyMemory는 요청 한 번에 500바이트까지 받아요.
    private static let chunkBytes = 450
    private static let endpoint = "https://api.mymemory.translated.net/get"

    private static let session: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 15
        return URLSession(configuration: config)
    }()

    static func containsHangul(_ text: String) -> Bool {
        text.unicodeScalars.contains { (0xAC00...0xD7A3).contains($0.value) || (0x3131...0x318E).contains($0.value) }
    }

    /// 화면에 보여 줄 번역 방향. 예: "한국어 → 영어"
    static func directionLabel(for text: String, partner: Language) -> String {
        text.isEmpty || containsHangul(text) ? "한국어 → \(partner.name)" : "외국어 → 한국어"
    }

    static func translate(_ text: String, partner: Language) async throws -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return "" }
        guard trimmed.count <= maxCharacters else { throw TranslateError.tooLong }

        let pair = containsHangul(trimmed) ? "ko|\(partner.rawValue)" : "Autodetect|ko"
        var lines: [String] = []
        for line in trimmed.components(separatedBy: "\n") {
            if line.trimmingCharacters(in: .whitespaces).isEmpty {
                lines.append("")
                continue
            }
            var parts: [String] = []
            for chunk in chunks(of: line) {
                parts.append(try await request(chunk, pair: pair))
            }
            lines.append(parts.joined(separator: " "))
        }
        return lines.joined(separator: "\n")
    }

    /// 긴 줄을 문장 단위로 잘라 요청 한도 안에 맞춰요.
    static func chunks(of line: String) -> [String] {
        var sentences: [String] = []
        line.enumerateSubstrings(in: line.startIndex..<line.endIndex, options: [.bySentences, .substringNotRequired]) { _, _, enclosing, _ in
            sentences.append(String(line[enclosing]))
        }
        if sentences.isEmpty { sentences = [line] }

        var result: [String] = []
        var current = ""
        func flush() {
            let piece = current.trimmingCharacters(in: .whitespaces)
            if !piece.isEmpty { result.append(piece) }
            current = ""
        }
        for sentence in sentences {
            if (current + sentence).utf8.count <= chunkBytes {
                current += sentence
                continue
            }
            flush()
            if sentence.utf8.count <= chunkBytes {
                current = sentence
                continue
            }
            // 문장 하나가 한도를 넘으면 글자 단위로 나눠요.
            for character in sentence {
                if current.utf8.count + String(character).utf8.count > chunkBytes { flush() }
                current.append(character)
            }
        }
        flush()
        return result
    }

    private static func request(_ text: String, pair: String) async throws -> String {
        guard var components = URLComponents(string: endpoint) else { throw TranslateError.failed }
        components.queryItems = [
            URLQueryItem(name: "q", value: text),
            URLQueryItem(name: "langpair", value: pair),
        ]
        // URLComponents는 "+"를 그대로 두는데, 서버는 이를 공백으로 읽어요.
        components.percentEncodedQuery = components.percentEncodedQuery?.replacingOccurrences(of: "+", with: "%2B")
        guard let url = components.url else { throw TranslateError.failed }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(from: url)
        } catch let error as URLError where error.code == .cancelled {
            throw CancellationError()
        } catch is CancellationError {
            throw CancellationError()
        } catch {
            throw TranslateError.network
        }

        if (response as? HTTPURLResponse)?.statusCode == 429 { throw TranslateError.quota }
        guard let object = try? JSONSerialization.jsonObject(with: data), let json = object as? [String: Any] else {
            throw TranslateError.failed
        }
        let translated = (json["responseData"] as? [String: Any])?["translatedText"] as? String
        if json["quotaFinished"] as? Bool == true || translated?.uppercased().contains("MYMEMORY WARNING") == true {
            throw TranslateError.quota
        }
        // responseStatus는 숫자로도, 문자열로도 와요.
        let status = (json["responseStatus"] as? Int) ?? Int(json["responseStatus"] as? String ?? "")
        guard status == 200, let translated else { throw TranslateError.failed }
        return translated
    }
}
