import SwiftUI

struct HomeView: View {
    @State private var selectedCategory = ModelCatalog.all
    @State private var selected = ModelCatalog.models.first!
    @State private var showAR = false
    @State private var showCredits = false
    @State private var showShare = false
    @State private var appeared = false

    private var filtered: [ArModel] { ModelCatalog.inCategory(selectedCategory) }

    var body: some View {
        ZStack {
            Brand.homeGradient.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar
                ScrollView(showsIndicators: false) { content }
                ctaButton
                    .padding(.horizontal, 18)
                    .padding(.top, 8)
                footer
            }
        }
        .fullScreenCover(isPresented: $showAR) {
            ARContainer(model: selected) { showAR = false }
                .ignoresSafeArea()
        }
        .sheet(isPresented: $showCredits) { CreditsView() }
        .sheet(isPresented: $showShare) {
            if let url = ModelBundle.url(for: selected) { ActivityView(items: [url]) }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.55)) { appeared = true }
        }
        .onChange(of: selectedCategory) { _ in
            if !filtered.contains(selected) { selected = filtered.first ?? selected }
        }
    }

    // MARK: - Sections

    private var topBar: some View {
        HStack {
            Spacer()
            Menu {
                Button { showShare = true } label: {
                    Label("Exportar modelo", systemImage: "square.and.arrow.up")
                }
                Button { showCredits = true } label: {
                    Label("Créditos dos modelos", systemImage: "info.circle")
                }
            } label: {
                Image(systemName: "ellipsis.circle.fill")
                    .font(.system(size: 26))
                    .foregroundColor(.white)
                    .padding(12)
            }
        }
    }

    private var content: some View {
        VStack(spacing: 18) {
            hero
            categoryScroller
            picker
            detailCard
        }
        .padding(.bottom, 10)
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 24)
    }

    private var hero: some View {
        VStack(spacing: 12) {
            // Official CERISE logo on a white card (reads on the magenta gradient).
            Image("LogoCerise")
                .resizable()
                .scaledToFit()
                .frame(height: 34)
                .padding(.horizontal, 22)
                .padding(.vertical, 14)
                .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(.white))
                .shadow(color: .black.opacity(0.18), radius: 8, y: 4)
            Text("Tecnologias Imersivas · Realidade Aumentada")
                .font(.work(12, .semibold))
                .foregroundColor(.white.opacity(0.95))
                .padding(.horizontal, 16).padding(.vertical, 7)
                .background(Capsule().fill(.white.opacity(0.12)))
                .overlay(Capsule().stroke(.white.opacity(0.3), lineWidth: 1))
        }
        .padding(.top, 4)
    }

    private var categoryScroller: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Categorias")
                .font(.work(13, .semibold))
                .foregroundColor(.white.opacity(0.7))
                .padding(.leading, 22)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(ModelCatalog.categories, id: \.self) { category in
                        CategoryChip(title: category,
                                     selected: category == selectedCategory)
                            .onTapGesture {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    selectedCategory = category
                                }
                            }
                    }
                }
                .padding(.horizontal, 18)
            }
        }
    }

    private var picker: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Escolha um modelo 3D")
                .font(.work(20, .bold))
                .foregroundColor(.white)
                .padding(.leading, 22)
            Text("Toque em um modelo e inicie a experiência em AR.")
                .font(.work(13))
                .foregroundColor(.white.opacity(0.7))
                .padding(.leading, 22)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 14) {
                    ForEach(filtered) { model in
                        ModelCardView(model: model, selected: model == selected)
                            .onTapGesture {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                    selected = model
                                }
                            }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 12)
            }
        }
    }

    private var detailCard: some View {
        VStack(spacing: 12) {
            HStack(spacing: 14) {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(selected.accent)
                    .frame(width: 52, height: 52)
                    .overlay(Image(systemName: selected.symbol)
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundColor(.white))
                VStack(alignment: .leading, spacing: 2) {
                    Text(selected.title)
                        .font(.work(17, .bold)).foregroundColor(.white)
                    Text("\(selected.category) · \(selected.subtitle)")
                        .font(.work(13)).foregroundColor(.white.opacity(0.7))
                        .lineLimit(1)
                }
                Spacer()
            }
            Button { showShare = true } label: {
                Label("Exportar .glb", systemImage: "square.and.arrow.up")
                    .font(.work(15, .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 11)
                    .foregroundColor(.white)
                    .overlay(RoundedRectangle(cornerRadius: 22)
                        .stroke(.white.opacity(0.4), lineWidth: 1))
            }
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 22).fill(.white.opacity(0.1)))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(.white.opacity(0.15), lineWidth: 1))
        .padding(.horizontal, 18)
    }

    private var ctaButton: some View {
        Button {
            showAR = true
        } label: {
            Label("Iniciar em AR", systemImage: "arkit")
                .font(.work(17, .bold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .foregroundColor(.white)
                .background(Capsule().fill(Brand.cerise))
        }
    }

    private var footer: some View {
        Text("Explorando o futuro")
            .font(.work(12))
            .foregroundColor(.white.opacity(0.75))
            .padding(.vertical, 12)
    }
}

// MARK: - Cards

private struct CategoryChip: View {
    let title: String
    let selected: Bool
    var body: some View {
        Text(title)
            .font(.work(13, .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 16).padding(.vertical, 8)
            .background(Capsule().fill(selected ? Brand.cerise : Color.white.opacity(0.15)))
            .overlay(Capsule().stroke(.white.opacity(0.25), lineWidth: 1))
    }
}

private struct ModelCardView: View {
    let model: ArModel
    let selected: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topTrailing) {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(model.accent)
                    .frame(width: 64, height: 64)
                    .overlay(Image(systemName: model.symbol)
                        .font(.system(size: 28, weight: .semibold))
                        .foregroundColor(.white))
                if selected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(Brand.cerise)
                        .background(Circle().fill(.white))
                        .offset(x: 8, y: -8)
                }
            }
            Text(model.title)
                .font(.work(16, .bold))
                .foregroundColor(Brand.ink)
                .lineLimit(1)
                .padding(.top, 14)
            Text(model.subtitle)
                .font(.work(12))
                .foregroundColor(Brand.ink.opacity(0.55))
                .lineLimit(2)
                .frame(height: 32, alignment: .top)
            if model.animated {
                Text("ANIMADO")
                    .font(.work(10, .bold))
                    .tracking(1)
                    .foregroundColor(.white)
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .background(Capsule().fill(Brand.cerise))
                    .padding(.top, 2)
            }
        }
        .padding(16)
        .frame(width: 158, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(.white))
        .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous)
            .stroke(model.accent, lineWidth: selected ? 2.5 : 0))
        .shadow(color: .black.opacity(selected ? 0.25 : 0.1),
                radius: selected ? 10 : 4, y: 4)
        .scaleEffect(selected ? 1.0 : 0.96)
    }
}
