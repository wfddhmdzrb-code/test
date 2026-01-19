"""
Network Scanner Module - Subnet-level network discovery
Provides interface detection, ARP scanning, and ping sweep capabilities
"""

import ipaddress
import logging
import platform
import re
import socket
import subprocess
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

logger = logging.getLogger(__name__)


def _get_db():
    try:
        import importlib.util
        import sys
        BACKEND = Path(__file__).parent
        if str(BACKEND) not in sys.path:
            sys.path.insert(0, str(BACKEND))
        spec = importlib.util.spec_from_file_location('backend_db', str(BACKEND / 'db.py'))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod.Database
    except Exception as e:
        logger.debug(f"Could not load Database module: {e}")
        return None


class NetworkInterface:
    """Represents a network interface"""

    def __init__(self, name: str, ip_address: str, netmask: str):
        self.name = name
        self.ip_address = ip_address
        self.netmask = netmask
        self.subnet = self._calculate_subnet()

    def _calculate_subnet(self) -> str:
        """Calculate CIDR notation subnet from IP and netmask"""
        try:
            network = ipaddress.IPv4Network(
                f"{self.ip_address}/{self.netmask}",
                strict=False
            )
            return str(network)
        except Exception as e:
            logger.error(f"Error calculating subnet: {e}")
            return f"{self.ip_address}/24"

    def __repr__(self) -> str:
        # FIXED: Combined multiline string to single line
        return f"<Interface {self.name}: {self.ip_address}/{self.netmask} ({self.subnet})>"


class DiscoveredDevice:
    """Represents a discovered device"""

    def __init__(
            self,
            ip_address: str,
            mac_address: Optional[str] = None,
            device_type: str = "unknown"):
        self.ip_address = ip_address
        self.mac_address = mac_address
        self.device_type = device_type
        self.status = "up"
        self.latency_ms = None
        self.discovered_at = datetime.now().isoformat()

    def to_dict(self) -> Dict:
        return {
            "ip_address": self.ip_address,
            "mac_address": self.mac_address,
            "device_type": self.device_type,
            "status": self.status,
            "latency_ms": self.latency_ms,
            "discovered_at": self.discovered_at
        }


