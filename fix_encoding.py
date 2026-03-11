import os

def fix_encoding(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            f.read()
        print(f"OK (UTF-8): {filepath}")
    except UnicodeDecodeError:
        print(f"Fixing encoding for: {filepath}")
        try:
            with open(filepath, 'r', encoding='shift_jis') as f:
                content = f.read()
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed (Shift-JIS -> UTF-8): {filepath}")
        except Exception as e:
            print(f"Failed to fix {filepath}: {e}")
            # Try passing simple utf-8 replace
            with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed (Replaced bad chars -> UTF-8): {filepath}")

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            fix_encoding(os.path.join(root, file))
