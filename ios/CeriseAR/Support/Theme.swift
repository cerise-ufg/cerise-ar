import SwiftUI

/// CERISE brand palette — captured from cerise.ufg.br (matches the Android app).
enum Brand {
    static let cerise     = Color(hex: 0xC60463)
    static let ceriseDark = Color(hex: 0x9A0049)
    static let ceriseLight = Color(hex: 0xFCE7F1)
    static let purple     = Color(hex: 0x67046A)
    static let cyan       = Color(hex: 0x78D5EF)
    static let orange     = Color(hex: 0xF96D00)
    static let yellow     = Color(hex: 0xF4B400)
    static let green      = Color(hex: 0x1FAA6E)
    static let blue       = Color(hex: 0x2D6CDF)
    static let ink        = Color(hex: 0x1A1020)

    static let homeGradient = LinearGradient(
        colors: [cerise, Color(hex: 0x7E0859), ink],
        startPoint: .top, endPoint: .bottom
    )
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red:   Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue:  Double(hex & 0xFF) / 255.0,
            opacity: 1.0
        )
    }
}

extension Font {
    /// Work Sans (brand typeface), bundled as a variable font (family "Work Sans").
    static func work(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .custom("Work Sans", size: size).weight(weight)
    }
}
