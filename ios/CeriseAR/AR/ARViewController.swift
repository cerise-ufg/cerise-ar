import UIKit
import ARKit
import SceneKit
import GLTFKit2
import simd

/// The augmented-reality experience (mirrors the Android `ArActivity`):
/// plane detection + coaching, tap-to-place GLB models loaded with GLTFKit2,
/// embedded-animation playback, pinch / rotate / drag editing, a "pop-in"
/// placement animation, and a shutter that saves a scene photo to the gallery.
final class ARViewController: UIViewController,
    ARSCNViewDelegate, ARCoachingOverlayViewDelegate, UIGestureRecognizerDelegate {

    var model: ArModel!
    var onClose: (() -> Void)?

    private let sceneView = ARSCNView()
    private let coachingOverlay = ARCoachingOverlayView()

    // Overlay
    private let modelChip = PaddingLabel()
    private let countChip = PaddingLabel()
    private let instructionLabel = PaddingLabel()
    private let captureButton = UIButton(type: .custom)
    private let clearButton = UIButton(type: .system)
    private let backButton = UIButton(type: .system)
    private let flashView = UIView()
    private let toastLabel = PaddingLabel()

    // Scene state
    private var placedAnchors: [SCNNode] = []
    private var activeAnchor: SCNNode?
    private var activeContainer: SCNNode?
    private var planesFound = false
    private var isPlacing = false

    // Gesture base values
    private var baseScale = SCNVector3(1, 1, 1)
    private var baseYaw: Float = 0

    private static let cerise = UIColor(red: 0xC6/255, green: 0x04/255, blue: 0x63/255, alpha: 1)

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        setupScene()
        setupCoaching()
        setupOverlay()
        setupGestures()
        updateInstruction()
        updateCount()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        let config = ARWorldTrackingConfiguration()
        config.planeDetection = [.horizontal, .vertical]
        config.environmentTexturing = .automatic
        sceneView.session.run(config, options: [.resetTracking, .removeExistingAnchors])
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        sceneView.session.pause()
    }

    override var prefersStatusBarHidden: Bool { true }

    // MARK: - Setup

    private func setupScene() {
        sceneView.frame = view.bounds
        sceneView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        sceneView.delegate = self
        sceneView.automaticallyUpdatesLighting = true
        sceneView.scene = SCNScene()
        view.addSubview(sceneView)

        flashView.backgroundColor = .white
        flashView.alpha = 0
        flashView.isUserInteractionEnabled = false
        flashView.frame = view.bounds
        flashView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(flashView)
    }

    private func setupCoaching() {
        coachingOverlay.session = sceneView.session
        coachingOverlay.delegate = self
        coachingOverlay.goal = .horizontalPlane
        coachingOverlay.activatesAutomatically = true
        coachingOverlay.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(coachingOverlay)
        NSLayoutConstraint.activate([
            coachingOverlay.topAnchor.constraint(equalTo: view.topAnchor),
            coachingOverlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            coachingOverlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            coachingOverlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
    }

    private func setupOverlay() {
        let guide = view.safeAreaLayoutGuide

        // Back
        backButton.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backButton.tintColor = .white
        backButton.backgroundColor = UIColor(white: 0.1, alpha: 0.8)
        backButton.layer.cornerRadius = 23
        backButton.addTarget(self, action: #selector(close), for: .touchUpInside)
        place(backButton, size: 46)
        NSLayoutConstraint.activate([
            backButton.topAnchor.constraint(equalTo: guide.topAnchor, constant: 10),
            backButton.leadingAnchor.constraint(equalTo: guide.leadingAnchor, constant: 16),
        ])

        // Model name chip
        chipStyle(modelChip, textColor: .white)
        modelChip.text = model.title
        view.addSubview(modelChip)
        modelChip.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            modelChip.centerYAnchor.constraint(equalTo: backButton.centerYAnchor),
            modelChip.leadingAnchor.constraint(equalTo: backButton.trailingAnchor, constant: 12),
        ])

        // Count chip
        chipStyle(countChip, textColor: Self.cerise.withAlphaComponent(1))
        countChip.textColor = UIColor(red: 0x78/255, green: 0xD5/255, blue: 0xEF/255, alpha: 1)
        countChip.isHidden = true
        view.addSubview(countChip)
        countChip.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            countChip.centerYAnchor.constraint(equalTo: backButton.centerYAnchor),
            countChip.trailingAnchor.constraint(equalTo: guide.trailingAnchor, constant: -16),
        ])

        // Capture (shutter)
        captureButton.backgroundColor = .white
        captureButton.layer.cornerRadius = 36
        captureButton.addTarget(self, action: #selector(capture), for: .touchUpInside)
        place(captureButton, size: 72)
        NSLayoutConstraint.activate([
            captureButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            captureButton.bottomAnchor.constraint(equalTo: guide.bottomAnchor, constant: -26),
        ])
        let inner = UIView()
        inner.backgroundColor = Self.cerise
        inner.layer.cornerRadius = 30
        inner.isUserInteractionEnabled = false
        inner.translatesAutoresizingMaskIntoConstraints = false
        captureButton.addSubview(inner)
        let cam = UIImageView(image: UIImage(systemName: "camera.fill"))
        cam.tintColor = .white
        cam.translatesAutoresizingMaskIntoConstraints = false
        inner.addSubview(cam)
        NSLayoutConstraint.activate([
            inner.centerXAnchor.constraint(equalTo: captureButton.centerXAnchor),
            inner.centerYAnchor.constraint(equalTo: captureButton.centerYAnchor),
            inner.widthAnchor.constraint(equalToConstant: 60),
            inner.heightAnchor.constraint(equalToConstant: 60),
            cam.centerXAnchor.constraint(equalTo: inner.centerXAnchor),
            cam.centerYAnchor.constraint(equalTo: inner.centerYAnchor),
        ])

        // Clear
        clearButton.setImage(UIImage(systemName: "trash"), for: .normal)
        clearButton.tintColor = .white
        clearButton.backgroundColor = UIColor(white: 0.1, alpha: 0.8)
        clearButton.layer.cornerRadius = 26
        clearButton.isHidden = true
        clearButton.addTarget(self, action: #selector(clearScene), for: .touchUpInside)
        place(clearButton, size: 52)
        NSLayoutConstraint.activate([
            clearButton.centerYAnchor.constraint(equalTo: captureButton.centerYAnchor),
            clearButton.trailingAnchor.constraint(equalTo: guide.trailingAnchor, constant: -16),
        ])

        // Instruction card
        instructionLabel.insets = UIEdgeInsets(top: 14, left: 20, bottom: 14, right: 20)
        instructionLabel.backgroundColor = UIColor(white: 0.1, alpha: 0.82)
        instructionLabel.textColor = .white
        instructionLabel.font = .systemFont(ofSize: 15, weight: .regular)
        instructionLabel.numberOfLines = 0
        instructionLabel.textAlignment = .center
        instructionLabel.layer.cornerRadius = 18
        instructionLabel.clipsToBounds = true
        view.addSubview(instructionLabel)
        instructionLabel.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            instructionLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            instructionLabel.bottomAnchor.constraint(equalTo: captureButton.topAnchor, constant: -20),
            instructionLabel.leadingAnchor.constraint(greaterThanOrEqualTo: guide.leadingAnchor, constant: 24),
            instructionLabel.trailingAnchor.constraint(lessThanOrEqualTo: guide.trailingAnchor, constant: -24),
        ])

        // Toast
        chipStyle(toastLabel, textColor: .white)
        toastLabel.alpha = 0
        view.addSubview(toastLabel)
        toastLabel.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            toastLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            toastLabel.bottomAnchor.constraint(equalTo: captureButton.topAnchor, constant: -20),
        ])
    }

    private func setupGestures() {
        let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
        let pinch = UIPinchGestureRecognizer(target: self, action: #selector(handlePinch(_:)))
        let rotate = UIRotationGestureRecognizer(target: self, action: #selector(handleRotation(_:)))
        let pan = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
        [tap, pinch, rotate, pan].forEach {
            $0.delegate = self
            sceneView.addGestureRecognizer($0)
        }
    }

    // MARK: - Placement

    @objc private func handleTap(_ gesture: UITapGestureRecognizer) {
        let point = gesture.location(in: sceneView)
        let hits = sceneView.hitTest(point, options: [.boundingBoxOnly: true])
        if let node = hits.first?.node, let anchor = owningAnchor(of: node) {
            setActive(anchor)
            return
        }
        placeModel(at: point)
    }

    private func placeModel(at point: CGPoint) {
        guard !isPlacing,
              let query = sceneView.raycastQuery(from: point, allowing: .estimatedPlane, alignment: .any),
              let result = sceneView.session.raycast(query).first
        else { return }

        isPlacing = true
        loadModelNode { [weak self] container in
            guard let self = self else { return }
            self.isPlacing = false
            guard let container = container else { self.toast("Erro ao carregar o modelo 3D"); return }

            let anchorNode = SCNNode()
            anchorNode.simdWorldTransform = result.worldTransform
            anchorNode.addChildNode(container)
            self.sceneView.scene.rootNode.addChildNode(anchorNode)
            self.placedAnchors.append(anchorNode)
            self.setActive(anchorNode)
            self.popIn(container)
            self.planesFound = true
            self.updateInstruction()
            self.updateCount()
        }
    }

    /// Loads the bundled GLB via GLTFKit2 into a SceneKit node and plays its animations.
    private func loadModelNode(completion: @escaping (SCNNode?) -> Void) {
        guard let url = Bundle.main.url(forResource: model.assetName, withExtension: "glb") else {
            completion(nil); return
        }
        GLTFAsset.loadAsset(with: url, options: [:]) { [weak self] _, status, asset, _, _ in
            guard let self = self else { return }
            guard status == .complete, let asset = asset else {
                DispatchQueue.main.async { completion(nil) }
                return
            }
            let source = GLTFSCNSceneSource(asset: asset)
            let container = SCNNode()
            if let scene = source.defaultScene {
                for child in scene.rootNode.childNodes { container.addChildNode(child) }
            }
            if self.model.animated {
                for (index, animation) in source.animations.enumerated() {
                    let player = animation.animationPlayer
                    container.addAnimationPlayer(player, forKey: "anim_\(index)")
                    player.play()
                }
            }
            DispatchQueue.main.async {
                self.normalize(container)
                completion(container)
            }
        }
    }

    /// Uniformly scales the model to `targetSize` and drops its origin to the base.
    private func normalize(_ container: SCNNode) {
        let measure = container.flattenedClone()
        let minB = measure.boundingBox.min
        let maxB = measure.boundingBox.max
        let maxDim = max(maxB.x - minB.x, max(maxB.y - minB.y, maxB.z - minB.z))
        let scale: Float = maxDim > 0 ? model.targetSize / maxDim : 1
        container.scale = SCNVector3(scale, scale, scale)
        container.pivot = SCNMatrix4MakeTranslation(
            (minB.x + maxB.x) / 2, minB.y, (minB.z + maxB.z) / 2
        )
    }

    private func popIn(_ container: SCNNode) {
        let target = container.scale.x
        container.scale = SCNVector3(0.001, 0.001, 0.001)
        let grow = SCNAction.scale(to: CGFloat(target), duration: 0.42)
        grow.timingMode = .easeOut
        container.runAction(grow)
    }

    // MARK: - Editing gestures

    @objc private func handlePinch(_ gesture: UIPinchGestureRecognizer) {
        guard let container = activeContainer else { return }
        if gesture.state == .began { baseScale = container.scale }
        if gesture.state == .changed {
            let factor = Float(gesture.scale)
            container.scale = SCNVector3(baseScale.x * factor, baseScale.y * factor, baseScale.z * factor)
        }
    }

    @objc private func handleRotation(_ gesture: UIRotationGestureRecognizer) {
        guard let anchor = activeAnchor else { return }
        if gesture.state == .began { baseYaw = anchor.eulerAngles.y }
        if gesture.state == .changed { anchor.eulerAngles.y = baseYaw - Float(gesture.rotation) }
    }

    @objc private func handlePan(_ gesture: UIPanGestureRecognizer) {
        guard let anchor = activeAnchor, gesture.state == .changed else { return }
        let point = gesture.location(in: sceneView)
        guard let query = sceneView.raycastQuery(from: point, allowing: .estimatedPlane, alignment: .any),
              let result = sceneView.session.raycast(query).first else { return }
        let t = result.worldTransform.columns.3
        anchor.simdWorldPosition = simd_float3(t.x, t.y, t.z)
    }

    func gestureRecognizer(_ g: UIGestureRecognizer,
                           shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool {
        // Allow pinch + rotate together; keep pan separate from those two.
        !(g is UIPanGestureRecognizer || other is UIPanGestureRecognizer)
    }

    // MARK: - Actions

    @objc private func capture() {
        let image = sceneView.snapshot()
        flash()
        UIImageWriteToSavedPhotosAlbum(
            image, self, #selector(didFinishSaving(_:error:contextInfo:)), nil
        )
    }

    @objc private func didFinishSaving(_ image: UIImage, error: Error?, contextInfo: UnsafeRawPointer) {
        toast(error == nil ? "Foto salva na galeria" : "Não foi possível salvar a foto")
    }

    @objc private func clearScene() {
        guard !placedAnchors.isEmpty else { return }
        placedAnchors.forEach { $0.removeFromParentNode() }
        placedAnchors.removeAll()
        activeAnchor = nil
        activeContainer = nil
        updateInstruction()
        updateCount()
    }

    @objc private func close() { onClose?() }

    // MARK: - Helpers

    private func setActive(_ anchor: SCNNode) {
        activeAnchor = anchor
        activeContainer = anchor.childNodes.first
    }

    private func owningAnchor(of node: SCNNode) -> SCNNode? {
        var current: SCNNode? = node
        while let n = current {
            if placedAnchors.contains(n) { return n }
            current = n.parent
        }
        return nil
    }

    private func updateInstruction() {
        if !placedAnchors.isEmpty {
            instructionLabel.text = "Modelo posicionado · arraste, gire e redimensione"
            fadeInstruction()
        } else if planesFound {
            instructionLabel.text = "Toque em uma superfície para posicionar o modelo"
            instructionLabel.isHidden = false
            instructionLabel.alpha = 1
        } else {
            instructionLabel.text = "Aponte a câmera para uma superfície plana e mova o aparelho devagar"
            instructionLabel.isHidden = false
            instructionLabel.alpha = 1
        }
    }

    private func fadeInstruction() {
        UIView.animate(withDuration: 0.4, delay: 2.2, options: []) {
            self.instructionLabel.alpha = 0
        } completion: { _ in
            self.instructionLabel.isHidden = true
            self.instructionLabel.alpha = 1
        }
    }

    private func updateCount() {
        countChip.isHidden = placedAnchors.isEmpty
        countChip.text = "\(placedAnchors.count) na cena"
        clearButton.isHidden = placedAnchors.isEmpty
    }

    private func flash() {
        flashView.alpha = 0
        UIView.animate(withDuration: 0.07, animations: { self.flashView.alpha = 0.85 }) { _ in
            UIView.animate(withDuration: 0.22) { self.flashView.alpha = 0 }
        }
    }

    private func toast(_ message: String) {
        toastLabel.text = message
        toastLabel.isHidden = false
        UIView.animate(withDuration: 0.2) { self.toastLabel.alpha = 1 }
        UIView.animate(withDuration: 0.3, delay: 2.0, options: []) {
            self.toastLabel.alpha = 0
        } completion: { _ in self.toastLabel.isHidden = true }
    }

    // MARK: - ARCoachingOverlayViewDelegate

    func coachingOverlayViewWillActivate(_ overlay: ARCoachingOverlayView) {
        instructionLabel.isHidden = true
    }

    func coachingOverlayViewDidDeactivate(_ overlay: ARCoachingOverlayView) {
        planesFound = true
        updateInstruction()
    }

    // MARK: - ARSCNViewDelegate

    func renderer(_ renderer: SCNSceneRenderer, didAdd node: SCNNode, for anchor: ARAnchor) {
        if anchor is ARPlaneAnchor, !planesFound {
            planesFound = true
            DispatchQueue.main.async { self.updateInstruction() }
        }
    }

    // MARK: - Layout utilities

    private func place(_ button: UIButton, size: CGFloat) {
        button.clipsToBounds = true
        button.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(button)
        button.widthAnchor.constraint(equalToConstant: size).isActive = true
        button.heightAnchor.constraint(equalToConstant: size).isActive = true
    }

    private func chipStyle(_ label: PaddingLabel, textColor: UIColor) {
        label.backgroundColor = UIColor(white: 0.1, alpha: 0.8)
        label.textColor = textColor
        label.font = .systemFont(ofSize: 14, weight: .semibold)
        label.layer.cornerRadius = 18
        label.clipsToBounds = true
    }
}

/// A label with content insets and a rounded background — used for AR chips.
final class PaddingLabel: UILabel {
    var insets = UIEdgeInsets(top: 9, left: 14, bottom: 9, right: 14)

    override func drawText(in rect: CGRect) {
        super.drawText(in: rect.inset(by: insets))
    }

    override var intrinsicContentSize: CGSize {
        let base = super.intrinsicContentSize
        return CGSize(width: base.width + insets.left + insets.right,
                      height: base.height + insets.top + insets.bottom)
    }
}
