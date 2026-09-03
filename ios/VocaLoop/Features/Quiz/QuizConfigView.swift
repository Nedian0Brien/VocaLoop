import SwiftUI

/// 웹 `src/components/QuizConfigModal.jsx`의 이식.
/// 수치는 웹을 375pt로 렌더링해 측정한 값이다.
struct QuizConfigView: View {
    @Environment(\.dismiss) private var dismiss

    @State var state: QuizConfigState
    let onStart: (QuizLaunch) -> Void

    var body: some View {
        // 배경은 safe area를 넘어 깔되, 패널은 safe area 안에 둔다.
        // ZStack 형제로 두면 패널까지 화면 밖으로 끌려나간다.
        panel
            // 웹의 `p-2`에 대응. 홈 인디케이터와 겹치지 않게 safe area 기준으로 띄운다.
            .safeAreaPadding(8)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background {
                // 웹은 surface-900 60%에 블러를 깐다.
                Rectangle()
                    .fill(.ultraThinMaterial)
                    .overlay(DS.Solid.ink.opacity(0.6))
                    .ignoresSafeArea()
                    .onTapGesture { dismiss() }
            }
    }

    private var panel: some View {
        VStack(spacing: 0) {
            header
            body_
            footer
        }
        .background(DS.Surface.level0)
        .clipShape(.rect(cornerRadius: DS.Radius.hero))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.hero)
                .strokeBorder(.white.opacity(0.2), lineWidth: 1)
        )
        .dsShadow(.floating)
    }

    // MARK: - 헤더

    private var header: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 8) {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 14, weight: .bold))
                    Text("Configure Mode".uppercased())
                        .font(.system(size: 10, weight: .black))
                        .tracking(3)
                }
                .foregroundStyle(.white.opacity(0.6))
                .padding(.bottom, 8)

                Text(state.mode.title)
                    .font(.system(size: 30, weight: .black))
                    .tracking(-0.75)
                    .foregroundStyle(.white)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)

            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(.white.opacity(0.1), in: .rect(cornerRadius: DS.Radius.xl))
                    .overlay(
                        RoundedRectangle(cornerRadius: DS.Radius.xl)
                            .strokeBorder(.white.opacity(0.1), lineWidth: 1)
                    )
            }
            .buttonStyle(.plain)
            .accessibilityLabel("설정 닫기")
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            LinearGradient(
                colors: state.mode.accent == .brand
                    ? [DS.Solid.brand, Color(hex: 0x4338CA)]
                    : [DS.Solid.accent, Color(hex: 0x4338CA)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .overlay(alignment: .topTrailing) {
                Circle()
                    .fill(.white.opacity(0.1))
                    .frame(width: 320, height: 320)
                    .blur(radius: 100)
                    .offset(x: 160, y: -160)
            }
        }
        .clipped()
    }

    // MARK: - 본문

    private var body_: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 32) {
                if !state.isToefl {
                    scopeSection
                }
                if state.isMixed {
                    mixedSection
                }
                countSection
                soundSection
                aiSection
                if state.isToefl {
                    difficultySection
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .scrollBounceBehavior(.basedOnSize)
    }

    // MARK: - 출제 범위

    private var scopeSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 16) {
                QuizConfigSectionHead(
                    title: "출제 범위 설정",
                    subtitle: "전체, 플래그, 폴더 중 학습할 단어 묶음을 고르세요",
                    systemImage: "square.stack.3d.up"
                )

                HStack(spacing: 8) {
                    scopeShortcut("전체", tint: DS.Surface.level400) { state.selectAllWords() }
                    scopeShortcut("폴더 전체", tint: DS.BrandText.base) { state.selectEveryFolder() }
                }
                .padding(4)
                .background(DS.Surface.level50, in: .capsule)
            }

            VStack(spacing: 12) {
                QuizScopeButton(
                    title: "전체 단어",
                    subtitle: "\(state.totalWordCount)개",
                    isSelected: state.isAllSelected,
                    action: { state.selectAllWords() }
                )
                QuizScopeButton(
                    title: "플래그한 단어만",
                    subtitle: "\(state.flaggedCount)개",
                    isSelected: state.isFlaggedSelected,
                    tone: .warning,
                    action: { state.selectFlagged() }
                )

                if !state.folders.isEmpty {
                    ForEach(state.folders) { folder in
                        QuizScopeButton(
                            title: folder.name,
                            subtitle: "",
                            isSelected: state.isFolderSelected(folder.id),
                            minHeight: 64,
                            trailing: AnyView(folderCountPill(folder)),
                            action: { state.toggleFolder(folder.id) }
                        )
                    }
                    .padding(.top, 4)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity)
            .background(DS.Surface.level50.opacity(0.5), in: .rect(cornerRadius: DS.Radius.card))
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.card)
                    .strokeBorder(DS.Surface.level100, lineWidth: 1)
            )

            selectionSummary
        }
    }

    private func scopeShortcut(
        _ title: String,
        tint: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(title.uppercased())
                .font(.system(size: 10, weight: .black))
                .tracking(1.2)
                .foregroundStyle(tint)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
        }
        .buttonStyle(.plain)
    }

    private func folderCountPill(_ folder: Folder) -> some View {
        let selected = state.isFolderSelected(folder.id)
        return Text("\(state.wordCount(inFolder: folder.id))")
            .font(.system(size: 10, weight: .black))
            .monospacedDigit()
            .foregroundStyle(selected ? DS.BrandText.strong : DS.Surface.level400)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                selected ? DS.Wash.brandStrong : DS.Surface.level100,
                in: .capsule
            )
    }

    private var selectionSummary: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(state.filteredWords.isEmpty ? DS.Surface.level300 : DS.Solid.brand500)
                .frame(width: 8, height: 8)

            (
                Text("선택된 범위: ")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(DS.Surface.level600)
                + Text("\(state.filteredWords.count)")
                    .font(.system(size: 14, weight: .black))
                    .foregroundStyle(DS.BrandText.base)
                + Text("개의 단어")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(DS.Surface.level600)
            )

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(DS.Wash.brand.opacity(0.5), in: .rect(cornerRadius: DS.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.xl)
                .strokeBorder(DS.Wash.brandStrong.opacity(0.5), lineWidth: 1)
        )
    }

    // MARK: - 복합 단계

    private var mixedSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(spacing: 12) {
                QuizConfigSectionHead(
                    title: "복합 단계 구성",
                    subtitle: "선택한 단계 순서대로 정답 시 난이도가 올라갑니다",
                    systemImage: "sparkles",
                    tone: .warning
                )
                DSBadge(
                    text: "\(state.mixedStages.count) Steps",
                    tone: .warning,
                    style: .pill,
                    size: .xs
                )
            }

            VStack(spacing: 12) {
                ForEach(Array(stageRows.enumerated()), id: \.element.id) { index, row in
                    switch row {
                    case let .single(stage):
                        stageCard(stage, index: index)
                    case .shortAnswer:
                        shortAnswerCard(index: index)
                    }
                }
            }

            Text("정답이면 다음 단계로 이동하고, 오답이면 같은 문제가 뒤로 재출제됩니다. 같은 단계에서 연속 오답이면 한 단계 쉬운 문제로 되돌아갑니다.")
                .font(.system(size: 12, weight: .bold))
                .lineSpacing(7.5)
                .foregroundStyle(DS.Surface.level500)
                .fixedSize(horizontal: false, vertical: true)
                .padding(20)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(DS.Surface.level50.opacity(0.7), in: .rect(cornerRadius: DS.Radius.card))
                .overlay(
                    RoundedRectangle(cornerRadius: DS.Radius.card)
                        .strokeBorder(DS.Surface.level100, lineWidth: 1)
                )
        }
        .padding(.top, 8)
        .overlay(alignment: .top) {
            Rectangle().fill(DS.Surface.level50).frame(height: 1)
        }
    }

    /// 설정 화면에 보이는 카드 한 장. 주관식은 두 방향을 한 장에 담는다.
    private enum StageRow: Identifiable {
        case single(AdaptiveStage)
        case shortAnswer

        var id: String {
            switch self {
            case let .single(stage): return stage.rawValue
            case .shortAnswer: return "short-answer"
            }
        }
    }

    private var stageRows: [StageRow] {
        var rows: [StageRow] = []
        for stage in AdaptiveStage.allCases {
            switch stage {
            case .shortEnKo: rows.append(.shortAnswer)
            // 영→한 카드가 함께 들고 있다.
            case .shortKoEn: continue
            default: rows.append(.single(stage))
            }
        }
        return rows
    }

    private func stageCard(_ stage: AdaptiveStage, index: Int) -> some View {
        let selected = state.mixedStages.contains(stage)

        return Button {
            state.toggleStage(stage)
        } label: {
            stageCardBody(
                symbolName: stage.symbolName,
                index: index,
                selected: selected,
                title: stage.title,
                detail: stage.detail
            ) {
                EmptyView()
            }
        }
        .buttonStyle(.plain)
        .animation(.smooth(duration: 0.2), value: selected)
    }

    /// 주관식 카드. 두 방향을 카드 안에서 각각 켜고 끈다.
    /// 카드 몸통을 누르면 통째로 켜고 꺼진다.
    private func shortAnswerCard(index: Int) -> some View {
        let selected = state.isShortAnswerSelected

        return stageCardBody(
            symbolName: AdaptiveStage.shortEnKo.symbolName,
            index: index,
            selected: selected,
            title: "주관식",
            detail: "단어와 뜻을 직접 입력합니다. 방향은 아래에서 고릅니다."
        ) {
            HStack(spacing: 8) {
                ForEach(QuizConfigState.shortAnswerStages) { stage in
                    directionChip(stage)
                }
                Spacer(minLength: 0)
            }
            .padding(.top, 12)
        }
        .contentShape(.rect(cornerRadius: DS.Radius.card))
        .onTapGesture { state.toggleShortAnswerGroup() }
        // 탭 제스처만 두면 보조 기술이 카드를 켜고 끌 수 없다.
        // 방향 칩은 각자 버튼이라 그대로 읽힌다.
        .accessibilityElement(children: .contain)
        .accessibilityAction(named: "주관식 단계 켜고 끄기") {
            state.toggleShortAnswerGroup()
        }
        .animation(.smooth(duration: 0.2), value: selected)
        .animation(.smooth(duration: 0.2), value: state.mixedStages)
    }

    private func directionChip(_ stage: AdaptiveStage) -> some View {
        let on = state.mixedStages.contains(stage)

        return Button {
            state.toggleStage(stage)
        } label: {
            Text(stage.directionLabel)
                .font(.system(size: 12, weight: .black))
                .tracking(-0.3)
                .foregroundStyle(on ? .white : DS.Surface.level500)
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(
                    on ? DS.Solid.warning : DS.Surface.level100,
                    in: .capsule
                )
                .overlay(
                    Capsule().strokeBorder(
                        on ? Color(hex: 0xFCD34D) : DS.Surface.level200,
                        lineWidth: 1
                    )
                )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("주관식 \(stage.directionLabel)")
        .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
    }

    /// 두 카드가 같은 모양을 쓴다. `extra`는 카드 아래에 덧붙는 내용이다.
    private func stageCardBody<Extra: View>(
        symbolName: String,
        index: Int,
        selected: Bool,
        title: String,
        detail: String,
        @ViewBuilder extra: () -> Extra
    ) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Image(systemName: symbolName)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(selected ? .white : DS.Surface.level500)
                    .frame(width: 40, height: 40)
                    .background(
                        selected ? DS.Solid.warning : DS.Surface.level100,
                        in: .rect(cornerRadius: DS.Radius.lg)
                    )

                Spacer(minLength: 0)

                DSBadge(
                    text: "\(index + 1)",
                    tone: selected ? .warning : .neutral,
                    style: .pill,
                    size: .xs
                )
            }
            .padding(.bottom, 16)

            Text(title)
                .font(.system(size: 14, weight: .black))
                .tracking(-0.35)
                .foregroundStyle(
                    selected
                        ? Color.adaptive(light: 0x78350F, dark: 0xFEF3C7)
                        : DS.Surface.level700
                )
                .padding(.bottom, 4)

            Text(detail)
                .font(.system(size: 12, weight: .bold))
                .lineSpacing(7.5)
                .foregroundStyle(DS.Surface.level400)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)

            extra()
        }
        .padding(16)
        .frame(maxWidth: .infinity, minHeight: 104, alignment: .leading)
        .background(
            selected ? DS.Wash.warning.opacity(0.6) : DS.Surface.level0,
            in: .rect(cornerRadius: DS.Radius.card)
        )
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.card).strokeBorder(
                selected ? Color(hex: 0xFCD34D) : DS.Surface.level100,
                lineWidth: 2
            )
        )
        .shadow(color: selected ? DS.Solid.warning.opacity(0.1) : .clear, radius: 12, y: 10)
    }

    // MARK: - 문항 수

    private var countSection: some View {
        VStack(alignment: .leading, spacing: 24) {
            QuizConfigSectionHead(
                title: state.countTitle,
                subtitle: state.countSubtitle,
                systemImage: "number"
            )

            VStack(alignment: .leading, spacing: 24) {
                HStack(alignment: .top) {
                    Text("\(state.countValue)")
                        .font(.system(size: 48, weight: .black))
                        .tracking(-2.4)
                        .monospacedDigit()
                        .foregroundStyle(DS.Surface.level900)
                        .overlay(alignment: .topTrailing) {
                            DSBadge(text: state.countBadge, tone: .brand, style: .pill, size: .xs)
                                .fixedSize()
                                .offset(x: 48, y: -16)
                        }

                    Spacer(minLength: 0)

                    VStack(alignment: .trailing, spacing: 4) {
                        Text(state.countMaxLabel.uppercased())
                            .font(.system(size: 10, weight: .black))
                            .tracking(1)
                            .foregroundStyle(DS.Surface.level400)
                        Text("\(state.countUpperBound)")
                            .font(.system(size: 14, weight: .black))
                            .monospacedDigit()
                            .foregroundStyle(DS.Surface.level600)
                    }
                }

                VStack(spacing: 16) {
                    QuizCountSlider(
                        value: state.countValue,
                        range: 1...max(1, state.countUpperBound),
                        onChange: { state.setCount($0) }
                    )

                    HStack {
                        Text(state.sliderLeadingLabel.uppercased())
                        Spacer(minLength: 8)
                        Text(state.sliderTrailingLabel.uppercased())
                    }
                    .font(.system(size: 10, weight: .black))
                    .tracking(1)
                    .foregroundStyle(DS.Surface.level300)
                }
                .padding(.vertical, 8)

                if state.isMixed {
                    Text("전체 단어를 \(state.countValue)개씩 묶어 세트별로 진행합니다. 각 세트가 끝나면 잠깐 멈추고 다음 학습으로 넘어갈 수 있습니다.")
                        .font(.system(size: 12, weight: .bold))
                        .lineSpacing(7.5)
                        .foregroundStyle(DS.Surface.level500)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(.horizontal, 4)
            .padding(.top, 16)
        }
    }

    // MARK: - 사운드 / AI / 난이도

    private var soundSection: some View {
        VStack(alignment: .leading, spacing: 24) {
            QuizConfigSectionHead(
                title: "사운드 설정",
                subtitle: "효과음 및 자동 발음 제어",
                systemImage: "speaker.wave.2",
                tone: .brand
            )

            QuizToggleCard(
                isOn: $state.soundEnabled,
                title: "사운드 \(state.soundEnabled ? "활성화" : "비활성화")",
                detail: "발음 자동 재생 및 정답 효과음이 \(state.soundEnabled ? "들립니다." : "나오지 않습니다.")",
                tone: .brand,
                activeSymbol: "speaker.wave.2.fill"
            )
        }
    }

    private var aiSection: some View {
        VStack(alignment: .leading, spacing: 24) {
            QuizConfigSectionHead(
                title: "AI 학습 모드",
                subtitle: "지능형 채점 및 문맥 기반 생성",
                systemImage: "sparkles",
                tone: .warning
            )

            QuizToggleCard(
                isOn: $state.aiMode,
                title: "AI Assistant \(state.aiMode ? "ON" : "OFF")",
                detail: "단어의 미세한 뉘앙스를 파악하고 지능형 문제를 생성합니다.",
                tone: .warning,
                activeSymbol: "sparkles"
            )
        }
        .padding(.top, 16)
        .overlay(alignment: .top) {
            Rectangle().fill(DS.Surface.level50).frame(height: 1)
        }
    }

    private var difficultySection: some View {
        VStack(alignment: .leading, spacing: 24) {
            QuizConfigSectionHead(
                title: "난이도",
                subtitle: "문제의 지문 길이와 추론 밀도를 고릅니다",
                systemImage: "target",
                tone: .accent
            )

            VStack(spacing: 12) {
                ForEach(ToeflDifficulty.allCases) { level in
                    difficultyCard(level)
                }
            }
        }
    }

    private func difficultyCard(_ level: ToeflDifficulty) -> some View {
        let selected = state.targetScore == level

        return Button {
            state.targetScore = level
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                Text(level.label)
                    .font(.system(size: 14, weight: .black))
                    .foregroundStyle(
                        selected
                            ? Color.adaptive(light: 0x4C1D95, dark: 0xEDE9FE)
                            : DS.Surface.level700
                    )
                Text(level.caption)
                    .font(.system(size: 12, weight: .bold))
                    .lineSpacing(7.5)
                    .foregroundStyle(DS.Surface.level500)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                selected ? DS.Wash.accent : DS.Surface.level0,
                in: .rect(cornerRadius: DS.Radius.card)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DS.Radius.card).strokeBorder(
                    selected ? Color(hex: 0xC4B5FD) : DS.Surface.level100,
                    lineWidth: selected ? 2 : 1
                )
            )
            .dsShadow(selected ? .card : .soft)
        }
        .buttonStyle(.plain)
        .animation(.smooth(duration: 0.2), value: selected)
    }

    // MARK: - 푸터

    private var footer: some View {
        VStack(spacing: 12) {
            Button("뒤로 가기") { dismiss() }
                .font(.system(size: 14, weight: .bold))
                .tracking(-0.35)
                .foregroundStyle(DS.Surface.level600)
                .frame(maxWidth: .infinity, minHeight: 48)
                .buttonStyle(.plain)

            Button {
                onStart(state.launch())
                dismiss()
            } label: {
                HStack(spacing: 10) {
                    Text("퀴즈 시작하기")
                    Image(systemName: "play.fill").font(.system(size: 14, weight: .bold))
                }
                .font(.system(size: 16, weight: .bold))
                .tracking(-0.4)
                .foregroundStyle(state.startDisabled ? DS.Surface.level400 : .white)
                .frame(maxWidth: .infinity, minHeight: 48)
                .background(
                    state.startDisabled ? DS.Surface.level100 : DS.Solid.brand,
                    in: .rect(cornerRadius: DS.Radius.lg)
                )
            }
            .buttonStyle(.plain)
            .disabled(state.startDisabled)
            .dsShadow(state.startDisabled ? .soft : .glowBrand)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(DS.Surface.level0)
        .overlay(alignment: .top) {
            Rectangle().fill(DS.Surface.level100).frame(height: 1)
        }
    }
}
