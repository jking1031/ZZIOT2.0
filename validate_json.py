import json
import sys

filename = '/Library/nextcloud/MK/NODERED/zziot5.26/1.5.3/zziot1.5.3-25.4.5/miniprogram/pages/site-detail/flows (19).json'

try:
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print('JSON语法验证通过')
except json.JSONDecodeError as e:
    print(f'JSON语法错误: {e}')
except Exception as e:
    print(f'其他错误: {e}')