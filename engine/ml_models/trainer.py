"""
Naytra ML Candlestick Forecasting - Offline Base Model Training.

Trains NaytraHybridForecaster on multi-regime financial time-series.
Produces calibrated weights stored in `checkpoints/naytra_forecaster.pt`.
"""
import os
import json
import logging
from typing import Dict, Any
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split

from ml_models.architecture import NaytraHybridForecaster
from ml_models.dataset import build_training_dataset

logger = logging.getLogger("naytra.ml.trainer")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class ForecasterTrainer:
    def __init__(
        self,
        checkpoint_dir: str = "ml_models/checkpoints",
        learning_rate: float = 1e-3,
        weight_decay: float = 1e-4,
    ):
        self.checkpoint_dir = checkpoint_dir
        os.makedirs(self.checkpoint_dir, exist_ok=True)
        self.device = torch.device("cpu")  # CPU execution for maximum platform compatibility

        self.model = NaytraHybridForecaster(
            input_dim=9,
            hidden_dim=64,
            num_layers=2,
            num_heads=4,
            dropout=0.15,
        ).to(self.device)

        self.optimizer = torch.optim.AdamW(
            self.model.parameters(),
            lr=learning_rate,
            weight_decay=weight_decay,
        )
        self.scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(self.optimizer, T_max=30)

        # Loss functions
        self.mse_loss = nn.MSELoss()
        self.ce_loss = nn.CrossEntropyLoss()

    def train_epoch(self, dataloader: DataLoader) -> Dict[str, float]:
        self.model.train()
        total_loss = 0.0
        drift_loss_acc = 0.0
        dir_loss_acc = 0.0
        vol_loss_acc = 0.0

        for seqs, drifts, vols, dirs in dataloader:
            seqs = seqs.to(self.device)
            drifts = drifts.to(self.device)
            vols = vols.to(self.device)
            dirs = dirs.to(self.device)

            self.optimizer.zero_grad()
            pred_drift, pred_vol, pred_dir = self.model(seqs)

            l_drift = self.mse_loss(pred_drift, drifts)
            l_vol = self.mse_loss(pred_vol, vols)
            l_dir = self.ce_loss(pred_dir, dirs)

            # Combined multi-task loss
            loss = l_drift + 0.5 * l_vol + 0.4 * l_dir
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            self.optimizer.step()

            total_loss += loss.item()
            drift_loss_acc += l_drift.item()
            dir_loss_acc += l_dir.item()
            vol_loss_acc += l_vol.item()

        n = len(dataloader)
        return {
            "loss": total_loss / n,
            "drift_loss": drift_loss_acc / n,
            "dir_loss": dir_loss_acc / n,
            "vol_loss": vol_loss_acc / n,
        }

    def evaluate(self, dataloader: DataLoader) -> Dict[str, float]:
        self.model.eval()
        total_loss = 0.0
        drift_errors = []

        with torch.no_grad():
            for seqs, drifts, vols, dirs in dataloader:
                seqs = seqs.to(self.device)
                drifts = drifts.to(self.device)
                vols = vols.to(self.device)
                dirs = dirs.to(self.device)

                pred_drift, pred_vol, pred_dir = self.model(seqs)
                loss = self.mse_loss(pred_drift, drifts) + 0.5 * self.mse_loss(pred_vol, vols) + 0.4 * self.ce_loss(pred_dir, dirs)
                total_loss += loss.item()

                diff = (pred_drift - drifts).cpu().numpy().flatten()
                drift_errors.extend(diff.tolist())

        rmse = float(np.sqrt(np.mean(np.square(drift_errors))))
        mae = float(np.mean(np.abs(drift_errors)))
        return {
            "val_loss": total_loss / max(1, len(dataloader)),
            "rmse": round(rmse, 4),
            "mae": round(mae, 4),
        }

    def fit(self, num_epochs: int = 25, batch_size: int = 32) -> Dict[str, Any]:
        logger.info("Generating multi-regime training dataset...")
        full_dataset = build_training_dataset(num_samples=1600, seq_len=15)

        train_size = int(0.85 * len(full_dataset))
        val_size = len(full_dataset) - train_size
        train_ds, val_ds = random_split(full_dataset, [train_size, val_size])

        train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
        val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

        logger.info("Starting training across %d epochs (Train: %d, Val: %d)...", num_epochs, train_size, val_size)
        best_val_loss = float("inf")
        history = []

        for epoch in range(1, num_epochs + 1):
            train_metrics = self.train_epoch(train_loader)
            val_metrics = self.evaluate(val_loader)
            self.scheduler.step()

            history.append({
                "epoch": epoch,
                "train_loss": round(train_metrics["loss"], 4),
                "val_loss": round(val_metrics["val_loss"], 4),
                "val_rmse": val_metrics["rmse"],
                "val_mae": val_metrics["mae"],
            })

            if val_metrics["val_loss"] < best_val_loss:
                best_val_loss = val_metrics["val_loss"]
                ckpt_path = os.path.join(self.checkpoint_dir, "naytra_forecaster.pt")
                torch.save(self.model.state_dict(), ckpt_path)
                logger.info("Epoch %d: Saved best checkpoint (Val Loss: %.4f, RMSE: %.4f) -> %s",
                            epoch, val_metrics["val_loss"], val_metrics["rmse"], ckpt_path)

            if epoch % 5 == 0 or epoch == num_epochs:
                logger.info("Epoch %2d/%2d - Loss: %.4f | Val Loss: %.4f | RMSE: %.4f | MAE: %.4f",
                            epoch, num_epochs, train_metrics["loss"], val_metrics["val_loss"],
                            val_metrics["rmse"], val_metrics["mae"])

        # Save training summary
        history_path = os.path.join(self.checkpoint_dir, "training_history.json")
        with open(history_path, "w") as f:
            json.dump({
                "model_config": self.model.get_config(),
                "best_val_loss": round(best_val_loss, 4),
                "history": history,
            }, f, indent=2)

        return {"best_val_loss": best_val_loss, "final_metrics": history[-1]}


if __name__ == "__main__":
    trainer = ForecasterTrainer()
    trainer.fit(num_epochs=20)
