"""
Face recognition service for SmartAttend (singleton).
Uses DeepFace with FaceNet model for embedding generation and MTCNN for face detection.
Provides: face detection, embedding generation, and cosine similarity matching.
"""

import os
import cv2
import logging
import numpy as np
from deepface import DeepFace
from scipy.spatial.distance import cosine

# Suppress TensorFlow logging
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

logger = logging.getLogger(__name__)


class FaceRecognitionService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceRecognitionService, cls).__new__(cls)
            cls._instance.initialize_models()
        return cls._instance

    def initialize_models(self):
        logger.info("FaceRecognitionService: Initializing...")
        try:
            dummy = np.zeros((160, 160, 3), dtype=np.uint8)
            DeepFace.represent(
                img_path=dummy,
                model_name="Facenet",
                enforce_detection=False,
                detector_backend="skip",
            )
            logger.info("FaceRecognitionService: Facenet model loaded.")
        except Exception as e:
            logger.warning(f"FaceRecognitionService: Warm-up note: {e}")

    def preprocess_image(self, image_np):
        """
        Detect faces using MTCNN (much better than OpenCV for multi-face detection).
        Returns: list of {"face_img": cropped_face_uint8, "box": (x, y, w, h)}
        """
        if image_np is None:
            return []

        # Enhance image before detection, track scale factor
        img, scale = self._enhance_image(image_np)

        # Try MTCNN first (best for group photos), fall back to opencv
        for backend in ['mtcnn', 'opencv']:
            try:
                faces = DeepFace.extract_faces(
                    img_path=img,
                    detector_backend=backend,
                    enforce_detection=False,
                    align=True,
                )
                if faces and len(faces) > 0:
                    from ..core.config import settings
                    confidence_threshold = settings.FACE_CONFIDENCE_THRESHOLD
                    # Filter out the no-face placeholder that DeepFace returns
                    real_faces = [f for f in faces if f.get('confidence', 0) and f['confidence'] > confidence_threshold]
                    if real_faces:
                        return self._process_detected_faces(real_faces, img, scale)
            except Exception as e:
                logger.debug(f"Detection with {backend} failed: {e}")
                continue

        return []

    def _enhance_image(self, image_np):
        """Improve image quality for better face detection.
        Returns: (enhanced_image, scale_factor)"""
        img = image_np.copy()
        scale = 1.0

        # If image is small, upscale it
        h, w = img.shape[:2]
        if max(h, w) < 640:
            scale = 640 / max(h, w)
            img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

        # Apply CLAHE for better contrast (helps with poor lighting)
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_channel = clahe.apply(l_channel)
        lab = cv2.merge([l_channel, a_channel, b_channel])
        img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

        # Light denoise
        img = cv2.fastNlMeansDenoisingColored(img, None, 6, 6, 7, 21)

        return img, scale

    def _process_detected_faces(self, faces, enhanced_img, scale):
        """Process detected face regions from the enhanced image."""
        from ..core.config import settings
        confidence_threshold = settings.FACE_CONFIDENCE_THRESHOLD

        processed_faces = []
        img_h, img_w = enhanced_img.shape[:2]

        for face_obj in faces:
            confidence = face_obj.get('confidence', 0)
            if confidence is not None and confidence < confidence_threshold:
                continue

            area = face_obj['facial_area']
            x, y, w, h = area['x'], area['y'], area['w'], area['h']

            # Skip extremely small faces
            if w < 15 or h < 15:
                continue

            # Crop from enhanced image (same coordinate space as detection)
            pad_w = int(w * 0.25)
            pad_h = int(h * 0.25)
            x1 = max(0, x - pad_w)
            y1 = max(0, y - pad_h)
            x2 = min(img_w, x + w + pad_w)
            y2 = min(img_h, y + h + pad_h)

            face_crop = enhanced_img[y1:y2, x1:x2]

            if face_crop.size > 0:
                face_crop = cv2.resize(face_crop, (160, 160), interpolation=cv2.INTER_CUBIC)

                # Scale bounding box back to original image coordinates for frontend
                orig_x = int(x / scale)
                orig_y = int(y / scale)
                orig_w = int(w / scale)
                orig_h = int(h / scale)

                processed_faces.append({
                    "face_img": face_crop,
                    "box": (orig_x, orig_y, orig_w, orig_h)
                })

        return processed_faces

    def generate_embedding(self, face_img):
        """Generate FaceNet embedding from a face image (uint8 BGR, 160x160)."""
        try:
            embeddings = DeepFace.represent(
                img_path=face_img,
                model_name="Facenet",
                enforce_detection=False,
                detector_backend="skip",
                align=False
            )
            if embeddings and len(embeddings) > 0:
                emb = np.array(embeddings[0]["embedding"], dtype=np.float64)
                # Normalize the embedding for consistent cosine similarity
                norm = np.linalg.norm(emb)
                if norm > 0:
                    emb = emb / norm
                return emb
            return None
        except Exception as e:
            logger.error(f"Embedding generation error: {e}")
            return None

    def compute_similarity(self, embed1, embed2):
        e1 = np.array(embed1, dtype=np.float64)
        e2 = np.array(embed2, dtype=np.float64)

        # Normalize both embeddings for fair comparison
        n1 = np.linalg.norm(e1)
        n2 = np.linalg.norm(e2)
        if n1 > 0:
            e1 = e1 / n1
        if n2 > 0:
            e2 = e2 / n2

        return float(1 - cosine(e1, e2))


face_service = FaceRecognitionService()
