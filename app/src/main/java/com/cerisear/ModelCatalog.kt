package com.cerisear

import androidx.annotation.ColorRes
import androidx.annotation.DrawableRes

/**
 * A 3D model bundled with the app and shown in the home catalog.
 *
 * @param assetPath path inside `src/main/assets`
 * @param scaleToUnits the model is uniformly scaled to fit a cube of this size, in meters
 * @param animated whether the GLB embeds animation that should auto-play
 * @param author / license attribution shown in the credits dialog
 */
data class ArModel(
    val id: String,
    val title: String,
    val subtitle: String,
    val category: String,
    val assetPath: String,
    @DrawableRes val iconRes: Int,
    @ColorRes val accentColorRes: Int,
    val scaleToUnits: Float,
    val animated: Boolean,
    val author: String,
    val license: String
)

object ModelCatalog {

    const val EXTRA_MODEL_ID = "com.cerisear.extra.MODEL_ID"

    const val CAT_ALL = "Todos"

    val models: List<ArModel> = listOf(
        ArModel(
            id = "robot", title = "Robô Expressivo", subtitle = "Modelo animado",
            category = "Robótica", assetPath = "models/robot.glb",
            iconRes = R.drawable.ic_model_robot, accentColorRes = R.color.cerise,
            scaleToUnits = 0.6f, animated = true,
            author = "Tomás Laulhé / Don McCurdy", license = "CC0"
        ),
        ArModel(
            id = "pikachu", title = "Pikachu", subtitle = "Criatura · Pokémon",
            category = "Pokémon", assetPath = "models/pikachu.glb",
            iconRes = R.drawable.ic_model_pikachu, accentColorRes = R.color.yellow,
            scaleToUnits = 0.4f, animated = false,
            author = "Tipatat Chennavasin (Poly Pizza)", license = "CC-BY"
        ),
        ArModel(
            id = "parrot", title = "Arara", subtitle = "Pássaro animado",
            category = "Natureza", assetPath = "models/parrot.glb",
            iconRes = R.drawable.ic_model_parrot, accentColorRes = R.color.cyan,
            scaleToUnits = 0.5f, animated = true,
            author = "mirada (three.js)", license = "CC-BY"
        ),
        ArModel(
            id = "flower", title = "Rosas", subtitle = "Flores · natureza",
            category = "Natureza", assetPath = "models/flower.glb",
            iconRes = R.drawable.ic_model_flower, accentColorRes = R.color.green,
            scaleToUnits = 0.5f, animated = false,
            author = "Christopher F (Poly Pizza)", license = "CC-BY"
        ),
        ArModel(
            id = "toy", title = "Action Figure", subtitle = "Colecionável · Macross",
            category = "Brinquedos", assetPath = "models/toy.glb",
            iconRes = R.drawable.ic_model_toy, accentColorRes = R.color.orange,
            scaleToUnits = 0.5f, animated = false,
            author = "Tipatat Chennavasin (Poly Pizza)", license = "CC-BY"
        ),
        ArModel(
            id = "duck", title = "Patinho", subtitle = "Brinquedo clássico",
            category = "Brinquedos", assetPath = "models/duck.glb",
            iconRes = R.drawable.ic_model_duck, accentColorRes = R.color.yellow,
            scaleToUnits = 0.4f, animated = false,
            author = "Sony (Khronos glTF Sample)", license = "CC-BY"
        ),
        ArModel(
            id = "astronaut", title = "Astronauta", subtitle = "Exploração espacial",
            category = "Espaço", assetPath = "models/astronaut.glb",
            iconRes = R.drawable.ic_model_astronaut, accentColorRes = R.color.blue,
            scaleToUnits = 0.55f, animated = false,
            author = "Poly by Google", license = "CC-BY"
        ),
        ArModel(
            id = "helmet", title = "Capacete", subtitle = "PBR de alta fidelidade",
            category = "Tecnologia", assetPath = "models/helmet.glb",
            iconRes = R.drawable.ic_model_helmet, accentColorRes = R.color.purple,
            scaleToUnits = 0.45f, animated = false,
            author = "ctxwing · theblueturtle_", license = "CC-BY"
        )
    )

    /** Distinct categories in catalog order, with "Todos" first. */
    val categories: List<String> =
        listOf(CAT_ALL) + models.map { it.category }.distinct()

    fun inCategory(category: String): List<ArModel> =
        if (category == CAT_ALL) models else models.filter { it.category == category }

    fun byId(id: String?): ArModel = models.firstOrNull { it.id == id } ?: models.first()

    /** Attribution text for the credits dialog. */
    fun creditsText(): String = buildString {
        append("Modelos 3D incluídos neste app e seus autores:\n")
        models.forEach { m ->
            append("\n• ").append(m.title).append(" — ")
                .append(m.author).append(" (").append(m.license).append(")")
        }
        append("\n\nFonte e licenças: poly.pizza, Khronos glTF Sample Assets e three.js. ")
        append("Tipografia: Work Sans (OFL). Marca: CERISE / UFG.")
    }
}
