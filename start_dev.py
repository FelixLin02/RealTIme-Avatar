#!/usr/bin/env python3
"""
RealTime Avatar 快速啟動腳本
自動檢查環境、安裝依賴、啟動開發服務
"""

import os
import sys
import subprocess
import platform
import json
from pathlib import Path

class DevStarter:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.backend_dir = self.project_root / "backend"
        self.frontend_dir = self.project_root / "frontend"
        
    def print_header(self):
        print("=" * 60)
        print("🚀 RealTime Avatar 開發環境啟動器")
        print("=" * 60)
        
    def check_python_version(self):
        """檢查 Python 版本"""
        print("📋 檢查 Python 版本...")
        version = sys.version_info
        if version.major < 3 or (version.major == 3 and version.minor < 8):
            print("❌ 錯誤：需要 Python 3.8 或更高版本")
            print(f"   當前版本：{version.major}.{version.minor}.{version.micro}")
            return False
        print(f"✅ Python 版本檢查通過：{version.major}.{version.minor}.{version.micro}")
        return True
        
    def check_node_version(self):
        """檢查 Node.js 版本"""
        print("📋 檢查 Node.js 版本...")
        try:
            result = subprocess.run(["node", "--version"], 
                                  capture_output=True, text=True, check=True)
            version = result.stdout.strip()
            print(f"✅ Node.js 版本：{version}")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ 錯誤：未找到 Node.js，請先安裝 Node.js")
            return False
            
    def check_npm(self):
        """檢查 npm"""
        print("📋 檢查 npm...")
        try:
            result = subprocess.run(["npm", "--version"], 
                                  capture_output=True, text=True, check=True)
            version = result.stdout.strip()
            print(f"✅ npm 版本：{version}")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ 錯誤：未找到 npm")
            return False
            
    def check_rhubarb(self):
        """檢查 Rhubarb Lip Sync"""
        print("📋 檢查 Rhubarb Lip Sync...")
        try:
            result = subprocess.run(["rhubarb", "--version"], 
                                  capture_output=True, text=True, check=True)
            print("✅ Rhubarb Lip Sync 已安裝")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("⚠️  警告：未找到 Rhubarb Lip Sync")
            print("   請參考 docs/INSTALLATION.md 進行安裝")
            return False
            
    def install_backend_dependencies(self):
        """安裝後端依賴"""
        print("📦 安裝後端依賴...")
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", 
                          str(self.backend_dir / "requirements.txt")], 
                          check=True, cwd=self.backend_dir)
            print("✅ 後端依賴安裝完成")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ 後端依賴安裝失敗：{e}")
            return False
            
    def install_frontend_dependencies(self):
        """安裝前端依賴"""
        print("📦 安裝前端依賴...")
        try:
            subprocess.run(["npm", "install"], check=True, cwd=self.frontend_dir)
            print("✅ 前端依賴安裝完成")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ 前端依賴安裝失敗：{e}")
            return False
            
    def check_env_files(self):
        """檢查環境變數檔案"""
        print("📋 檢查環境變數檔案...")
        
        # 檢查後端 .env
        backend_env = self.backend_dir / ".env"
        backend_env_example = self.backend_dir / ".env.example"
        
        if not backend_env.exists():
            if backend_env_example.exists():
                print("⚠️  警告：後端缺少 .env 檔案")
                print("   請複製 backend/.env.example 為 backend/.env 並填入設定")
            else:
                print("❌ 錯誤：後端缺少 .env.example 檔案")
                return False
        else:
            print("✅ 後端 .env 檔案存在")
            
        # 檢查前端 .env
        frontend_env = self.frontend_dir / ".env"
        frontend_env_example = self.frontend_dir / ".env.example"
        
        if not frontend_env.exists():
            if frontend_env_example.exists():
                print("⚠️  警告：前端缺少 .env 檔案")
                print("   請複製 frontend/.env.example 為 frontend/.env 並填入設定")
            else:
                print("❌ 錯誤：前端缺少 .env.example 檔案")
                return False
        else:
            print("✅ 前端 .env 檔案存在")
            
        return True
        
    def start_backend(self):
        """啟動後端服務"""
        print("🚀 啟動後端服務...")
        try:
            # 在 Windows 上使用 start 命令
            if platform.system() == "Windows":
                subprocess.Popen(["start", "cmd", "/k", 
                                f"cd {self.backend_dir} && python main.py"], 
                               shell=True)
            else:
                # 在 Linux/Mac 上使用 gnome-terminal 或 xterm
                if subprocess.run(["which", "gnome-terminal"], 
                                capture_output=True).returncode == 0:
                    subprocess.Popen(["gnome-terminal", "--", "bash", "-c", 
                                    f"cd {self.backend_dir} && python main.py"])
                elif subprocess.run(["which", "xterm"], 
                                  capture_output=True).returncode == 0:
                    subprocess.Popen(["xterm", "-e", 
                                    f"cd {self.backend_dir} && python main.py"])
                else:
                    print("⚠️  無法自動開啟終端，請手動執行：")
                    print(f"   cd {self.backend_dir}")
                    print("   python main.py")
                    
            print("✅ 後端服務啟動中...")
            return True
        except Exception as e:
            print(f"❌ 後端服務啟動失敗：{e}")
            return False
            
    def start_frontend(self):
        """啟動前端服務"""
        print("🚀 啟動前端服務...")
        try:
            # 在 Windows 上使用 start 命令
            if platform.system() == "Windows":
                subprocess.Popen(["start", "cmd", "/k", 
                                f"cd {self.frontend_dir} && npm run dev"], 
                               shell=True)
            else:
                # 在 Linux/Mac 上使用 gnome-terminal 或 xterm
                if subprocess.run(["which", "gnome-terminal"], 
                                capture_output=True).returncode == 0:
                    subprocess.Popen(["gnome-terminal", "--", "bash", "-c", 
                                    f"cd {self.frontend_dir} && npm run dev"])
                elif subprocess.run(["which", "xterm"], 
                                  capture_output=True).returncode == 0:
                    subprocess.Popen(["xterm", "-e", 
                                    f"cd {self.frontend_dir} && npm run dev"])
                else:
                    print("⚠️  無法自動開啟終端，請手動執行：")
                    print(f"   cd {self.frontend_dir}")
                    print("   npm run dev")
                    
            print("✅ 前端服務啟動中...")
            return True
        except Exception as e:
            print(f"❌ 前端服務啟動失敗：{e}")
            return False
            
    def run_tests(self):
        """執行測試腳本"""
        print("🧪 執行系統測試...")
        try:
            result = subprocess.run([sys.executable, "test_setup.py"], 
                                  capture_output=True, text=True, check=True)
            print("✅ 系統測試通過")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ 系統測試失敗：{e}")
            print(f"   錯誤輸出：{e.stderr}")
            return False
            
    def show_next_steps(self):
        """顯示後續步驟"""
        print("\n" + "=" * 60)
        print("🎉 開發環境啟動完成！")
        print("=" * 60)
        print("\n📋 後續步驟：")
        print("1. 後端服務將在 http://localhost:8000 運行")
        print("2. 前端服務將在 http://localhost:3000 運行")
        print("3. 訪問 http://localhost:3000 開始使用")
        print("\n📚 相關文件：")
        print("- docs/INSTALLATION.md - 詳細安裝指南")
        print("- Pipeline.md - 專案架構說明")
        print("\n🔧 常用命令：")
        print("- 後端重啟：cd backend && python main.py")
        print("- 前端重啟：cd frontend && npm run dev")
        print("- 前端建置：cd frontend && npm run build")
        
    def run(self):
        """執行完整的啟動流程"""
        self.print_header()
        
        # 檢查基本環境
        if not self.check_python_version():
            return False
        if not self.check_node_version():
            return False
        if not self.check_npm():
            return False
            
        # 檢查 Rhubarb（可選）
        self.check_rhubarb()
        
        # 檢查環境檔案
        if not self.check_env_files():
            print("\n⚠️  請先設定環境變數檔案後再重新執行")
            return False
            
        # 安裝依賴
        if not self.install_backend_dependencies():
            return False
        if not self.install_frontend_dependencies():
            return False
            
        # 執行測試
        self.run_tests()
        
        # 啟動服務
        if not self.start_backend():
            return False
        if not self.start_frontend():
            return False
            
        # 顯示後續步驟
        self.show_next_steps()
        
        return True

if __name__ == "__main__":
    starter = DevStarter()
    success = starter.run()
    
    if not success:
        print("\n❌ 啟動失敗，請檢查上述錯誤訊息")
        sys.exit(1)
    else:
        print("\n✅ 啟動成功！")
