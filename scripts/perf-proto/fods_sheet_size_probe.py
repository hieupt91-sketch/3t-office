"""Scratch-only Expat byte-span probe for top-level worksheet XML blocks."""
import sys
import time
from xml.parsers import expat

path = sys.argv[1]
start = time.perf_counter()
parser = expat.ParserCreate()
stack = []
sheet_spans = []
active_sheet = ""
active_text = False


def start_element(name, attrs):
    global active_text
    if name == "table:table" and stack and stack[-1] == "table:table-header-rows":
        pass
    if name == "table:table" and "office:spreadsheet" in stack and stack[-1] == "office:spreadsheet":
        sheet_spans.append({"name": attrs.get("table:name", ""), "start": parser.CurrentByteIndex,
                            "depth": len(stack)})
    if name == "config:config-item" and attrs.get("config:name") == "ActiveTable":
        active_text = True
    stack.append(name)


def end_element(name):
    global active_text
    if (name == "table:table" and sheet_spans and "end" not in sheet_spans[-1]
            and sheet_spans[-1]["depth"] == len(stack) - 1):
        close_start = parser.CurrentByteIndex
        sheet_spans[-1]["end"] = close_start + len(b"</table:table>")
    if name == "config:config-item":
        active_text = False
    stack.pop()


def character_data(value):
    global active_sheet
    if active_text:
        active_sheet += value


parser.StartElementHandler = start_element
parser.EndElementHandler = end_element
parser.CharacterDataHandler = character_data
with open(path, "rb") as source:
    parser.ParseFile(source)

print(f"seconds={time.perf_counter()-start:.2f} active_sheet={active_sheet!r}")
total = 0
for sheet in sheet_spans:
    size = sheet.get("end", sheet["start"]) - sheet["start"]
    total += size
    print(f"{sheet['name']}\t{size}\t{size/1e6:.2f} MB")
print(f"top_level_sheet_xml_mb={total/1e6:.2f}")
