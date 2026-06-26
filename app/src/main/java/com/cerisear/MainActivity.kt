package com.cerisear

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.view.animation.AnimationUtils
import android.view.animation.OvershootInterpolator
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.cerisear.databinding.ActivityMainBinding
import com.google.android.material.chip.Chip
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import java.io.File

/**
 * Branded CERISE home screen: hero, category filter, a horizontal catalog of 3D
 * models, a detail card with export, and a CTA that opens the AR experience.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var adapter: ModelAdapter
    private var selected: ArModel = ModelCatalog.models.first()

    /** SAF "create document" target for exporting the selected model to a file. */
    private val saveModelLauncher =
        registerForActivityResult(ActivityResultContracts.CreateDocument(MIME_GLB)) { uri ->
            uri?.let { writeSelectedModelTo(it) }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        applyInsets()
        setupCategories()
        setupCatalog()
        setupCta()
        binding.exportButton.setOnClickListener { showExportOptions() }
        playIntroAnimations()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() = finish()
        })
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.menu_home, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean = when (item.itemId) {
        R.id.action_export -> { showExportOptions(); true }
        R.id.action_credits -> { showCredits(); true }
        else -> super.onOptionsItemSelected(item)
    }

    private fun applyInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(0, bars.top, 0, bars.bottom)
            insets
        }
    }

    private fun setupCategories() {
        ModelCatalog.categories.forEachIndexed { index, category ->
            val chip = layoutInflater.inflate(
                R.layout.item_category_chip, binding.categoryChips, false
            ) as Chip
            chip.text = category
            chip.id = View.generateViewId()
            chip.isChecked = index == 0
            binding.categoryChips.addView(chip)
        }
        binding.categoryChips.setOnCheckedStateChangeListener { group, checkedIds ->
            val id = checkedIds.firstOrNull() ?: return@setOnCheckedStateChangeListener
            val category = (group.findViewById<Chip>(id))?.text?.toString() ?: ModelCatalog.CAT_ALL
            applyCategory(category)
        }
    }

    private fun setupCatalog() {
        adapter = ModelAdapter(ModelCatalog.inCategory(ModelCatalog.CAT_ALL)) { model ->
            selected = model
            updateDetail(model)
        }
        binding.modelList.layoutManager =
            LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
        binding.modelList.adapter = adapter
        adapter.select(selected.id)
        updateDetail(selected)
        runCatalogAnimation()
    }

    private fun applyCategory(category: String) {
        val items = ModelCatalog.inCategory(category)
        adapter.submit(items)
        // Keep the current selection if it survives the filter; otherwise pick the first.
        selected = items.firstOrNull { it.id == selected.id } ?: items.first()
        adapter.select(selected.id)
        updateDetail(selected)
        binding.modelList.scrollToPosition(0)
        runCatalogAnimation()
    }

    private fun runCatalogAnimation() {
        binding.modelList.layoutAnimation =
            AnimationUtils.loadLayoutAnimation(this, R.anim.layout_animation_slide_up)
        binding.modelList.scheduleLayoutAnimation()
    }

    private fun updateDetail(model: ArModel) {
        binding.detailTitle.text = model.title
        binding.detailSubtitle.text = "${model.category} · ${model.subtitle}"
        binding.detailIcon.setImageResource(model.iconRes)
        binding.detailBackdrop.setCardBackgroundColor(
            ContextCompat.getColor(this, model.accentColorRes)
        )
    }

    private fun setupCta() {
        binding.startButton.setOnClickListener { v ->
            v.animate().scaleX(0.94f).scaleY(0.94f).setDuration(90)
                .withEndAction {
                    v.animate().scaleX(1f).scaleY(1f).setDuration(120)
                        .setInterpolator(OvershootInterpolator()).start()
                    launchAr()
                }.start()
        }
    }

    private fun launchAr() {
        startActivity(
            Intent(this, ArActivity::class.java)
                .putExtra(ModelCatalog.EXTRA_MODEL_ID, selected.id)
        )
        overridePendingTransition(R.anim.fade_in, R.anim.fade_out)
    }

    // ---- Export -----------------------------------------------------------------

    private fun showExportOptions() {
        val options = arrayOf(
            getString(R.string.export_save_file),
            getString(R.string.share_model)
        )
        MaterialAlertDialogBuilder(this)
            .setTitle(getString(R.string.choose_export, selected.title))
            .setItems(options) { _, which ->
                if (which == 0) saveModelLauncher.launch("${selected.id}.glb")
                else shareSelectedModel()
            }
            .show()
    }

    private fun writeSelectedModelTo(uri: Uri) {
        runCatching {
            assets.open(selected.assetPath).use { input ->
                contentResolver.openOutputStream(uri)?.use { output -> input.copyTo(output) }
                    ?: error("output stream unavailable")
            }
        }.onSuccess {
            snackbar(getString(R.string.export_success))
        }.onFailure {
            snackbar(getString(R.string.export_failed))
        }
    }

    private fun shareSelectedModel() {
        runCatching {
            val dir = File(cacheDir, "shared").apply { mkdirs() }
            val file = File(dir, "${selected.id}.glb")
            assets.open(selected.assetPath).use { input ->
                file.outputStream().use { output -> input.copyTo(output) }
            }
            val uri = FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
            val share = Intent(Intent.ACTION_SEND).apply {
                type = MIME_GLB
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, getString(R.string.share_subject))
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            startActivity(Intent.createChooser(share, getString(R.string.share_model)))
        }.onFailure {
            snackbar(getString(R.string.export_failed))
        }
    }

    private fun showCredits() {
        MaterialAlertDialogBuilder(this)
            .setTitle(R.string.credits_title)
            .setMessage(ModelCatalog.creditsText())
            .setPositiveButton(R.string.close, null)
            .show()
    }

    private fun snackbar(message: String) =
        Snackbar.make(binding.root, message, Snackbar.LENGTH_LONG)
            .setAnchorView(binding.startButton).show()

    // ---- Intro animations -------------------------------------------------------

    private fun playIntroAnimations() {
        val views = listOf(
            binding.logo, binding.sectionLabel,
            binding.categoryChips, binding.pickTitle, binding.pickHint,
            binding.modelList, binding.detailCard, binding.startButton
        )
        views.forEachIndexed { i, view ->
            view.alpha = 0f
            view.translationY = 40f
            view.animate().alpha(1f).translationY(0f)
                .setStartDelay(110L + i * 60L).setDuration(400).start()
        }
    }

    override fun onResume() {
        super.onResume()
        if (::adapter.isInitialized) adapter.select(selected.id)
    }

    companion object {
        private const val MIME_GLB = "model/gltf-binary"
    }
}
