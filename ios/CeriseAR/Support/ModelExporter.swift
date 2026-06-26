import SwiftUI
import UIKit

/// Locates the bundled `.glb` file for a model so it can be exported / shared.
enum ModelBundle {
    static func url(for model: ArModel) -> URL? {
        Bundle.main.url(forResource: model.assetName, withExtension: "glb")
    }
}

/// Bridges UIKit's share sheet ("Salvar em Arquivos", AirDrop, etc.) into SwiftUI.
struct ActivityView: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
