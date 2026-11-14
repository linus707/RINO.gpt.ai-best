import SwiftUI
import UIKit

/// 번역 키보드의 시작점. 화면은 SwiftUI(KeyboardView)로 그리고,
/// 글을 읽고 바꾸는 일은 KeyboardModel이 맡아요.
final class KeyboardViewController: UIInputViewController {
    private let model = KeyboardModel()

    override func viewDidLoad() {
        super.viewDidLoad()
        model.controller = self

        let host = UIHostingController(rootView: KeyboardView(model: model))
        host.view.backgroundColor = .clear
        host.view.translatesAutoresizingMaskIntoConstraints = false
        addChild(host)
        view.addSubview(host.view)

        let height = view.heightAnchor.constraint(equalToConstant: 236)
        height.priority = UILayoutPriority(999)
        NSLayoutConstraint.activate([
            host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            host.view.topAnchor.constraint(equalTo: view.topAnchor),
            host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            height,
        ])
        host.didMove(toParent: self)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        model.refresh()
    }

    override func textDidChange(_ textInput: UITextInput?) {
        super.textDidChange(textInput)
        model.refresh()
    }
}

@MainActor
final class KeyboardModel: ObservableObject {
    weak var controller: UIInputViewController?

    @Published var partner: Language = Language.saved {
        didSet {
            Language.saved = partner
            refresh()
        }
    }
    @Published private(set) var status = ""
    @Published private(set) var direction = ""
    @Published private(set) var isWorking = false
    @Published private(set) var canUndo = false
    @Published private(set) var showsGlobe = true

    /// 방금 바꾼 글. "되돌리기"에 써요.
    private var last: (original: String, translated: String)?

    private var proxy: UITextDocumentProxy? { controller?.textDocumentProxy }

    /// 번역할 글: 선택한 글이 있으면 그것, 없으면 커서 앞의 글.
    private var source: (text: String, isSelection: Bool) {
        if let selected = proxy?.selectedText, !selected.isEmpty { return (selected, true) }
        return (proxy?.documentContextBeforeInput ?? "", false)
    }

    func refresh() {
        guard let controller = self.controller else { return }
        showsGlobe = controller.needsInputModeSwitchKey
        direction = Translator.directionLabel(for: source.text.trimmingCharacters(in: .whitespacesAndNewlines), partner: partner)
        if let last = self.last, controller.textDocumentProxy.documentContextBeforeInput?.hasSuffix(last.translated) != true {
            self.last = nil
        }
        canUndo = last != nil
        if isWorking { return }
        if !controller.hasFullAccess {
            status = "설정 → 일반 → 키보드 → 키보드 → 리노 번역에서 ‘전체 접근 허용’을 켜 주세요."
        } else if !canUndo {
            status = "일반 키보드로 글을 쓴 뒤, 이 키보드에서 번역 버튼을 누르세요."
        }
    }

    func translate() {
        guard let controller = self.controller, !isWorking else { return }
        guard controller.hasFullAccess else {
            refresh()
            return
        }
        let (text, isSelection) = source
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            status = "번역할 글이 없어요. 먼저 글을 입력해 주세요."
            return
        }

        isWorking = true
        status = "번역 중…"
        let partner = partner
        Task {
            defer {
                isWorking = false
                refresh()
            }
            do {
                let translated = try await Translator.translate(text, partner: partner)
                // 기다리는 동안 글이 바뀌었으면 엉뚱한 곳을 지우지 않도록 멈춰요.
                let now = source
                guard now.text == text, now.isSelection == isSelection, let proxy = self.proxy else {
                    status = "글이 바뀌었어요. 번역 버튼을 다시 눌러 주세요."
                    return
                }
                if !isSelection {
                    for _ in 0..<text.count { proxy.deleteBackward() }
                }
                proxy.insertText(translated)   // 선택한 글은 삽입하면 자동으로 바뀌어요
                last = (text, translated)
                status = "바꿨어요. 마음에 안 들면 ‘되돌리기’를 누르세요."
            } catch let error as TranslateError {
                status = error.message
            } catch {
                status = TranslateError.failed.message
            }
        }
    }

    func undo() {
        guard let last = self.last, let proxy = self.proxy, proxy.documentContextBeforeInput?.hasSuffix(last.translated) == true else {
            self.last = nil
            refresh()
            return
        }
        for _ in 0..<last.translated.count { proxy.deleteBackward() }
        proxy.insertText(last.original)
        self.last = nil
        status = "원래 글로 되돌렸어요."
        refresh()
    }

    func insert(_ text: String) { proxy?.insertText(text) }
    func deleteBackward() { proxy?.deleteBackward() }
    func nextKeyboard() { controller?.advanceToNextInputMode() }
}
