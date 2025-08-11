#!/usr/bin/env python3
"""
批量生成嘴部同步素材
基於用戶的極簡主義 avatar.svg 風格
"""

import os

def generate_mouth_variant(filename, mouth_svg):
    """生成特定嘴部形狀的 SVG"""
    template = f'''<svg width="300" height="400" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
  <!-- 基於用戶 avatar.svg 的極簡主義風格 - {filename} -->
  
  <!-- 背景棋盤格 -->
  <defs>
    <pattern id="checkerboard" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="#FFFFFF"/>
      <rect x="10" y="0" width="10" height="10" fill="#CCCCCC"/>
      <rect x="0" y="10" width="10" height="10" fill="#CCCCCC"/>
      <rect x="10" y="10" width="10" height="10" fill="#FFFFFF"/>
    </pattern>
  </defs>
  
  <!-- 背景 -->
  <rect width="300" height="400" fill="url(#checkerboard)"/>
  
  <!-- 臉部輪廓 - 淺桃色橢圓 -->
  <ellipse cx="150" cy="200" rx="60" ry="80" fill="#FFE4B5" stroke="#D2691E" stroke-width="2"/>
  
  <!-- 頭髮/帽子 - 深棕色 V 形 -->
  <path d="M 90 140 L 150 120 L 210 140 L 200 160 L 100 160 Z" fill="#8B4513"/>
  
  <!-- 眼睛 - 簡化的圓形 -->
  <g id="eyes">
    <!-- 左眼 -->
    <circle cx="130" cy="180" r="8" fill="#4A4A4A"/>
    <circle cx="130" cy="178" r="3" fill="#FFFFFF"/>
    
    <!-- 右眼 -->
    <circle cx="170" cy="180" r="8" fill="#4A4A4A"/>
    <circle cx="170" cy="178" r="3" fill="#FFFFFF"/>
  </g>
  
  <!-- 鼻子 - 橘棕色橢圓 -->
  <ellipse cx="150" cy="200" rx="3" ry="6" fill="#D2691E"/>
  
  <!-- 嘴部 - {filename} -->
  <g id="mouth">
    {mouth_svg}
  </g>
  
  <!-- 下巴飾品 - 黃色橢圓 -->
  <ellipse cx="150" cy="280" rx="15" ry="5" fill="#FFD700"/>
  <circle cx="150" cy="280" r="2" fill="#D2691E"/>
</svg>'''
    
    return template

# 定義所有嘴部形狀
mouth_variants = {
    "avatar-mouth-closed.svg": '<line x1="140" y1="240" x2="160" y2="240" stroke="#FF6B6B" stroke-width="2" stroke-linecap="round"/>',
    
    "avatar-mouth-slightly-open.svg": '<ellipse cx="150" cy="240" rx="8" ry="3" fill="#FF6B6B"/>',
    
    "avatar-mouth-half-open.svg": '<ellipse cx="150" cy="240" rx="10" ry="5" fill="#FF6B6B"/>',
    
    "avatar-mouth-wide-open.svg": '<ellipse cx="150" cy="240" rx="12" ry="7" fill="#FF6B6B"/>',
    
    "avatar-mouth-round.svg": '<circle cx="150" cy="240" r="8" fill="#FF6B6B"/>',
    
    "avatar-mouth-smile.svg": '<path d="M 140 240 Q 150 235 160 240" fill="none" stroke="#FF6B6B" stroke-width="3" stroke-linecap="round"/>',
    
    "avatar-mouth-surprised.svg": '<circle cx="150" cy="240" r="10" fill="#FF6B6B"/>',
    
    "avatar-mouth-tight.svg": '<line x1="140" y1="240" x2="160" y2="240" stroke="#FF6B6B" stroke-width="4" stroke-linecap="round"/>',
    
    "avatar-mouth-sibilant.svg": '<ellipse cx="150" cy="240" rx="8" ry="2" fill="#FF6B6B"/>'
}

def main():
    """生成所有嘴部變體"""
    output_dir = "frontend/src/assets/mouth-variants"
    
    # 確保目錄存在
    os.makedirs(output_dir, exist_ok=True)
    
    print("🎨 生成嘴部同步素材...")
    
    for filename, mouth_svg in mouth_variants.items():
        content = generate_mouth_variant(filename.replace(".svg", ""), mouth_svg)
        
        filepath = os.path.join(output_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ 已生成: {filename}")
    
    print(f"\n🎉 完成！共生成 {len(mouth_variants)} 個嘴部變體")
    print(f"📁 位置: {output_dir}")

if __name__ == "__main__":
    main()
