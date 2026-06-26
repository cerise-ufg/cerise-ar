import SwiftUI

struct CreditsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                Text(ModelCatalog.creditsText())
                    .font(.work(15))
                    .lineSpacing(3)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(20)
            }
            .navigationTitle("Créditos")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fechar") { dismiss() }
                }
            }
        }
    }
}
