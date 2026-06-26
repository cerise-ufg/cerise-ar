import SwiftUI

@main
struct CeriseARApp: App {
    var body: some Scene {
        WindowGroup {
            HomeView()
                .preferredColorScheme(.dark)
        }
    }
}
