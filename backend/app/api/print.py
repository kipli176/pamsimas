"""
Print API untuk PAMSIMAS
Menangani printing ke thermal printer via berbagai metode
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
import base64
import socket
import subprocess
import platform

router = APIRouter()


class ThermalPrintRequest(BaseModel):
    """Request model untuk thermal print."""
    commands: List[str]  # ESC/POS commands
    ukuran: int = 58  # 58mm atau 80mm
    method: Optional[str] = "network"  # network, usb, bluetooth, rawbt


class ThermalPrintResponse(BaseModel):
    """Response model untuk thermal print."""
    success: bool
    message: str
    commands_encoded: Optional[str] = None  # Base64 encoded commands for rawbt


def encode_commands_for_rawbt(commands: List[str]) -> str:
    """
    Encode ESC/POS commands ke base64 untuk rawbt app.

    Args:
        commands: List of ESC/POS command strings

    Returns:
        Base64 encoded string
    """
    # Join commands dan convert ke bytes
    commands_text = '\n'.join(commands)
    commands_bytes = commands_text.encode('utf-8')

    # Encode ke base64
    encoded = base64.b64encode(commands_bytes).decode('ascii')

    return encoded


def print_to_network_printer(commands: List[str], printer_ip: str = "127.0.0.1", printer_port: int = 9100):
    """
    Kirim ESC/POS commands ke network printer.

    Args:
        commands: List of ESC/POS command strings
        printer_ip: IP address dari printer
        printer_port: Port printer (default 9100)

    Returns:
        bool: True jika berhasil, False jika gagal
    """
    try:
        # Join commands
        print_data = '\n'.join(commands).encode('utf-8')

        # Create socket dan kirim data
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        sock.connect((printer_ip, printer_port))
        sock.send(print_data)
        sock.close()

        return True
    except Exception as e:
        print(f"Error printing to network printer: {e}")
        return False


def print_to_usb_printer(commands: List[str], device_path: str = "/dev/usb/lp0"):
    """
    Kirim ESC/POS commands ke USB printer (Linux).

    Args:
        commands: List of ESC/POS command strings
        device_path: Path ke device printer

    Returns:
        bool: True jika berhasil, False jika gagal
    """
    try:
        # Join commands
        print_data = '\n'.join(commands).encode('utf-8')

        # Write to device
        with open(device_path, 'wb') as printer:
            printer.write(print_data)

        return True
    except Exception as e:
        print(f"Error printing to USB printer: {e}")
        return False


def print_to_windows_printer(commands: List[str], printer_name: str = None):
    """
    Kirim ESC/POS commands ke Windows printer.

    Args:
        commands: List of ESC/POS command strings
        printer_name: Nama printer (jika None, gunakan default)

    Returns:
        bool: True jika berhasil, False jika gagal
    """
    try:
        # Join commands
        print_data = '\n'.join(commands)

        # Gunakan perintah Windows print
        if printer_name:
            cmd = f'echo "{print_data}" | print /D:"{printer_name}"'
        else:
            cmd = f'echo "{print_data}" | print'

        # Execute command (Windows only)
        result = subprocess.run(cmd, shell=True, capture_output=True)

        return result.returncode == 0
    except Exception as e:
        print(f"Error printing to Windows printer: {e}")
        return False


@router.post("/thermal", response_model=ThermalPrintResponse)
async def print_thermal(request: ThermalPrintRequest):
    """
    Kirim perintah print ke thermal printer.

    Endpoint ini menerima ESC/POS commands dari frontend dan mengirimnya
    ke thermal printer via berbagai metode (network, USB, Bluetooth, atau rawbt).

    Untuk penggunaan dengan rawbt app:
    1. Install rawbt app di Android
    2. Scan QR code atau gunakan deep link
    3. Commands akan terkirim ke rawbt untuk printing

    Args:
        request: ThermalPrintRequest dengan commands dan ukuran

    Returns:
        ThermalPrintResponse dengan status dan encoded commands
    """
    try:
        # Encode commands untuk rawbt (fallback)
        encoded_commands = encode_commands_for_rawbt(request.commands)

        # Coba print berdasarkan method
        success = False
        message = ""

        if request.method == "network":
            # Coba kirim ke network printer di localhost:9100
            # (bisa diubah untuk printer IP yang sebenarnya)
            success = print_to_network_printer(request.commands)
            if success:
                message = "Berhasil mengirim ke network printer"
            else:
                message = "Gagal mengirim ke network printer. Gunakan encoded commands untuk rawbt."

        elif request.method == "usb":
            # Coba kirim ke USB printer (Linux)
            success = print_to_usb_printer(request.commands)
            if success:
                message = "Berhasil mengirim ke USB printer"
            else:
                message = "Gagal mengirim ke USB printer. Gunakan encoded commands untuk rawbt."

        elif request.method == "windows":
            # Coba kirim ke Windows printer
            success = print_to_windows_printer(request.commands)
            if success:
                message = "Berhasil mengirim ke Windows printer"
            else:
                message = "Gagal mengirim ke Windows printer. Gunakan encoded commands untuk rawbt."

        else:  # rawbt atau default
            # Untuk rawbt, kita hanya encode dan return
            success = True
            message = "Commands siap untuk rawbt app. Scan QR code atau gunakan deep link."

        return ThermalPrintResponse(
            success=success,
            message=message,
            commands_encoded=encoded_commands
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal memproses print request: {str(e)}"
        )


@router.get("/thermal/qr/{encoded_commands}")
async def generate_rawbt_qr(encoded_commands: str):
    """
    Generate QR code untuk rawbt app deep link.

    Args:
        encoded_commands: Base64 encoded ESC/POS commands

    Returns:
        JSON dengan rawbt deep link URL
    """
    try:
        # Rawbt deep link format
        # rawbt://print?data=<base64_encoded_commands>
        rawbt_url = f"rawbt://print?data={encoded_commands}"

        return {
            "rawbt_url": rawbt_url,
            "qr_data": rawbt_url,
            "message": "Scan QR code ini dengan rawbt app untuk print"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal generate QR code: {str(e)}"
        )


@router.post("/thermal/test")
async def test_print():
    """
    Test print endpoint.

    Mengirim test print ke printer untuk memastikan koneksi berjalan.

    Returns:
        Test print response
    """
    test_commands = [
        '\x1B@',  # Initialize
        '\x1Ba\x01',  # Center
        '\x1B!\x01',  # Bold
        'TEST PRINT',
        '\x1B!\x00',  # Normal
        'PAMSIMAS System',
        'Printer OK!',
        '\n\n'  # Feed
    ]

    request = ThermalPrintRequest(
        commands=test_commands,
        ukuran=58,
        method="network"
    )

    return await print_thermal(request)


@router.get("/health")
async def print_health():
    """
    Cek status printer service.

    Returns:
        Status informasi tentang printing capability
    """
    system = platform.system()

    available_methods = ["rawbt"]  # Always available

    if system == "Linux":
        available_methods.append("usb")
        available_methods.append("network")
    elif system == "Windows":
        available_methods.append("windows")
        available_methods.append("network")
    elif system == "Darwin":  # macOS
        available_methods.append("network")

    return {
        "status": "online",
        "system": system,
        "available_methods": available_methods,
        "default_method": "rawbt"
    }
