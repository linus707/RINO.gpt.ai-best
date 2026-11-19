import SwiftUI

struct KeyboardView: View {
    @ObservedObject var model: KeyboardModel

    private let accent = Color(red: 0.78, green: 0.33, blue: 0.24)

    var body: some View {
        VStack(spacing: 8) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(Language.allCases) { language in
                        Button(language.name) { model.partner = language }
                            .buttonStyle(KeyStyle(fill: language == model.partner ? accent : nil))
                            .accessibilityAddTraits(language == model.partner ? .isSelected : [])
                    }
                }
                .padding(.horizontal, 6)
            }
            .frame(height: 38)

            Text(model.status)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .lineLimit(2)
                .frame(maxWidth: .infinity, minHeight: 34, alignment: .leading)
                .padding(.horizontal, 10)

            Button(action: model.translate) {
                HStack(spacing: 8) {
                    if model.isWorking { ProgressView().tint(.white) }
                    Text(model.isWorking ? "번역 중…" : "번역해서 바꾸기 · \(model.direction)")
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(KeyStyle(fill: accent, height: 48))
            .disabled(model.isWorking)
            .padding(.horizontal, 6)

            HStack(spacing: 6) {
                if model.showsGlobe {
                    Button(action: model.nextKeyboard) { Image(systemName: "globe") }
                        .buttonStyle(KeyStyle(width: 46))
                        .accessibilityLabel("다음 키보드")
                }
                Button("되돌리기", action: model.undo)
                    .buttonStyle(KeyStyle())
                    .disabled(!model.canUndo)
                Button { model.insert(" ") } label: { Text("스페이스").frame(maxWidth: .infinity) }
                    .buttonStyle(KeyStyle())
                Button { model.insert("\n") } label: { Image(systemName: "return") }
                    .buttonStyle(KeyStyle(width: 46))
                    .accessibilityLabel("줄바꿈")
                Button(action: model.deleteBackward) { Image(systemName: "delete.left") }
                    .buttonStyle(KeyStyle(width: 46))
                    .accessibilityLabel("지우기")
            }
            .padding(.horizontal, 6)
        }
        .padding(.vertical, 8)
    }
}

/// 키보드 자판처럼 보이는 버튼 모양.
private struct KeyStyle: ButtonStyle {
    var fill: Color?
    var width: CGFloat?
    var height: CGFloat = 40
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(fill == nil ? Color.primary : Color.white)
            .padding(.horizontal, width == nil ? 12 : 0)
            .frame(width: width, height: height)
            .background(fill ?? Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 9, style: .continuous))
            .shadow(color: .black.opacity(0.18), radius: 0, y: 1)
            .opacity(!isEnabled ? 0.4 : configuration.isPressed ? 0.6 : 1)
    }
}
