import SwiftUI

/// 지문과 문항들을 좌우 쪽으로 나눠 보여준다. **앱에만 있는 화면 구성이다.**
///
/// 웹은 넓은 화면에서 지문 아래로 문항을 이어 붙이지만, 폰에서는 지문 하나가
/// 화면을 몇 번 넘길 만큼 길어서 문항을 보려면 계속 위아래로 오가야 한다.
///
/// 쪽 순서는 `지문 → 문항 1 → 문항 2 → ...`다. 지문에서 왼쪽으로 밀면 첫 문항이
/// 나오고, 문항끼리도 좌우로 넘긴다. 각 쪽은 세로로 따로 스크롤된다.
/// 맨 위 칩 줄이 곧 문항 진행 표시라, 어디까지 풀었는지 보면서 바로 건너뛴다.
struct ToeflReadingPager<Passage: View, Question: View>: View {
    enum Page: Hashable {
        case passage
        case question(Int)
    }

    let questionCount: Int
    /// 지금 보고 있는 문항. 쪽을 넘기면 이 값이 바뀌고, 밖에서 바꾸면 그 쪽으로 넘어간다.
    @Binding var questionIndex: Int
    /// 문항별로 답을 골랐는지. 칩 색으로 보여준다.
    var answered: (Int) -> Bool = { _ in false }
    /// 채점 후의 정답 여부. 채점 전에는 nil이라 색이 새지 않는다.
    var result: (Int) -> Bool? = { _ in nil }
    /// 이 값이 바뀌면 지문 쪽으로 되돌아간다.
    ///
    /// 모의고사는 문항마다 지문이 다르므로, 다음 문항으로 넘어가면 새 지문부터
    /// 읽어야 한다. 지문이 하나뿐인 모드는 넘기지 않으면 그만이다.
    var passageResetID: AnyHashable?

    @ViewBuilder let passage: Passage
    @ViewBuilder let question: (Int) -> Question

    @State private var page: Page? = .passage

    var body: some View {
        VStack(spacing: 12) {
            switcher
            pages
        }
        .onChange(of: page) { _, next in
            // 쪽을 넘긴 결과를 세션에 알린다.
            guard case let .question(index) = next, index != questionIndex else { return }
            questionIndex = index
        }
        .onChange(of: questionIndex) { _, next in
            // 밖에서 문항을 옮겼을 때 쪽도 따라간다. 지문을 읽는 중이면 끌고 오지 않는다.
            guard case .question = page, page != .question(next) else { return }
            withAnimation(.smooth(duration: 0.3)) { page = .question(next) }
        }
        .onChange(of: passageResetID) {
            withAnimation(.smooth(duration: 0.3)) { page = .passage }
        }
    }

    // MARK: - 쪽 전환

    private var isOnPassage: Bool { page == .passage }

    /// 지문 칩 하나 + 문항 수만큼의 번호 칩.
    private var switcher: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                passageChip

                ForEach(0..<max(questionCount, 1), id: \.self) { index in
                    questionChip(index)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 2)
        }
        .scrollIndicators(.hidden)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("문항 진행")
    }

    private var passageChip: some View {
        Button {
            withAnimation(.smooth(duration: 0.3)) { page = .passage }
        } label: {
            HStack(spacing: 6) {
                // 문항 쪽이면 왼쪽으로 돌아간다는 뜻이다.
                Image(systemName: isOnPassage ? "book" : "chevron.left")
                    .font(.system(size: 11, weight: .black))
                Text("지문")
                    .font(DS.Font.caption)
            }
            .padding(.horizontal, 13)
            .frame(height: 34)
            .foregroundStyle(isOnPassage ? .white : DS.Surface.level600)
            .background(
                isOnPassage ? AnyShapeStyle(DS.Solid.brand) : AnyShapeStyle(DS.Surface.level0),
                in: .capsule
            )
            .overlay {
                if !isOnPassage {
                    Capsule().strokeBorder(DS.Surface.level200, lineWidth: 1)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("지문 보기")
        .accessibilityAddTraits(isOnPassage ? [.isSelected] : [])
    }

    private func questionChip(_ index: Int) -> some View {
        let isCurrent = page == .question(index)

        return Button {
            withAnimation(.smooth(duration: 0.3)) { page = .question(index) }
        } label: {
            // 문항이 하나뿐이면 번호가 의미 없다.
            Text(questionCount <= 1 ? "문항" : "\(index + 1)")
                .font(DS.Font.caption)
                .monospacedDigit()
                .frame(minWidth: 34)
                .padding(.horizontal, questionCount <= 1 ? 9 : 0)
                .frame(height: 34)
                .foregroundStyle(foreground(at: index))
                .background(background(at: index), in: .capsule)
                .overlay {
                    Capsule().strokeBorder(border(at: index), lineWidth: isCurrent ? 2 : 1)
                }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("문항 \(index + 1)로 이동")
        .accessibilityAddTraits(isCurrent ? [.isSelected] : [])
    }

    /// 색 규칙은 웹 `ToeflQuestionSetNavigator`를 따른다.
    private func background(at index: Int) -> Color {
        switch result(index) {
        case .some(true): return DS.Solid.success
        case .some(false): return DS.Solid.danger
        case nil: return answered(index) ? DS.Solid.brand500 : DS.Surface.level0
        }
    }

    private func foreground(at index: Int) -> Color {
        result(index) != nil || answered(index) ? .white : DS.Surface.level400
    }

    private func border(at index: Int) -> Color {
        if page == .question(index) { return DS.Solid.brand }
        return result(index) != nil || answered(index) ? .clear : DS.Surface.level200
    }

    // MARK: - 쪽

    private var pages: some View {
        ScrollView(.horizontal) {
            // 문항은 최대 10개라 미리 다 만들어 둔다. 게으르게 만들면 쪽을 프로그램으로
            // 옮길 때 아직 없는 쪽으로 못 간다.
            HStack(spacing: 0) {
                pageBody { passage }
                    .id(Page.passage)

                ForEach(0..<max(questionCount, 1), id: \.self) { index in
                    pageBody { question(index) }
                        .id(Page.question(index))
                }
            }
            .scrollTargetLayout()
        }
        .scrollTargetBehavior(.paging)
        .scrollIndicators(.hidden)
        .scrollPosition(id: $page)
    }

    private func pageBody(@ViewBuilder _ content: () -> some View) -> some View {
        ScrollView {
            content()
                .padding(.horizontal, 16)
                .padding(.top, 4)
                .padding(.bottom, 32)
        }
        .scrollEdgeEffectStyle(.soft, for: .top)
        .containerRelativeFrame(.horizontal)
    }
}