class SubnetScanner:
    """Performs unified subnet-level scanning"""

    def __init__(self):
        self.os_type = platform.system().lower()
        self.discovered_devices: Dict[str, DiscoveredDevice] = {}
        self._lock = threading.Lock()

    def get_active_interfaces(self) -> List[NetworkInterface]:
        """Detect and return all active network interfaces"""
        interfaces = []

        try:
            if self.os_type == "windows":
                interfaces = self._get_interfaces_windows()
            elif self.os_type in ["linux", "darwin"]:
                interfaces = self._get_interfaces_unix()
            else:
                logger.warning(f"Unsupported OS type: {self.os_type}")
                interfaces = self._get_interfaces_generic()
        except Exception as e:
            logger.error(f"Error detecting network interfaces: {e}")
            interfaces = self._get_interfaces_generic()

        return interfaces

    def _get_interfaces_windows(self) -> List[NetworkInterface]:
        """Get network interfaces on Windows"""
        interfaces = []
        try:
            result = subprocess.run(
                ["ipconfig"],
                capture_output=True,
                text=True,
                timeout=5
            )

            adapter_pattern = r"Adapter\s+([^:]+):\s*(?:Ethernet|Wi-Fi)"
            ip_pattern = r"IPv4.*?:\s*(\d+\.\d+\.\d+\.\d+)"
            mask_pattern = r"Subnet Mask.*?:\s*(\d+\.\d+\.\d+\.\d+)"

            lines = result.stdout.split("\n")
            current_adapter = None
            current_ip = None
            current_mask = None

            for line in lines:
                if "Ethernet" in line or "Wi-Fi" in line:
                    current_adapter = line.split()[0].strip() if line.split() else None
                if "IPv4" in line:
                    match = re.search(ip_pattern, line)
                    if match:
                        current_ip = match.group(1)
                if "Subnet Mask" in line:
                    match = re.search(mask_pattern, line)
                    if match:
                        current_mask = match.group(1)

                if current_adapter and current_ip and current_mask:
                    try:
                        interface = NetworkInterface(
                            current_adapter, current_ip, current_mask)
                        if str(interface.ip_address) != "127.0.0.1":
                            interfaces.append(interface)
                    except Exception as e:
                        logger.debug(f"Error creating interface: {e}")

                    current_adapter = None
                    current_ip = None
                    current_mask = None

        except subprocess.TimeoutExpired:
            logger.warning("ipconfig command timed out")
        except Exception as e:
            logger.error(f"Error getting Windows interfaces: {e}")

        return interfaces

    def _get_interfaces_unix(self) -> List[NetworkInterface]:
        """Get network interfaces on Linux/macOS"""
        interfaces = []
        try:
            result = subprocess.run(
                ["ip", "addr"],
                capture_output=True,
                text=True,
                timeout=5
            )

            lines = result.stdout.split("\n")
            interface_name = None

            for line in lines:
                if line and line[0].isdigit():
                    parts = line.split(":")
                    interface_name = parts[1].strip()

                if interface_name and "inet " in line and "127.0.0.1" not in line:
                    match = re.search(r"inet\s+(\d+\.\d+\.\d+\.\d+)/(\d+)", line)
                    if match:
                        ip_address = match.group(1)
                        cidr = int(match.group(2))
                        netmask = self._cidr_to_netmask(cidr)
                        try:
                            interface = NetworkInterface(
                                interface_name, ip_address, netmask)
                            interfaces.append(interface)
                        except Exception as e:
                            logger.debug(f"Error creating interface: {e}")

        except subprocess.TimeoutExpired:
            logger.warning("ip addr command timed out")
        except Exception as e:
            logger.error(f"Error getting Unix interfaces: {e}")

        return interfaces

    def _get_interfaces_generic(self) -> List[NetworkInterface]:
        """Fallback method using Python socket"""
        interfaces = []
        try:
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)

            if local_ip and local_ip != "127.0.0.1":
                interface = NetworkInterface(
                    "default", local_ip, "255.255.255.0")
                interfaces.append(interface)
        except Exception as e:
            logger.error(f"Error getting generic interfaces: {e}")

        return interfaces

    @staticmethod
    def _cidr_to_netmask(cidr: int) -> str:
        """Convert CIDR notation to netmask"""
        mask = (0xffffffff >> (32 - cidr)) << (32 - cidr)
        return ".".join([str((mask >> (i << 3)) & 0xff) for i in (3, 2, 1, 0)])

    def scan_subnet(self, interface: NetworkInterface,
                    timeout: int = 2) -> List[DiscoveredDevice]:
        """Scan a subnet for active devices using ARP, Ping, and TCP probes.

        Returns consolidated list of discovered devices and persists them into DB.
        """
        devices: List[DiscoveredDevice] = []
        self.discovered_devices.clear()

        # FIXED: Combined multiline string to single line
        logger.info(f"Starting subnet scan on {interface.subnet} ({interface.name})")

        network = ipaddress.IPv4Network(interface.subnet, strict=False)
        host_addresses = list(network.hosts())

        if not host_addresses:
            logger.warning(f"No host addresses in subnet {interface.subnet}")
            return []

        # ARP (fast if available)
        arp_devices = self._arp_scan(interface, host_addresses)
        devices.extend(arp_devices)

        # Ping sweep to find nodes that respond to ICMP
        ping_devices = self._ping_sweep(host_addresses, timeout)
        for device in ping_devices:
            if device.ip_address not in [d.ip_address for d in devices]:
                devices.append(device)

        # Lightweight TCP probe on common ports to confirm hosts
        ports = [80, 443, 445, 3389]
        ips_to_probe = [d.ip_address for d in devices]
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = {
                executor.submit(self._tcp_probe, ip, ports, 0.4): ip for ip in ips_to_probe}
            for fut in as_completed(futures):
                ip = futures[fut]
                try:
                    open_port = fut.result()
                    if open_port:
                        for d in devices:
                            if d.ip_address == ip:
                                d.device_type = d.device_type or 'tcp_host'
                except Exception:
                    continue

        # Consolidate results: prefer MAC as primary key, fallback to IP
        consolidated: Dict[str, DiscoveredDevice] = {}
        for d in devices:
            key = d.mac_address if d.mac_address else d.ip_address
            if key in consolidated:
                existing = consolidated[key]
                if not existing.mac_address and d.mac_address:
                    existing.mac_address = d.mac_address
                if not existing.latency_ms and d.latency_ms:
                    existing.latency_ms = d.latency_ms
            else:
                consolidated[key] = d

        results = list(consolidated.values())

        # Persist to DB (update by MAC then IP)
        Database = _get_db()
        if Database:
            for dev in results:
                try:
                    rec = Database.upsert_device_from_scan(
                        dev.ip_address,
                        dev.mac_address,
                        dev.device_type,
                        interface.subnet,
                        dev.latency_ms)
                    if rec and 'id' in rec:
                        try:
                            Database.update_device(
                                rec['id'], {'interface_name': interface.name})
                        except Exception:
                            pass
                except Exception as e:
                    logger.debug(f"DB upsert failed for {dev.ip_address}: {e}")

        # FIXED: Combined multiline string to single line
        logger.info(f"Subnet scan completed: found {len(results)} devices")
        return results

    def _arp_scan(self, interface: NetworkInterface,
                  target_ips: List[ipaddress.IPv4Address]) -> List[DiscoveredDevice]:
        """Perform ARP scan to discover devices"""
        devices = []

        try:
            if self.os_type == "windows":
                devices = self._arp_scan_windows(target_ips)
            elif self.os_type in ["linux", "darwin"]:
                devices = self._arp_scan_unix(interface, target_ips)
        except Exception as e:
            logger.warning(f"ARP scan failed: {e}")

        return devices

    def _arp_scan_windows(
            self, target_ips: List[ipaddress.IPv4Address]) -> List[DiscoveredDevice]:
        """Perform ARP scan on Windows"""
        devices = []

        for ip in target_ips[:50]:
            try:
                result = subprocess.run(
                    ["arp", "-a", str(ip)],
                    capture_output=True,
                    text=True,
                    timeout=1
                )

                if result.returncode == 0:
                    match = re.search(
                        r"(\w{2}-\w{2}-\w{2}-\w{2}-\w{2}-\w{2})",
                        result.stdout)
                    if match:
                        mac = match.group(1).replace("-", ":")
                        device = DiscoveredDevice(str(ip), mac, "discovered")
                        devices.append(device)
            except (subprocess.TimeoutExpired, Exception) as e:
                logger.debug(f"ARP query failed for {ip}: {e}")

        return devices

    def _arp_scan_unix(self, interface: NetworkInterface,
                       target_ips: List[ipaddress.IPv4Address]) -> List[DiscoveredDevice]:
        """Perform ARP scan on Unix-like systems"""
        devices = []

        try:
            result = subprocess.run(
                ["arp-scan", "-l", "--localnet", f"--interface={interface.name}"],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                for line in result.stdout.split("\n"):
                    match = re.search(r"(\d+\.\d+\.\d+\.\d+)\s+([\w:]+)", line)
                    if match:
                        ip = match.group(1)
                        mac = match.group(2)
                        device = DiscoveredDevice(ip, mac, "discovered")
                        devices.append(device)
        except FileNotFoundError:
            logger.warning("arp-scan not found, falling back to ping sweep")
        except Exception as e:
            logger.warning(f"Unix ARP scan failed: {e}")

        return devices

    def _ping_sweep(self,
                    target_ips: List[ipaddress.IPv4Address],
                    timeout: int = 2) -> List[DiscoveredDevice]:
        """Perform ping sweep to discover active hosts"""
        devices = []

        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = {
                executor.submit(self._ping_host, str(ip), timeout): str(ip)
                for ip in target_ips
            }

            for future in as_completed(futures):
                result = future.result()
                if result:
                    devices.append(result)

        return devices

    def _ping_host(
            self,
            ip_address: str,
            timeout: int = 2) -> Optional[DiscoveredDevice]:
        """Ping a single host"""
        try:
            if self.os_type == "windows":
                cmd = ["ping", "-n", "1", "-w",
                       str(timeout * 1000), ip_address]
            else:
                cmd = ["ping", "-c", "1", "-W",
                       str(timeout * 1000), ip_address]

            result = subprocess.run(
                cmd,
                capture_output=True,
                timeout=timeout + 2,
                text=True
            )

            if result.returncode == 0:
                device = DiscoveredDevice(ip_address, None, "ping_discovered")

                output = result.stdout if isinstance(
                    result.stdout, str) else result.stdout.decode(
                    'utf-8', errors='ignore')
                latency_match = re.search(r"time[<=](\d+\.?\d*)\s*ms", output)
                if latency_match:
                    device.latency_ms = float(latency_match.group(1))

                with self._lock:
                    self.discovered_devices[ip_address] = device

                return device
        except (subprocess.TimeoutExpired, Exception) as e:
            logger.debug(f"Ping failed for {ip_address}: {e}")

        return None

    def scan_all_interfaces(self,
                            timeout: int = 2) -> Dict[str,
                                                      List[DiscoveredDevice]]:
        """Scan all active network interfaces"""
        results = {}
        interfaces = self.get_active_interfaces()

        logger.info(f"Found {len(interfaces)} active network interfaces")

        for interface in interfaces:
            try:
                devices = self.scan_subnet(interface, timeout)
                results[interface.subnet] = devices
            except Exception as e:
                logger.error(f"Error scanning subnet {interface.subnet}: {e}")
                results[interface.subnet] = []

        return results