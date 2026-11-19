import SwiftUI
import UIKit

/// 앱 화면: 키보드 켜는 방법 안내 + 앱 안에서 바로 쓰는 번역기.
struct ContentView: View {
    @State private var partner = Language.saved
    @State private var input = ""
    @State private var output = ""
    @State private var message: String?
    @State private var isWorking = false
    @State private var copied = false
    @State private var practice = ""

    private let accent = Color(red: 0.78, green: 0.33, blue: 0.24)

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Label("설정 → 일반 → 키보드 → 키보드 → 새로운 키보드 추가", systemImage: "1.circle.fill")
                    Label("목록에서 ‘리노 번역’ 선택", systemImage: "2.circle.fill")
                    Label("‘리노 번역’을 다시 눌러 ‘전체 접근 허용’ 켜기", systemImage: "3.circle.fill")
                    Button("설정 열기") {
                        if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
                    }
                } header: {
                    Text("키보드 켜는 방법")
                } footer: {
                    Text("‘전체 접근 허용’은 번역하려고 인터넷에 연결할 때만 써요. 번역 버튼을 누른 글만 번역 서비스 MyMemory(translated.net)로 전송되고, 그 밖의 입력은 어디에도 보내거나 저장하지 않아요.")
                }

                Section {
                    TextField("여기에 글을 써 보세요", text: $practice, axis: .vertical)
                        .lineLimit(2...5)
                } header: {
                    Text("연습해 보기")
                } footer: {
                    Text("글을 쓴 뒤 지구본(🌐) 키를 길게 눌러 ‘리노 번역’으로 바꾸고, ‘번역해서 바꾸기’를 누르세요.")
                }

                Section("앱에서 바로 번역") {
                    Picker("상대 언어", selection: $partner) {
                        ForEach(Language.allCases) { Text($0.name).tag($0) }
                    }
                    TextField("번역할 글", text: $input, axis: .vertical)
                        .lineLimit(3...8)
                    Button {
                        Task { await translate() }
                    } label: {
                        HStack {
                            Text(isWorking ? "번역 중…" : "번역 · \(Translator.directionLabel(for: trimmedInput, partner: partner))")
                            if isWorking { ProgressView() }
                        }
                    }
                    .disabled(isWorking || trimmedInput.isEmpty)

                    if let message {
                        Text(message).font(.footnote).foregroundStyle(accent)
                    }
                    if !output.isEmpty {
                        Text(output).textSelection(.enabled)
                        Button(copied ? "복사했어요 ✓" : "복사") {
                            UIPasteboard.general.string = output
                            copied = true
                        }
                    }
                }
            }
            .navigationTitle("리노 번역")
            .tint(accent)
            .onChange(of: partner) { _, newValue in Language.saved = newValue }
        }
    }

    private var trimmedInput: String { input.trimmingCharacters(in: .whitespacesAndNewlines) }

    private func translate() async {
        isWorking = true
        message = nil
        copied = false
        defer { isWorking = false }
        do {
            output = try await Translator.translate(input, partner: partner)
        } catch let error as TranslateError {
            output = ""
            message = error.message
        } catch {
            output = ""
            message = TranslateError.failed.message
        }
    }
}

#Preview {
    ContentView()
}
