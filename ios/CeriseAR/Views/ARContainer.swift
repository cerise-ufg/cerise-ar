import SwiftUI

/// Hosts the UIKit/ARKit experience inside SwiftUI.
struct ARContainer: UIViewControllerRepresentable {
    let model: ArModel
    var onClose: () -> Void

    func makeUIViewController(context: Context) -> ARViewController {
        let controller = ARViewController()
        controller.model = model
        controller.onClose = onClose
        return controller
    }

    func updateUIViewController(_ controller: ARViewController, context: Context) {}
}
