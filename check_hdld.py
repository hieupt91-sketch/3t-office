import zipfile
import re

with zipfile.ZipFile('file test/HDLD.docx') as z:
    content = z.read('word/document.xml').decode('utf-8')
    pgMar = re.search(r'<w:pgMar\b([^>]*)>', content)
    if pgMar:
        attrs = pgMar.group(1)
        print('attrs:', attrs)
        for side in ['top', 'right', 'bottom', 'left', 'header', 'footer']:
            match = re.search(rf'w:{side}=["\'](\d+)["\']', attrs, re.I)
            if match:
                twips = int(match.group(1))
                mm = round((twips / 1440) * 25.4 * 10) / 10
                print(f'  {side}: {twips} twips = {mm} mm')
            else:
                print(f'  {side}: not found')