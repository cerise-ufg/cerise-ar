import SwiftUI

/// A 3D model bundled with the app (mirrors the Android `ArModel`).
struct ArModel: Identifiable, Hashable {
    let id: String
    let title: String
    let subtitle: String
    let category: String
    /// Resource name in the bundle, without extension (e.g. "robot" -> robot.glb).
    let assetName: String
    /// SF Symbol used as the card icon.
    let symbol: String
    let accent: Color
    /// The model is scaled so its largest dimension equals this many meters.
    let targetSize: Float
    let animated: Bool
    let author: String
    let license: String

    static func == (lhs: ArModel, rhs: ArModel) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

enum ModelCatalog {
    static let all = "Todos"

    static let models: [ArModel] = [
        ArModel(id: "robot", title: "Robô Expressivo", subtitle: "Modelo animado",
                category: "Robótica", assetName: "robot", symbol: "gearshape.2.fill",
                accent: Brand.cerise, targetSize: 0.6, animated: true,
                author: "Tomás Laulhé / Don McCurdy", license: "CC0"),
        ArModel(id: "pikachu", title: "Pikachu", subtitle: "Criatura · Pokémon",
                category: "Pokémon", assetName: "pikachu", symbol: "bolt.fill",
                accent: Brand.yellow, targetSize: 0.4, animated: false,
                author: "Tipatat Chennavasin (Poly Pizza)", license: "CC-BY"),
        ArModel(id: "parrot", title: "Arara", subtitle: "Pássaro animado",
                category: "Natureza", assetName: "parrot", symbol: "hare.fill",
                accent: Brand.cyan, targetSize: 0.5, animated: true,
                author: "mirada (three.js)", license: "CC-BY"),
        ArModel(id: "flower", title: "Rosas", subtitle: "Flores · natureza",
                category: "Natureza", assetName: "flower", symbol: "leaf.fill",
                accent: Brand.green, targetSize: 0.5, animated: false,
                author: "Christopher F (Poly Pizza)", license: "CC-BY"),
        ArModel(id: "toy", title: "Action Figure", subtitle: "Colecionável · Macross",
                category: "Brinquedos", assetName: "toy", symbol: "airplane",
                accent: Brand.orange, targetSize: 0.5, animated: false,
                author: "Tipatat Chennavasin (Poly Pizza)", license: "CC-BY"),
        ArModel(id: "duck", title: "Patinho", subtitle: "Brinquedo clássico",
                category: "Brinquedos", assetName: "duck", symbol: "tortoise.fill",
                accent: Brand.yellow, targetSize: 0.4, animated: false,
                author: "Sony (Khronos glTF Sample)", license: "CC-BY"),
        ArModel(id: "astronaut", title: "Astronauta", subtitle: "Exploração espacial",
                category: "Espaço", assetName: "astronaut", symbol: "sparkles",
                accent: Brand.blue, targetSize: 0.55, animated: false,
                author: "Poly by Google", license: "CC-BY"),
        ArModel(id: "helmet", title: "Capacete", subtitle: "PBR de alta fidelidade",
                category: "Tecnologia", assetName: "helmet", symbol: "shield.fill",
                accent: Brand.purple, targetSize: 0.45, animated: false,
                author: "ctxwing · theblueturtle_", license: "CC-BY"),
    ]

    static var categories: [String] {
        [all] + models.map(\.category).reduce(into: [String]()) { acc, c in
            if !acc.contains(c) { acc.append(c) }
        }
    }

    static func inCategory(_ category: String) -> [ArModel] {
        category == all ? models : models.filter { $0.category == category }
    }

    static func creditsText() -> String {
        var s = "Modelos 3D incluídos neste app e seus autores:\n"
        for m in models {
            s += "\n• \(m.title) — \(m.author) (\(m.license))"
        }
        s += "\n\nFonte e licenças: poly.pizza, Khronos glTF Sample Assets e three.js. "
        s += "Tipografia: Work Sans (OFL). Marca: CERISE / UFG."
        return s
    }
}
