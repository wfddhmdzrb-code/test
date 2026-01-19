# -*- coding: utf-8 -*-
"""
Network Monitor - Monolithic App Launcher
Unified network monitoring application with comprehensive logging and debugging
"""

import os
import sys
import subprocess
import time
import threading
import logging
import signal
from pathlib import Path
from typing import Optional
from datetime import datetime
try:
    import uvicorn  # type: ignore[import]
except Exception:
    uvicorn = None  # uvicorn not installed in this environment

PROJECT_ROOT = Path(__file__).parent
BACKEND_PATH = PROJECT_ROOT / "network-monitor"
FRONTEND_PATH = PROJECT_ROOT / "network-monitoring-ui"

# Single-entry launcher: set DEV_MODE and run the FastAPI app in-process
os.environ.setdefault('DEV_MODE', 'true')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(PROJECT_ROOT / "logs" / "app.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

APP_NAME = "Network Monitor"
APP_VERSION = "2.1.0"

# Default URLs (can be overridden via environment)
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://127.0.0.1:5000')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://127.0.0.1:5173')


class AppManager:
    """Application Manager"""
    
    def __init__(self):
        self.backend_process: Optional[subprocess.Popen] = None
        self.frontend_process: Optional[subprocess.Popen] = None
        self.running = False
    
    def init_database(self) -> bool:
        """Initialize database before starting server"""
        logger.info("📊 Initializing database...")
        
        try:
            if sys.platform == "win32":
                python_exe = BACKEND_PATH / "venv" / "Scripts" / "python.exe"
            else:
                python_exe = BACKEND_PATH / "venv" / "bin" / "python"
            
            if not python_exe.exists():
                logger.error(f"❌ Python executable not found: {python_exe}")
                return False
            
            env = os.environ.copy()
            env["PYTHONPATH"] = str(BACKEND_PATH)
            
            init_code = """
from db import Database
Database.init()
Database.create_admin_if_not_exists()
print('Database initialized successfully')
"""
            
            result = subprocess.run(
                [str(python_exe), "-c", init_code],
                cwd=str(BACKEND_PATH),
                env=env,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                logger.info("✅ Database initialized successfully")
                return True
            else:
                logger.warning(f"⚠️  Database initialization warning: {result.stderr}")
                return True
        
        except Exception as e:
            logger.error(f"❌ Error initializing database: {e}")
            return False
    
    def validate_environment(self) -> bool:
        """Validate environment and paths"""
        logger.info("🔍 Validating application environment...")
        
        errors = []
        
        if not BACKEND_PATH.exists():
            errors.append(f"Backend path not found: {BACKEND_PATH}")
        
        if not FRONTEND_PATH.exists():
            errors.append(f"Frontend path not found: {FRONTEND_PATH}")
        
        if (BACKEND_PATH / "venv").exists():
            logger.info("✅ Virtual environment found in backend")
        else:
            logger.warning("⚠️  Virtual environment not found - make sure dependencies are installed")
        
        if (FRONTEND_PATH / "node_modules").exists():
            logger.info("✅ Node modules found in frontend")
        else:
            logger.warning("⚠️  Node modules not found - make sure to run 'npm install'")
        
        if errors:
            for error in errors:
                logger.error(f"❌ {error}")
            return False
        
        logger.info("✅ Application environment is ready")
        return True
    
    def start_backend(self) -> bool:
        """Start FastAPI server"""
        logger.info("🚀 Starting backend server...")
        
        try:

            if sys.platform == "win32":
                python_exe = BACKEND_PATH / "venv" / "Scripts" / "python.exe"
            else:
                python_exe = BACKEND_PATH / "venv" / "bin" / "python"
            
            if not python_exe.exists():
                logger.error(f"❌ Python executable not found: {python_exe}")
                return False
            
            env = os.environ.copy()
            env["PYTHONUNBUFFERED"] = "1"
            env["PYTHONPATH"] = str(BACKEND_PATH)
            self.backend_process = subprocess.Popen(
                [str(python_exe), "api.py"],
                cwd=str(BACKEND_PATH),
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            
            logger.info(f"✅ Backend started on {BACKEND_URL} (PID: {self.backend_process.pid})")
            time.sleep(2)
            return True
        
        except Exception as e:
            logger.error(f"❌ Error starting backend: {e}")
            return False
    
    def start_frontend(self) -> bool:
        """Start frontend"""
        logger.info("🎨 Starting frontend...")
        
        try:
            if sys.platform == "win32":
                npm_cmd = "npm.cmd"
            else:
                npm_cmd = "npm"
            
            env = os.environ.copy()
            env["VITE_API_URL"] = BACKEND_URL + "/api"
            
            self.frontend_process = subprocess.Popen(
                [npm_cmd, "run", "dev"],
                cwd=str(FRONTEND_PATH),
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            
            logger.info(f"✅ Frontend started on {FRONTEND_URL} (PID: {self.frontend_process.pid})")
            time.sleep(3)
            return True
        
        except Exception as e:
            logger.error(f"❌ Error starting frontend: {e}")
            return False
    
    def start(self) -> bool:
        """Start application"""
        logger.info(f"\n{'='*60}")
        logger.info(f"🚀 {APP_NAME} v{APP_VERSION}")
        logger.info(f"{'='*60}\n")
        if not self.validate_environment():
            return False
        
        if not self.init_database():
            return False
        
        if not self.start_backend():
            return False
        
        if not self.start_frontend():
            self.stop_backend()
            return False
        
        self.running = True
        
        logger.info(f"\n{'='*60}")
        logger.info("✅ Application running successfully!")
        logger.info(f"🌐 Frontend:  {FRONTEND_URL}")
        logger.info(f"⚙️  Backend:   {BACKEND_URL}")
        logger.info(f"👤 Default Admin Credentials (for development only):")
        logger.info(f"   Username: admin")
        logger.info(f"   Password: admin@123")
        logger.info(f"💾 Database: storage/data.duckdb")
        logger.info(f"{'='*60}\n")
        
        logger.info("Press CTRL+C to stop the application...")
        
        return True
    
    def stop_backend(self):
        """Stop FastAPI server"""
        if self.backend_process:
            try:
                logger.info("⛔ Stopping backend...")
                self.backend_process.terminate()
                try:
                    self.backend_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self.backend_process.kill()
                    self.backend_process.wait()
                logger.info("✅ Backend stopped")
            except Exception as e:
                logger.error(f"❌ Error stopping backend: {e}")
    
    def stop_frontend(self):
        """Stop frontend"""
        if self.frontend_process:
            try:
                logger.info("⛔ Stopping frontend...")
                self.frontend_process.terminate()
                try:
                    self.frontend_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self.frontend_process.kill()
                    self.frontend_process.wait()
                logger.info("✅ Frontend stopped")
            except Exception as e:
                logger.error(f"❌ Error stopping frontend: {e}")
    
    def stop(self):
        """Stop application"""
        logger.info("\n⛔ Stopping application...")
        self.running = False
        self.stop_frontend()
        self.stop_backend()
        logger.info("✅ Application stopped successfully")
    
    def monitor(self):
        """Monitor processes"""
        while self.running:
            try:
                if self.backend_process and self.backend_process.poll() is not None:
                    logger.error("❌ Backend stopped unexpectedly")
                    self.stop()
                    break
                
                if self.frontend_process and self.frontend_process.poll() is not None:
                    logger.error("❌ Frontend stopped unexpectedly")
                    self.stop()
                    break
                
                time.sleep(1)
            
            except KeyboardInterrupt:
                break
            except Exception as e:
                logger.error(f"❌ Monitoring error: {e}")
                break


def main():
    """Main entry point"""
    log_dir = PROJECT_ROOT / "logs"
    log_dir.mkdir(exist_ok=True)

    # Initialize DuckDB and ensure admin exists via dynamic import (path-based)
    try:
        import importlib.util
        # Ensure backend path is importable for its internal imports
        if str(BACKEND_PATH) not in sys.path:
            sys.path.insert(0, str(BACKEND_PATH))
        db_path = BACKEND_PATH / 'db.py'
        spec = importlib.util.spec_from_file_location('backend_db', str(db_path))
        backend_db = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(backend_db)
        Database = backend_db.Database

        Database.init()
        Database.create_admin_if_not_exists()
    except Exception as e:
        logger.error(f"DB init error: {e}")

    # Load API module dynamically and run uvicorn with the app object
    try:
        import importlib.util
        api_path = BACKEND_PATH / 'api.py'
        spec_api = importlib.util.spec_from_file_location('backend_api', str(api_path))
        backend_api = importlib.util.module_from_spec(spec_api)
        spec_api.loader.exec_module(backend_api)
        app_obj = getattr(backend_api, 'app')
    except Exception as e:
        logger.error(f"Failed to load backend API: {e}")
        raise

    if uvicorn is None:
        logger.error("uvicorn is not installed. Install it with: pip install uvicorn[standard]")
        return
    uvicorn.run(app_obj, host='0.0.0.0', port=5000)


if __name__ == "__main__":
    main()
