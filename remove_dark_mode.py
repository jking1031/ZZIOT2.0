import os
import re

def remove_dark_mode_styles(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 移除深色模式相关的CSS块
    patterns = [
        r'/\*\s*深色模式[^*]*\*/.*?@media\s*\([^)]*dark[^)]*\)\s*{.*?}\s*}',
        r'/\*\s*暗色模式[^*]*\*/.*?@media\s*\([^)]*dark[^)]*\)\s*{.*?}\s*}',
        r'@media\s*\([^)]*prefers-color-scheme:\s*dark[^)]*\)\s*{.*?}\s*}',
        r'/\*\s*深色模式[^*]*\*/',
        r'/\*\s*暗色模式[^*]*\*/'
    ]
    
    for pattern in patterns:
        content = re.sub(pattern, '', content, flags=re.DOTALL | re.MULTILINE)
    
    # 清理多余的空行
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

# 查找所有wxss文件
for root, dirs, files in os.walk('/Library/nextcloud/MK/NODERED/zziot5.26/1.5.3/zziot1.5.3-25.4.5/miniprogram'):
    for file in files:
        if file.endswith('.wxss'):
            file_path = os.path.join(root, file)
            print(f'Processing: {file_path}')
            remove_dark_mode_styles(file_path)

print('Dark mode styles removed from all wxss files.')