package com.cerisear

import android.Manifest
import android.animation.ValueAnimator
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.Log
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.PixelCopy
import android.view.View
import android.view.animation.OvershootInterpolator
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import com.cerisear.databinding.ActivityArBinding
import com.google.android.material.snackbar.Snackbar
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import com.google.ar.core.Config
import com.google.ar.core.Plane
import com.google.ar.core.TrackingFailureReason
import io.github.sceneview.ar.arcore.getUpdatedPlanes
import io.github.sceneview.ar.node.AnchorNode
import io.github.sceneview.math.Position
import io.github.sceneview.math.Scale
import io.github.sceneview.node.ModelNode
import kotlinx.coroutines.launch

/**
 * The augmented-reality experience. Detects planes, lets the user tap to place the
 * chosen model (which can then be dragged, rotated and scaled), plays embedded
 * animations and animates a "pop-in" when each model lands.
 */
class ArActivity : AppCompatActivity() {

    private lateinit var binding: ActivityArBinding
    private lateinit var model: ArModel

    private val placedAnchors = mutableListOf<AnchorNode>()
    private var planesDetected = false
    private var isPlacing = false

    private val cameraPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) startArSession()
            else {
                toast(getString(R.string.camera_permission_required))
                finish()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityArBinding.inflate(layoutInflater)
        setContentView(binding.root)

        model = ModelCatalog.byId(intent.getStringExtra(ModelCatalog.EXTRA_MODEL_ID))

        applyInsets()
        bindOverlay()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED
        ) {
            startArSession()
        } else {
            cameraPermission.launch(Manifest.permission.CAMERA)
        }
    }

    private fun applyInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(binding.overlay) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(
                v.paddingLeft, bars.top, v.paddingRight, bars.bottom
            )
            insets
        }
    }

    private fun bindOverlay() {
        binding.modelChip.text = model.title
        binding.backButton.setOnClickListener {
            finish()
            overridePendingTransition(R.anim.fade_in, R.anim.fade_out)
        }
        binding.clearButton.setOnClickListener { clearScene() }
        binding.captureButton.setOnClickListener { capturePhoto() }
        updateInstruction()
        updateCount()
    }

    private fun startArSession() {
        binding.sceneView.apply {
            lifecycle = this@ArActivity.lifecycle
            planeRenderer.isEnabled = true

            configureSession { session, config ->
                config.planeFindingMode = Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
                config.depthMode = if (session.isDepthModeSupported(Config.DepthMode.AUTOMATIC))
                    Config.DepthMode.AUTOMATIC else Config.DepthMode.DISABLED
                config.instantPlacementMode = Config.InstantPlacementMode.DISABLED
                config.lightEstimationMode = Config.LightEstimationMode.ENVIRONMENTAL_HDR
                config.focusMode = Config.FocusMode.AUTO
            }

            onSessionUpdated = { _, frame ->
                if (!planesDetected && frame.getUpdatedPlanes().isNotEmpty()) {
                    planesDetected = true
                    runOnUiThread { updateInstruction() }
                }
            }

            onTrackingFailureChanged = { reason ->
                runOnUiThread { onTrackingFailure(reason) }
            }

            onSessionFailed = { exception ->
                Log.e(TAG, "AR session failed", exception)
                runOnUiThread { toast(getString(R.string.ar_init_error)) }
            }
        }

        // Taps place a new model; returning false keeps SceneView's own
        // drag / rotate / pinch-to-scale gestures working on placed nodes.
        val tapDetector = GestureDetector(this, object : GestureDetector.SimpleOnGestureListener() {
            override fun onSingleTapConfirmed(e: MotionEvent): Boolean {
                placeAt(e.x, e.y)
                return true
            }
        })
        binding.sceneView.setOnTouchListener { _, event ->
            tapDetector.onTouchEvent(event)
            false
        }
    }

    private fun placeAt(x: Float, y: Float) {
        if (isPlacing) return
        val frame = binding.sceneView.frame ?: return
        val hit = frame.hitTest(x, y).firstOrNull {
            val trackable = it.trackable
            trackable is Plane && trackable.isPoseInPolygon(it.hitPose)
        } ?: return

        isPlacing = true
        binding.loadingView.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                val instance = binding.sceneView.modelLoader.loadModelInstance(model.assetPath)
                    ?: throw IllegalStateException("null model instance")

                val anchorNode = AnchorNode(binding.sceneView.engine, hit.createAnchor())

                // The visible node receives the gestures — make it fully transformable
                // (drag to move, twist to rotate, pinch to scale).
                val modelNode = ModelNode(
                    modelInstance = instance,
                    scaleToUnits = model.scaleToUnits,
                    autoAnimate = model.animated,
                    centerOrigin = Position(y = -0.5f)
                ).apply {
                    isEditable = true
                    isPositionEditable = true
                    isRotationEditable = true
                    isScaleEditable = true
                }

                anchorNode.addChildNode(modelNode)
                binding.sceneView.addChildNode(anchorNode)
                placedAnchors.add(anchorNode)

                animatePopIn(anchorNode)
                planesDetected = true
                updateInstruction()
                updateCount()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load model ${model.assetPath}", e)
                toast(getString(R.string.model_load_error))
            } finally {
                binding.loadingView.visibility = View.GONE
                isPlacing = false
            }
        }
    }

    /** Scale the placed model up from nothing with a springy overshoot. */
    private fun animatePopIn(node: AnchorNode) {
        ValueAnimator.ofFloat(0.01f, 1f).apply {
            duration = 480
            interpolator = OvershootInterpolator(2.2f)
            addUpdateListener { a ->
                val s = a.animatedValue as Float
                node.scale = Scale(s, s, s)
            }
            start()
        }
    }

    private fun clearScene() {
        if (placedAnchors.isEmpty()) return
        placedAnchors.forEach { binding.sceneView.removeChildNode(it) }
        placedAnchors.clear()
        updateInstruction()
        updateCount()
        binding.clearButton.animate()
            .rotationBy(360f).setDuration(420).start()
    }

    private fun onTrackingFailure(reason: TrackingFailureReason?) {
        if (reason != null && placedAnchors.isEmpty()) {
            binding.instructionCard.visibility = View.VISIBLE
            binding.instructionText.text = getString(R.string.ar_scan_hint)
        }
    }

    private fun updateInstruction() {
        when {
            placedAnchors.isNotEmpty() -> {
                binding.instructionText.text = getString(R.string.ar_placed)
                fadeOutInstruction()
            }
            planesDetected -> {
                binding.instructionCard.visibility = View.VISIBLE
                binding.instructionText.text = getString(R.string.ar_tap_hint)
            }
            else -> {
                binding.instructionCard.visibility = View.VISIBLE
                binding.instructionText.text = getString(R.string.ar_scan_hint)
            }
        }
    }

    private fun fadeOutInstruction() {
        binding.instructionCard.animate()
            .alpha(0f).setStartDelay(2200).setDuration(400)
            .withEndAction {
                binding.instructionCard.visibility = View.GONE
                binding.instructionCard.alpha = 1f
            }.start()
    }

    private fun updateCount() {
        val count = placedAnchors.size
        binding.countChip.visibility = if (count > 0) View.VISIBLE else View.GONE
        binding.countChip.text = getString(R.string.ar_model_count, count)
        binding.clearButton.visibility = if (count > 0) View.VISIBLE else View.GONE
    }

    // ---- Photo capture ----------------------------------------------------------

    /** Capture the live camera + placed 3D models (overlay UI excluded) to an image. */
    private fun capturePhoto() {
        val view = binding.sceneView
        if (view.width == 0 || view.height == 0) {
            snackbar(getString(R.string.photo_failed)); return
        }
        val bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
        try {
            // SceneView is a SurfaceView, so PixelCopy grabs the GL content directly.
            PixelCopy.request(view, bitmap, { result ->
                if (result == PixelCopy.SUCCESS) {
                    flashShutter()
                    savePhoto(bitmap)
                } else {
                    snackbar(getString(R.string.photo_failed))
                }
            }, Handler(Looper.getMainLooper()))
        } catch (e: Exception) {
            Log.e(TAG, "PixelCopy failed", e)
            snackbar(getString(R.string.photo_failed))
        }
    }

    private fun flashShutter() {
        binding.shutterFlash.apply {
            alpha = 0f
            animate().alpha(0.85f).setDuration(70)
                .withEndAction { animate().alpha(0f).setDuration(220).start() }
                .start()
        }
    }

    private fun savePhoto(bitmap: Bitmap) {
        val name = "CeriseAR_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())}.jpg"

        // Always keep a cache copy so the photo can be shared on any API level.
        val shareUri: Uri? = runCatching {
            val dir = File(cacheDir, "shared").apply { mkdirs() }
            val file = File(dir, name)
            file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 95, it) }
            FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
        }.getOrNull()

        // Publish it to the gallery (minSdk 29 → no storage permission required).
        val inGallery = saveToGallery(bitmap, name)

        val message = if (inGallery) getString(R.string.photo_saved_gallery)
        else getString(R.string.photo_saved)
        val bar = Snackbar.make(binding.overlay, message, Snackbar.LENGTH_LONG)
            .setAnchorView(binding.captureButton)
        if (shareUri != null) bar.setAction(R.string.share_photo) { sharePhoto(shareUri) }
        bar.show()
    }

    private fun saveToGallery(bitmap: Bitmap, name: String): Boolean = runCatching {
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, name)
            put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
            put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/CeriseAR")
            put(MediaStore.Images.Media.IS_PENDING, 1)
        }
        val resolver = contentResolver
        val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
            ?: return false
        resolver.openOutputStream(uri)?.use { bitmap.compress(Bitmap.CompressFormat.JPEG, 95, it) }
        values.clear()
        values.put(MediaStore.Images.Media.IS_PENDING, 0)
        resolver.update(uri, values, null, null)
        true
    }.getOrDefault(false)

    private fun sharePhoto(uri: Uri) {
        val share = Intent(Intent.ACTION_SEND).apply {
            type = "image/jpeg"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, getString(R.string.share_subject))
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        startActivity(Intent.createChooser(share, getString(R.string.share_photo)))
    }

    private fun snackbar(message: String) {
        Snackbar.make(binding.overlay, message, Snackbar.LENGTH_LONG)
            .setAnchorView(binding.captureButton).show()
    }

    private fun toast(message: String) =
        android.widget.Toast.makeText(this, message, android.widget.Toast.LENGTH_LONG).show()

    override fun finish() {
        super.finish()
        overridePendingTransition(R.anim.fade_in, R.anim.fade_out)
    }

    companion object {
        private const val TAG = "ArActivity"
    }
}
