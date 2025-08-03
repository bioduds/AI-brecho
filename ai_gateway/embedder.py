import torch, numpy as np
import open_clip
from PIL import Image
from typing import List
from config import EMBED_MODEL, DEVICE

class ImageEmbedder:
    def __init__(self):
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(EMBED_MODEL, pretrained='openai')
        self.model = self.model.to(DEVICE).eval()

    @torch.inference_mode()
    def embed_images(self, pil_images: List[Image.Image]) -> np.ndarray:
        imgs = [self.preprocess(im).unsqueeze(0) for im in pil_images]
        batch = torch.cat(imgs, dim=0).to(DEVICE)
        feats = self.model.encode_image(batch)
        feats = feats / feats.norm(dim=-1, keepdim=True)
        return feats.cpu().numpy()

    def pool_views(self, mats: np.ndarray, mode: str = "mean") -> np.ndarray:
        if mode == "mean":
            v = mats.mean(axis=0)
        elif mode == "max":
            v = mats.max(axis=0)
        else:
            v = mats.mean(axis=0)
        v = v / (np.linalg.norm(v) + 1e-9)
        return v
