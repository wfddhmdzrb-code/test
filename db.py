"""
Database Layer - DuckDB Embedded
This module replaces the previous SQLite implementation with DuckDB.
The database file is a single file: `storage/data.duckdb`.
"""

try:
    import duckdb  # type: ignore
except Exception:
    duckdb = None

import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd

from security import hash_password

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.parent
DB_DIR = PROJECT_ROOT / "storage"
DB_PATH = str(DB_DIR / "data.duckdb")

DB_DIR.mkdir(exist_ok=True)


def _conn():
    return duckdb.connect(database=DB_PATH, read_only=False)


def _rows_to_dicts(df):
    try:
        recs = df.to_dict(orient='records')
        sanitized = []
        for r in recs:
            nr = {}
            for k, v in r.items():
                try:
                    if pd.isna(v):
                        nr[k] = None
                    else:
                        # convert numpy scalars/arrays to native Python types
                        # when possible
                        if hasattr(v, 'tolist') and not isinstance(v, (str, bytes)):
                            try:
                                nr[k] = v.tolist()
                            except Exception:
                                nr[k] = v
                        else:
                            nr[k] = v
                except Exception:
                    nr[k] = None
            sanitized.append(nr)
        return sanitized
    except Exception:
        return []


class Database:
    @staticmethod
    def init():
        conn = _conn()

        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER,
                username TEXT UNIQUE,
                password TEXT,
                email TEXT,
                role TEXT,
                is_active INTEGER,
                created_at TEXT,
                updated_at TEXT
            )
        ''')

        conn.execute('''
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER,
                name TEXT,
                ip_address TEXT UNIQUE,
                mac_address TEXT,
                device_type TEXT,
                subnet TEXT,
                status TEXT,
                is_monitored INTEGER,
                is_critical INTEGER,
                latency_ms DOUBLE,
                packet_loss_percent DOUBLE,
                first_seen TEXT,
                last_seen TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        ''')

        conn.execute('''
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER,
                scan_type TEXT,
                total_devices INTEGER,
                devices_online INTEGER,
                duration_ms INTEGER,
                status TEXT,
                error_message TEXT,
                scanned_at TEXT,
                created_at TEXT
            )
        ''')

        conn.execute('''
            CREATE TABLE IF NOT EXISTS subnet_scans (
                id INTEGER,
                subnet TEXT,
                interface_name TEXT,
                total_devices INTEGER,
                devices_discovered INTEGER,
                duration_ms INTEGER,
                status TEXT,
                error_message TEXT,
                scanned_at TEXT,
                created_at TEXT
            )
        ''')

        conn.execute('''
            CREATE TABLE IF NOT EXISTS device_status (
                id INTEGER,
                device_id INTEGER,
                old_status TEXT,
                new_status TEXT,
                reason TEXT,
                changed_at TEXT
            )
        ''')

        conn.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER,
                device_id INTEGER,
                title TEXT,
                description TEXT,
                severity TEXT,
                alert_type TEXT,
                is_resolved INTEGER,
                created_at TEXT,
                resolved_at TEXT
            )
        ''')

        conn.close()
        logger.info(f"[OK] DuckDB initialized at {DB_PATH}")
        # Ensure devices table has required columns
        try:
            conn = _conn()
            conn.execute("ALTER TABLE devices ADD COLUMN subnet TEXT")
            conn.close()
        except Exception:
            try:
                conn.close()
            except Exception:
                pass
        
        try:
            conn = _conn()
            conn.execute("ALTER TABLE devices ADD COLUMN interface_name TEXT")
            conn.close()
        except Exception:
            # column may already exist or DuckDB may not support IF NOT EXISTS;
            # ignore errors
            try:
                conn.close()
            except Exception:
                pass
        
        try:
            conn = _conn()
            conn.execute('CREATE INDEX IF NOT EXISTS idx_devices_subnet ON devices(subnet)')
            conn.close()
        except Exception:
            # index may already exist or column may not exist yet;
            # ignore errors
            try:
                conn.close()
            except Exception:
                pass

    @staticmethod
    def create_admin_if_not_exists():
        try:
            conn = _conn()
            df = conn.execute("SELECT COUNT(*) AS cnt FROM users").fetchdf()
            cnt = int(df['cnt'].iloc[0]) if not df.empty else 0

            if cnt == 0:
                hashed = hash_password('admin@123')
                now = datetime.utcnow().isoformat()
                uid = Database._next_id('users')
                # FIXED: Moved arguments to single line to prevent syntax errors
                conn.execute("INSERT INTO users (id, username, password, email, role, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)", (uid, 'admin', hashed, 'admin@local', 'admin', 1, now, now))
                logger.info("[OK] Default admin user created (username: admin)")
            else:
                logger.info("[SKIP] Admin user exists")

            conn.close()
        except Exception as e:
            logger.error(f"Failed to create admin user: {e}")

    @staticmethod
    def user_exists(username: str) -> bool:
        try:
            conn = _conn()
            df = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchdf()
            conn.close()
            return not df.empty
        except Exception as e:
            logger.error(f"Error checking user existence: {e}")
            return False

    @staticmethod
    def get_user(username: str) -> Optional[Dict]:
        try:
            conn = _conn()
            df = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchdf()
            conn.close()
            rows = _rows_to_dicts(df)
            return rows[0] if rows else None
        except Exception as e:
            logger.error(f"Error fetching user: {e}")
            return None

    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[Dict]:
        try:
            conn = _conn()
            df = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchdf()
            conn.close()
            rows = _rows_to_dicts(df)
            return rows[0] if rows else None
        except Exception as e:
            logger.error(f"Error fetching user by ID: {e}")
            return None

    @staticmethod
    def _next_id(table: str) -> int:
        try:
            conn = _conn()
            df = conn.execute(f"SELECT MAX(id) AS m FROM {table}").fetchdf()
            conn.close()
            if df.empty:
                return 1
            m = df['m'].iloc[0]
            if pd.isna(m):
                return 1
            return int(m) + 1
        except Exception as e:
            logger.warning(f"Could not get next id for {table}: {e}")
            return 1

    @staticmethod
    def create_user(username: str, password: str, email: str, role: str = 'viewer') -> Optional[Dict]:
        try:
            conn = _conn()
            now = datetime.utcnow().isoformat()
            uid = Database._next_id('users')
            conn.execute("INSERT INTO users (id, username, password, email, role, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)", (uid, username, password, email, role, 1, now, now))
            df = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchdf()
            conn.close()
            rows = _rows_to_dicts(df)
            return rows[0] if rows else None
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return None

    @staticmethod
    def get_devices(limit: Optional[int] = None) -> List[Dict]:
        try:
            conn = _conn()
            if limit:
                df = conn.execute("SELECT * FROM devices ORDER BY created_at DESC LIMIT ?", (limit,)).fetchdf()
            else:
                df = conn.execute("SELECT * FROM devices ORDER BY created_at DESC").fetchdf()
            conn.close()
            return _rows_to_dicts(df)
        except Exception as e:
            logger.error(f"Error fetching devices: {e}")
            return []

    @staticmethod
    def get_device(device_id: int) -> Optional[Dict]:
        try:
            conn = _conn()
            df = conn.execute("SELECT * FROM devices WHERE id = ?", (device_id,)).fetchdf()
            conn.close()
            rows = _rows_to_dicts(df)
            return rows[0] if rows else None
        except Exception as e:
            logger.error(f"Error fetching device: {e}")
            return None

    @staticmethod
    def get_device_by_ip(ip_address: str) -> Optional[Dict]:
        try:
            conn = _conn()
            df = conn.execute("SELECT * FROM devices WHERE ip_address = ?", (ip_address,)).fetchdf()
            conn.close()
            rows = _rows_to_dicts(df)
            return rows[0] if rows else None
        except Exception as e:
            logger.error(f"Error fetching device by IP: {e}")
            return None

    @staticmethod
    def create_device(name: str, ip_address: str, device_type: str, mac_address: Optional[str] = None, subnet: Optional[str] = None) -> Optional[Dict]:
        try:
            conn = _conn()
            now = datetime.utcnow().isoformat()
            did = Database._next_id('devices')
            conn.execute("INSERT INTO devices (id, name, ip_address, mac_address, device_type, subnet, status, first_seen, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", (did, name, ip_address, mac_address, device_type, subnet, 'unknown', now, now, now))
            df = conn.execute("SELECT * FROM devices WHERE ip_address = ?", (ip_address,)).fetchdf()
            conn.close()
            rows = _rows_to_dicts(df)
            return rows[0] if rows else None
        except Exception as e:
            logger.error(f"Error creating device: {e}")
            return None

    @staticmethod
    def update_device(device_id: int, data: Dict) -> Optional[Dict]:
        try:
            conn = _conn()
            sets = []
            params = []
            for k, v in data.items():
                sets.append(f"{k} = ?")
                params.append(v)
            if not sets:
                conn.close()
                return Database.get_device(device_id)
            params.append(datetime.utcnow().isoformat())
            params.append(device_id)
            sql = f"UPDATE devices SET {', '.join(sets)}, updated_at = ? WHERE id = ?"
            conn.execute(sql, tuple(params))
            df = conn.execute("SELECT * FROM devices WHERE id = ?", (device_id,)).fetchdf()
            conn.close()
            rows = _rows_to_dicts(df)
            return rows[0] if rows else None
        except Exception as e:
            logger.error(f"Error updating device: {e}")
            return None

    @staticmethod
    def delete_device(device_id: int) -> bool:
        try:
            conn = _conn()
            conn.execute("DELETE FROM devices WHERE id = ?", (device_id,))
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error deleting device: {e}")
            return False

    @staticmethod
    def update_device_status(device_id: int, status: str, latency_ms: Optional[float] = None) -> bool:
        try:
            conn = _conn()
            now = datetime.utcnow().isoformat()
            conn.execute("UPDATE devices SET status = ?, last_seen = ?, updated_at = ? WHERE id = ?", (status, now, now, device_id))
            if latency_ms is not None:
                conn.execute("UPDATE devices SET latency_ms = ? WHERE id = ?", (latency_ms, device_id))
            dsid = Database._next_id('device_status')
            conn.execute("INSERT INTO device_status (id, device_id, old_status, new_status, reason, changed_at) VALUES (?,?,?,?,?,?)", (dsid, device_id, None, status, None, now))
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error updating device status: {e}")
            return False

    @staticmethod
    def create_alert(title: str, description: str, severity: str, device_id: Optional[int] = None, alert_type: Optional[str] = None) -> Optional[Dict]:
        try:
            conn = _conn()
            now = datetime.utcnow().isoformat()
            aid = Database._next_id('alerts')
            conn.execute("INSERT INTO alerts (id, device_id, title, description, severity, alert_type, is_resolved, created_at) VALUES (?,?,?,?,?,?,?,?)", (aid, device_id, title, description, severity, alert_type, 0, now))
            df = conn.execute("SELECT * FROM alerts ORDER BY created_at DESC LIMIT 1").fetchdf()
            conn.close()
            rows = _rows_to_dicts(df)
            return rows[0] if rows else None
        except Exception as e:
            logger.error(f"Error creating alert: {e}")
            return None

    @staticmethod
    def get_alerts(limit: int = 100) -> List[Dict]:
        try:
            conn = _conn()
            df = conn.execute("SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?", (limit,)).fetchdf()
            conn.close()
            return _rows_to_dicts(df)
        except Exception as e:
            logger.error(f"Error fetching alerts: {e}")
            return []

    @staticmethod
    def create_scan(scan_type: str, total_devices: int, devices_online: int, duration_ms: int, status: str = 'success', error_message: Optional[str] = None) -> Optional[Dict]:
        try:
            conn = _conn()
            now = datetime.utcnow().isoformat()
            sid = Database._next_id('scans')
            conn.execute("INSERT INTO scans (id, scan_type, total_devices, devices_online, duration_ms, status, error_message, scanned_at, created_at) VALUES (?,?,?,?,?,?,?,?,?)", (sid, scan_type, total_devices, devices_online, duration_ms, status, error_message, now, now))
            df = conn.execute("SELECT * FROM scans ORDER BY scanned_at DESC LIMIT 1").fetchdf()
            conn.close()
            rows = _rows_to_dicts(df)
            return rows[0] if rows else None
        except Exception as e:
            logger.error(f"Error creating scan record: {e}")
            return None

    @staticmethod
    def create_subnet_scan(subnet: str, interface_name: str, total_devices: int, devices_discovered: int, duration_ms: int, status: str = 'success', error_message: Optional[str] = None) -> Optional[Dict]:
        try:
            conn = _conn()
            now = datetime.utcnow().isoformat()
            sid = Database._next_id('subnet_scans')
            conn.execute("INSERT INTO subnet_scans (id, subnet, interface_name, total_devices, devices_discovered, duration_ms, status, error_message, scanned_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", (sid, subnet, interface_name, total_devices, devices_discovered, duration_ms, status, error_message, now, now))
            df = conn.execute("SELECT * FROM subnet_scans WHERE id = ?", (sid,)).fetchdf()
            conn.close()
            rows = _rows_to_dicts(df)
            return rows[0] if rows else None
        except Exception as e:
            logger.error(f"Error creating subnet scan record: {e}")
            return None

    @staticmethod
    def get_subnet_scans(limit: int = 50) -> List[Dict]:
        try:
            conn = _conn()
            df = conn.execute("SELECT * FROM subnet_scans ORDER BY scanned_at DESC LIMIT ?", (limit,)).fetchdf()
            conn.close()
            return _rows_to_dicts(df)
        except Exception as e:
            logger.error(f"Error fetching subnet scans: {e}")
            return []

    @staticmethod
    def get_devices_by_subnet(subnet: str) -> List[Dict]:
        try:
            conn = _conn()
            df = conn.execute("SELECT * FROM devices WHERE subnet = ? ORDER BY ip_address", (subnet,)).fetchdf()
            conn.close()
            return _rows_to_dicts(df)
        except Exception as e:
            logger.error(f"Error fetching devices by subnet: {e}")
            return []

    @staticmethod
    def upsert_device_from_scan(ip_address: str, mac_address: Optional[str], device_type: str, subnet: str, latency_ms: Optional[float] = None) -> Optional[Dict]:
        try:
            existing = Database.get_device_by_ip(ip_address)
            now = datetime.utcnow().isoformat()
            conn = _conn()
            if existing:
                conn.execute("UPDATE devices SET status = ?, last_seen = ?, updated_at = ?, latency_ms = ? WHERE ip_address = ?", ('up', now, now, latency_ms, ip_address))
            else:
                name = f"Device-{ip_address.split('.')[-1]}"
                did = Database._next_id('devices')
                conn.execute("INSERT INTO devices (id, name, ip_address, mac_address, device_type, subnet, status, latency_ms, first_seen, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", (did, name, ip_address, mac_address, device_type, subnet, 'up', latency_ms, now, now, now))
            df = conn.execute("SELECT * FROM devices WHERE ip_address = ?", (ip_address,)).fetchdf()
            conn.close()
            rows = _rows_to_dicts(df)
            return rows[0] if rows else None
        except Exception as e:
            logger.error(f"Error upserting device from scan: {e}", exc_info=True)
            return None