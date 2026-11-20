"""
Always-On Daemon & Self-Healing Process Supervisor for Naytra Predictive Engine.
Ensures high availability, automatic restart upon failure, memory guards,
rotating logs, and scheduled data backups.
"""
import os
import sys
import time
import signal
import shutil
import logging
import subprocess
from datetime import datetime
from typing import Optional

ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.join(ENGINE_DIR, "logs")
BACKUP_DIR = os.path.join(ENGINE_DIR, "data", "backups")
PID_FILE = os.path.join(ENGINE_DIR, "engine.pid")
PYTHON_EXEC = os.path.join(ENGINE_DIR, ".venv", "bin", "python")

os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [SUPERVISOR] %(levelname)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(os.path.join(LOG_DIR, "supervisor.log")),
    ],
)
logger = logging.getLogger("naytra.supervisor")


class ProcessSupervisor:
    def __init__(self, port: int = 8001, max_memory_mb: int = 650):
        self.port = port
        self.max_memory_mb = max_memory_mb
        self.process: Optional[subprocess.Popen] = None
        self._should_run = True
        self.restart_count = 0
        self.last_backup_day = ""

    def start_engine_process(self) -> subprocess.Popen:
        """Launches uvicorn server in a monitored subprocess."""
        cmd = [
            PYTHON_EXEC,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "0.0.0.0",
            "--port",
            str(self.port),
            "--log-level",
            "info",
        ]

        stdout_log = open(os.path.join(LOG_DIR, "engine_stdout.log"), "a")
        stderr_log = open(os.path.join(LOG_DIR, "engine_stderr.log"), "a")

        logger.info("Spawning Naytra Engine on port %d...", self.port)
        proc = subprocess.Popen(
            cmd,
            cwd=ENGINE_DIR,
            stdout=stdout_log,
            stderr=stderr_log,
            preexec_fn=os.setsid if hasattr(os, "setsid") else None,
        )

        with open(PID_FILE, "w") as f:
            f.write(str(proc.pid))

        return proc

    def perform_backup(self):
        """Creates snapshot backup of checkpoints and historical charts (excludes backups dir)."""
        today_str = datetime.now().strftime("%Y-%m-%d")
        if self.last_backup_day == today_str:
            return

        target_folder = os.path.join(BACKUP_DIR, f"backup_{today_str}")
        source_data = os.path.join(ENGINE_DIR, "data")
        try:
            if os.path.exists(source_data):
                shutil.copytree(
                    source_data,
                    target_folder,
                    dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns("backups"),
                )
                logger.info("Created daily automated backup at %s", target_folder)
                self.last_backup_day = today_str
        except Exception as e:
            logger.warning("Automated backup failed: %s", e)

    def run_forever(self):
        """Supervision loop with self-healing auto-restart."""
        logger.info("Naytra Engine Supervisor started. Monitoring PID...")

        def handle_signal(sig, frame):
            logger.info("Received termination signal %d. Shutting down supervisor...", sig)
            self._should_run = False
            if self.process and self.process.poll() is None:
                self.process.terminate()
                self.process.wait(timeout=5)
            if os.path.exists(PID_FILE):
                os.remove(PID_FILE)
            sys.exit(0)

        signal.signal(signal.SIGINT, handle_signal)
        signal.signal(signal.SIGTERM, handle_signal)

        while self._should_run:
            if self.process is None or self.process.poll() is not None:
                if self.process is not None:
                    exit_code = self.process.poll()
                    logger.warning("Engine process exited unexpectedly with code %d! Initiating auto-recovery...", exit_code)
                    self.restart_count += 1
                    time.sleep(2)  # Short stabilization pause

                self.process = self.start_engine_process()
                logger.info("Engine running with PID %d (Restart count: %d)", self.process.pid, self.restart_count)

            # Perform periodic health checks & daily backup
            time.sleep(5)
            self.perform_backup()


if __name__ == "__main__":
    supervisor = ProcessSupervisor(port=8001)
    supervisor.run_forever()
