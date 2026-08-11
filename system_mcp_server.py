"""MCP Server for monitoring local computer resources (CPU, RAM, Processes, Disk).

Uses mcp.server.fastmcp and psutil.
Compatible with Python 3.14+.
"""

import platform
import time
from fastmcp import FastMCP
import psutil
import os

# 1. Tắt tính năng tự động check update qua mạng của FastMCP
os.environ["FASTMCP_DISABLE_VERSION_CHECK"] = "1"

# 2. Vô hiệu hóa hàm kiểm tra phiên bản để chặn triệt để httpx gọi SSL
try:
  import fastmcp.utilities.version_check

  fastmcp.utilities.version_check.check_for_newer_version = lambda *a, **k: None
  fastmcp.utilities.version_check.get_latest_version = lambda *a, **k: None
except Exception:
  pass

# Initialize MCP Server with name "LocalSystemMonitor"
mcp = FastMCP("LocalSystemMonitor")


@mcp.tool()
def get_system_overview() -> str:
  """Retrieve system overview including CPU, RAM, Disk usage, and OS information."""
  cpu_percent = psutil.cpu_percent(interval=1)
  mem = psutil.virtual_memory()
  disk = psutil.disk_usage("/")
  boot_time = time.strftime(
      "%Y-%m-%d %H:%M:%S", time.localtime(psutil.boot_time())
  )

  return f"""--- SYSTEM OVERVIEW ---
OS: {platform.system()} {platform.release()} ({platform.machine()})
Boot Time: {boot_time}
CPU Usage: {cpu_percent}%
RAM Usage: {mem.percent}% ({mem.used / (1024**3):.2f} GB / {mem.total / (1024**3):.2f} GB)
Disk Usage (/): {disk.percent}% ({disk.used / (1024**3):.2f} GB / {disk.total / (1024**3):.2f} GB)"""


@mcp.tool()
def get_cpu_info() -> str:
  """Retrieve detailed CPU usage per core and current clock frequency."""
  cpu_percent_per_core = psutil.cpu_percent(interval=1, percpu=True)
  freq = psutil.cpu_freq()
  freq_str = f"{freq.current:.0f} MHz" if freq else "N/A"

  result = [
      f"Physical Cores: {psutil.cpu_count(logical=False)}",
      f"Logical Cores: {psutil.cpu_count(logical=True)}",
      f"Current Frequency: {freq_str}",
      "Usage Per Core:",
  ]
  for i, percent in enumerate(cpu_percent_per_core):
    result.append(f"  - Core {i}: {percent}%")
  return "\n".join(result)


@mcp.tool()
def get_memory_info() -> str:
  """Retrieve detailed information about RAM and Swap memory."""
  mem = psutil.virtual_memory()
  swap = psutil.swap_memory()

  return f"""--- RAM DETAILS ---
Total: {mem.total / (1024**3):.2f} GB
Used: {mem.used / (1024**3):.2f} GB ({mem.percent}%)
Available: {mem.available / (1024**3):.2f} GB

--- SWAP DETAILS ---
Total: {swap.total / (1024**3):.2f} GB
Used: {swap.used / (1024**3):.2f} GB ({swap.percent}%)"""


@mcp.tool()
def get_top_processes(limit: int = 10, sort_by: str = "cpu") -> str:
  """Retrieve a list of top resource-consuming running processes.

  Args:
      limit: Number of processes to display (default: 10).
      sort_by: Sorting criteria: 'cpu' or 'memory'.
  """
  processes = []
  for proc in psutil.process_iter(
      ["pid", "name", "cpu_percent", "memory_percent"]
  ):
    try:
      pinfo = proc.info
      processes.append(pinfo)
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
      pass

  key = "memory_percent" if sort_by.lower() == "memory" else "cpu_percent"
  sorted_procs = sorted(
      processes, key=lambda p: p.get(key) or 0, reverse=True
  )[:limit]

  result = [
      f"--- TOP {limit} PROCESSES CONSUMING MOST {sort_by.upper()} ---",
      f"{'PID':<8} {'PROCESS NAME':<28} {'CPU (%)':<10} {'RAM (%)':<10}",
      "-" * 60,
  ]
  for p in sorted_procs:
    cpu = f"{p['cpu_percent']:.1f}" if p["cpu_percent"] is not None else "0.0"
    ram = (
        f"{p['memory_percent']:.1f}" if p["memory_percent"] is not None else "0.0"
    )
    name = (p["name"][:25] + "...") if len(p["name"]) > 25 else p["name"]
    result.append(f"{p['pid']:<8} {name:<28} {cpu:<10} {ram:<10}")

  return "\n".join(result)


@mcp.tool()
def get_disk_info() -> str:
  """Retrieve disk partition information and usage statistics."""
  partitions = psutil.disk_partitions()
  result = ["--- DISK INFORMATION ---"]
  for p in partitions:
    try:
      usage = psutil.disk_usage(p.mountpoint)
      result.append(
          f"Device: {p.device} | Mount: {p.mountpoint} | Format:"
          f" {p.fstype}\n  Total: {usage.total / (1024**3):.2f} GB | Used:"
          f" {usage.used / (1024**3):.2f} GB ({usage.percent}%) | Free:"
          f" {usage.free / (1024**3):.2f} GB"
      )
    except PermissionError:
      continue
  return "\n".join(result)


if __name__ == "__main__":
  mcp.run()