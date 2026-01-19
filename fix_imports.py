#!/usr/bin/env python3
"""
سكريبت لحل مشاكل الاستيراد في Network Monitor
يتحقق من تثبيت الحزم ويثبتها إذا كانت مفقودة
"""

import subprocess
import sys
import importlib

def check_and_install(package, pip_name=None):
    """التحقق من الحزمة وتثبيتها إذا كانت مفقودة"""
    if pip_name is None:
        pip_name = package

    try:
        importlib.import_module(package)
        print(f"✅ {package} مثبت بالفعل")
        return True
    except ImportError:
        print(f"❌ {package} غير مثبت")
        print(f"🔄 جاري تثبيت {pip_name}...")

        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", pip_name])
            print(f"✅ تم تثبيت {package} بنجاح")
            return True
        except subprocess.CalledProcessError:
            print(f"❌ فشل تثبيت {package}")
            return False

def main():
    """الدالة الرئيسية"""
    print("=" * 60)
    print("🔧 حل مشاكل الاستيراد - Network Monitor")
    print("=" * 60)
    print()

    # قائمة الحزم المطلوبة
    packages = [
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn[standard]"),
        ("pydantic", "pydantic"),
        ("pydantic_settings", "pydantic-settings"),
        ("duckdb", "duckdb"),
        ("pandas", "pandas"),
        ("bcrypt", "bcrypt"),
        ("jose", "python-jose[cryptography]"),
        ("cryptography", "cryptography"),
        ("scapy", "scapy"),
        ("netifaces", "netifaces"),
        ("nmap", "python-nmap"),
    ]

    failed = []

    for package, pip_name in packages:
        if not check_and_install(package, pip_name):
            failed.append((package, pip_name))

    print()
    print("=" * 60)
    print("📊 نتائج التثبيت:")
    print("=" * 60)

    if not failed:
        print("✅ تم تثبيت جميع الحزم بنجاح!")
        print()
        print("🎉 يمكنك الآن تشغيل التطبيق:")
        print("   python main.py")
    else:
        print(f"❌ فشل تثبيت {len(failed)} حزمة/حزم:")
        for package, pip_name in failed:
            print(f"   - {package}")
        print()
        print("💡 حاول تثبيتها يدوياً:")
        for package, pip_name in failed:
            print(f"   pip install {pip_name}")

    print()
    print("🔍 للتحقق من التثبيت:")
    print("   python -c \"import fastapi, uvicorn, pydantic; print('✅ Success!')\"")

if __name__ == "__main__":
    main()
