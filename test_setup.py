#!/usr/bin/env python3
"""
系統設置測試腳本
用於驗證所有必要組件是否正確安裝和配置
"""

import os
import sys
import subprocess
import importlib
from pathlib import Path

def test_python_version():
    """測試 Python 版本"""
    print("🔍 檢查 Python 版本...")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 8:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} - 符合要求")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor}.{version.micro} - 需要 Python 3.8+")
        return False

def test_required_packages():
    """測試必要套件"""
    print("\n🔍 檢查 Python 套件...")
    required_packages = [
        'fastapi',
        'uvicorn',
        'openai',
        'edge_tts',
        'requests',
        'python_dotenv',
        'pydantic'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            importlib.import_module(package.replace('-', '_'))
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - 未安裝")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n⚠️  缺少套件: {', '.join(missing_packages)}")
        print("請執行: pip install -r backend/requirements.txt")
        return False
    return True

def test_rhubarb_lip_sync():
    """測試 Rhubarb Lip Sync"""
    print("\n🔍 檢查 Rhubarb Lip Sync...")
    try:
        result = subprocess.run(['rhubarb', '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ Rhubarb Lip Sync 已安裝")
            return True
        else:
            print("❌ Rhubarb Lip Sync 執行失敗")
            return False
    except FileNotFoundError:
        print("❌ Rhubarb Lip Sync 未找到")
        print("請參考 docs/INSTALLATION.md 安裝 Rhubarb Lip Sync")
        return False
    except subprocess.TimeoutExpired:
        print("❌ Rhubarb Lip Sync 執行超時")
        return False

def test_environment_variables():
    """測試環境變數"""
    print("\n🔍 檢查環境變數...")
    
    # 檢查 .env 檔案是否存在
    env_file = Path("backend/.env")
    if env_file.exists():
        print("✅ .env 檔案存在")
        
        # 讀取並檢查關鍵變數
        with open(env_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if 'OPENAI_API_KEY' in content:
            print("✅ OpenAI API 金鑰已設定")
        else:
            print("⚠️  OpenAI API 金鑰未設定")
            
        if 'STORAGE_TYPE' in content:
            print("✅ 儲存類型已設定")
        else:
            print("⚠️  儲存類型未設定")
            
        return True
    else:
        print("❌ .env 檔案不存在")
        print("請複製 backend/env.example 為 backend/.env 並填入設定")
        return False

def test_directory_structure():
    """測試目錄結構"""
    print("\n🔍 檢查專案結構...")
    
    required_dirs = [
        'backend',
        'backend/app',
        'backend/app/api',
        'backend/app/core',
        'backend/app/services',
        'frontend',
        'frontend/src',
        'frontend/src/components',
        'frontend/src/services',
        'docs'
    ]
    
    missing_dirs = []
    for dir_path in required_dirs:
        if Path(dir_path).exists():
            print(f"✅ {dir_path}")
        else:
            print(f"❌ {dir_path} - 目錄不存在")
            missing_dirs.append(dir_path)
    
    if missing_dirs:
        print(f"\n⚠️  缺少目錄: {', '.join(missing_dirs)}")
        return False
    return True

def test_backend_files():
    """測試後端檔案"""
    print("\n🔍 檢查後端檔案...")
    
    required_files = [
        'backend/main.py',
        'backend/requirements.txt',
        'backend/app/api/routes.py',
        'backend/app/core/config.py',
        'backend/app/services/avatar_service.py',
        'backend/app/services/storage_service.py'
    ]
    
    missing_files = []
    for file_path in required_files:
        if Path(file_path).exists():
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} - 檔案不存在")
            missing_files.append(file_path)
    
    if missing_files:
        print(f"\n⚠️  缺少檔案: {', '.join(missing_files)}")
        return False
    return True

def test_frontend_files():
    """測試前端檔案"""
    print("\n🔍 檢查前端檔案...")
    
    required_files = [
        'frontend/package.json',
        'frontend/index.html',
        'frontend/src/main.tsx',
        'frontend/src/App.tsx',
        'frontend/src/components/AvatarRenderer.tsx',
        'frontend/src/components/ChatInterface.tsx',
        'frontend/src/services/avatarService.ts'
    ]
    
    missing_files = []
    for file_path in required_files:
        if Path(file_path).exists():
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} - 檔案不存在")
            missing_files.append(file_path)
    
    if missing_files:
        print(f"\n⚠️  缺少檔案: {', '.join(missing_files)}")
        return False
    return True

def main():
    """主測試函數"""
    print("🚀 開始系統設置測試...\n")
    
    tests = [
        test_python_version,
        test_required_packages,
        test_rhubarb_lip_sync,
        test_environment_variables,
        test_directory_structure,
        test_backend_files,
        test_frontend_files
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\n📊 測試結果: {passed}/{total} 通過")
    
    if passed == total:
        print("🎉 所有測試通過！系統已準備就緒。")
        print("\n下一步:")
        print("1. 啟動後端: cd backend && python main.py")
        print("2. 啟動前端: cd frontend && npm install && npm run dev")
        print("3. 開啟瀏覽器訪問: http://localhost:3000")
    else:
        print("⚠️  部分測試失敗，請檢查上述問題並重新運行測試。")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
