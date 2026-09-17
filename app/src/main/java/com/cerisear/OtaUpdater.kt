package com.cerisear

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.core.content.FileProvider
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * ESP32-style over-the-air self-update for the sideloaded Android build.
 *
 * The app fetches a small JSON manifest ([BuildConfig.OTA_MANIFEST_URL]); if it
 * advertises a higher [BuildConfig.VERSION_CODE], the user is offered the update,
 * the new APK is downloaded to the cache and handed to the system installer.
 *
 * Every OTA APK must be signed with the SAME keystore as the installed build,
 * or Android refuses the update (see keystore.properties / build.gradle.kts).
 */
object OtaUpdater {
    private const val TAG = "OtaUpdater"

    private data class Manifest(
        val versionCode: Int,
        val versionName: String,
        val apkUrl: String,
        val notes: String,
    )

    /**
     * @param silent when true (auto-check on launch) nothing is shown unless an
     *   update exists; when false (manual check) also reports "up to date"/errors.
     */
    fun checkForUpdate(activity: Activity, silent: Boolean = true) {
        Thread {
            val manifest = fetchManifest()
            if (manifest == null) {
                if (!silent) runOnUi(activity) {
                    toast(activity, "Não foi possível verificar atualizações agora.")
                }
                return@Thread
            }
            if (manifest.versionCode <= BuildConfig.VERSION_CODE) {
                if (!silent) runOnUi(activity) {
                    toast(activity, "Você já está na versão mais recente (${BuildConfig.VERSION_NAME}).")
                }
                return@Thread
            }
            runOnUi(activity) { promptUpdate(activity, manifest) }
        }.start()
    }

    private fun fetchManifest(): Manifest? = try {
        val conn = (URL(BuildConfig.OTA_MANIFEST_URL).openConnection() as HttpURLConnection).apply {
            connectTimeout = 8000
            readTimeout = 8000
            requestMethod = "GET"
        }
        conn.inputStream.bufferedReader().use { reader ->
            val json = JSONObject(reader.readText())
            Manifest(
                versionCode = json.getInt("versionCode"),
                versionName = json.optString("versionName", ""),
                apkUrl = json.getString("apkUrl"),
                notes = json.optString("notes", ""),
            )
        }
    } catch (e: Exception) {
        Log.w(TAG, "fetchManifest failed", e)
        null
    }

    private fun promptUpdate(activity: Activity, m: Manifest) {
        val message = buildString {
            append("A versão ${m.versionName} está disponível.")
            append("\nVocê tem a ${BuildConfig.VERSION_NAME}.")
            if (m.notes.isNotBlank()) append("\n\n${m.notes}")
        }
        MaterialAlertDialogBuilder(activity)
            .setTitle("Atualização disponível")
            .setMessage(message)
            .setCancelable(false)
            .setPositiveButton("Atualizar") { _, _ -> ensurePermissionThenInstall(activity, m) }
            .setNegativeButton("Agora não", null)
            .show()
    }

    private fun ensurePermissionThenInstall(activity: Activity, m: Manifest) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            !activity.packageManager.canRequestPackageInstalls()
        ) {
            MaterialAlertDialogBuilder(activity)
                .setTitle("Permitir instalação")
                .setMessage("Para instalar a atualização, ative \"Permitir desta fonte\" para o CERISE AR e toque em Atualizar de novo.")
                .setPositiveButton("Abrir configurações") { _, _ ->
                    runCatching {
                        activity.startActivity(
                            Intent(
                                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                Uri.parse("package:${activity.packageName}"),
                            )
                        )
                    }
                }
                .setNegativeButton("Cancelar", null)
                .show()
            return
        }
        downloadAndInstall(activity, m)
    }

    private fun downloadAndInstall(activity: Activity, m: Manifest) {
        val bar = ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal).apply {
            isIndeterminate = false
            max = 100
        }
        val label = TextView(activity).apply { text = "Baixando atualização…" }
        val container = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            val pad = (24 * activity.resources.displayMetrics.density).toInt()
            setPadding(pad, pad, pad, pad)
            gravity = Gravity.CENTER_VERTICAL
            addView(label)
            addView(bar)
        }
        val dialog: AlertDialog = MaterialAlertDialogBuilder(activity)
            .setView(container)
            .setCancelable(false)
            .create()
        dialog.show()

        Thread {
            try {
                val dir = File(activity.cacheDir, "updates").apply { mkdirs() }
                dir.listFiles()?.forEach { it.delete() }
                val out = File(dir, "cerise-${m.versionCode}.apk")

                val conn = (URL(m.apkUrl).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 8000
                    readTimeout = 30000
                }
                val total = conn.contentLength
                conn.inputStream.use { input ->
                    out.outputStream().use { output ->
                        val buffer = ByteArray(16 * 1024)
                        var downloaded = 0
                        while (true) {
                            val n = input.read(buffer)
                            if (n < 0) break
                            output.write(buffer, 0, n)
                            downloaded += n
                            if (total > 0) {
                                val pct = (downloaded * 100L / total).toInt()
                                runOnUi(activity) { bar.progress = pct }
                            }
                        }
                    }
                }

                val uri = FileProvider.getUriForFile(
                    activity, "${activity.packageName}.fileprovider", out
                )
                val install = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, "application/vnd.android.package-archive")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                runOnUi(activity) {
                    dialog.dismiss()
                    activity.startActivity(install)
                }
            } catch (e: Exception) {
                Log.w(TAG, "download/install failed", e)
                runOnUi(activity) {
                    dialog.dismiss()
                    toast(activity, "Falha ao baixar a atualização.")
                }
            }
        }.start()
    }

    private fun runOnUi(activity: Activity, block: () -> Unit) {
        if (!activity.isFinishing) activity.runOnUiThread { if (!activity.isFinishing) block() }
    }

    private fun toast(context: Context, message: String) =
        Toast.makeText(context, message, Toast.LENGTH_LONG).show()
}
