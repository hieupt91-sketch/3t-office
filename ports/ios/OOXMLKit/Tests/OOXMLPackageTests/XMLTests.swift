import XCTest
@testable import OOXMLPackage

final class XMLTests: XCTestCase {
    func testParseAndSerializePreservesStructure() throws {
        let src = """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <!-- đầu --><root xmlns="urn:a" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac" z="1" a="2"><?pi data?><e  b = 'v&quot;"'>Tiếng &lt;Việt&gt; &amp; &#x1F600; &#65;</e><![CDATA[<raw> & ]]><empty/><mc:AlternateContent><mc:Choice Requires="x14"/></mc:AlternateContent>  </root>
        """
        let doc = try XDocument(string: src)
        XCTAssertEqual(doc.declaration, #"version="1.0" encoding="UTF-8" standalone="yes""#)
        XCTAssertEqual(doc.root.attributes.map(\.name), ["xmlns", "xmlns:mc", "mc:Ignorable", "z", "a"], "giữ thứ tự thuộc tính")
        let e = doc.root.elements[0]
        XCTAssertEqual(e.attribute("b"), "v\"\"")
        XCTAssertEqual(e.textContent, "Tiếng <Việt> & 😀 A")
        let out = doc.string
        XCTAssertTrue(out.contains("<!-- đầu -->"))
        XCTAssertTrue(out.contains("<?pi data?>"))
        XCTAssertTrue(out.contains("<![CDATA[<raw> & ]]>"))
        XCTAssertTrue(out.contains("<mc:AlternateContent><mc:Choice Requires=\"x14\"/></mc:AlternateContent>  </root>"))
        XCTAssertTrue(out.contains(#"<e b="v&quot;&quot;">Tiếng &lt;Việt&gt; &amp; 😀 A</e>"#))
        // Ổn định: phân tích lại cho cùng kết quả.
        XCTAssertEqual(try XDocument(string: out).string, out)
    }

    func testNamespaceResolutionWithPrefixes() throws {
        let doc = try XDocument(string: """
        <x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><x:sheetData><x:row r="1"/></x:sheetData><x:drawing r:id="rId5"/><inner xmlns:x="urn:other"><x:row/></inner></x:worksheet>
        """)
        let sd = doc.root.firstChild(NS.s, "sheetData")
        XCTAssertNotNil(sd)
        XCTAssertEqual(sd?.children(NS.s, "row").count, 1)
        XCTAssertEqual(doc.root.firstChild(NS.s, "drawing")?.attribute("id", in: NS.r), "rId5")
        XCTAssertEqual(doc.root.descendants(NS.s, "row").count, 1, "x: được khai báo lại trong inner không thuộc SpreadsheetML")
        XCTAssertEqual(sd!.qualifiedName("c", in: NS.s).name, "x:c")
        let inner = doc.root.elements.last!
        XCTAssertTrue(inner.qualifiedName("c", in: NS.s).needsDeclaration)
    }

    func testStrictNamespaceIsRecognized() throws {
        let doc = try XDocument(string: #"<worksheet xmlns="http://purl.oclc.org/ooxml/spreadsheetml/main"><sheetData/></worksheet>"#)
        XCTAssertNotNil(doc.root.firstChild(NS.s, "sheetData"))
    }

    func testWhitespaceAndNewlines() throws {
        let doc = try XDocument(data: Data("<a x=\"1\r\n2\tz\"> l1\r\n l2\r</a>".utf8))
        XCTAssertEqual(doc.root.attribute("x"), "1 2 z")
        XCTAssertEqual(doc.root.textContent, " l1\n l2\n")
        let doc2 = try XDocument(string: "<a x=\"1&#10;2&#13;\">&#13;</a>")
        XCTAssertEqual(doc2.root.attribute("x"), "1\n2\r")
        XCTAssertEqual(try XDocument(string: doc2.string).root.attribute("x"), "1\n2\r", "ký tự xuống dòng trong thuộc tính phải giữ qua vòng lưu")
        XCTAssertEqual(try XDocument(string: doc2.string).root.textContent, "\r")
    }

    func testRejectsDTDAndMalformed() {
        XCTAssertThrowsError(try XDocument(string: "<!DOCTYPE x [<!ENTITY e SYSTEM \"file:///etc/passwd\">]><x>&e;</x>")) {
            XCTAssertEqual($0 as? XMLError, .dtdNotAllowed)
        }
        for bad in ["<a>", "<a></b>", "<a b=1/>", "<a>&nope;</a>", "", "text", "<a/><b/>", "<a b=\"1\" b=\"2\"/>", "<a>&</a>"] {
            XCTAssertThrowsError(try XDocument(string: bad), bad)
        }
    }

    func testUTF16Input() throws {
        let s = "<?xml version=\"1.0\" encoding=\"UTF-16\"?><a>Việt</a>"
        let doc = try XDocument(data: s.data(using: .utf16)!)
        XCTAssertEqual(doc.root.textContent, "Việt")
        XCTAssertTrue(doc.string.hasPrefix("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"))
    }

    func testControlCharactersAreDroppedOnWrite() throws {
        let e = XElement(name: "t")
        e.setText("a\u{01}b\u{0B}c")
        XCTAssertEqual(XDocument(root: e, declaration: nil).string, "<t>abc</t>")
    }

    func testSchemaOrderInsertion() throws {
        let doc = try XDocument(string: "<ws><sheetPr/><sheetData/><ext:foo xmlns:ext=\"urn:x\"/><pageMargins/><extLst/></ws>")
        let order = ["sheetPr", "dimension", "sheetData", "mergeCells", "hyperlinks", "pageMargins", "drawing", "extLst"]
        doc.root.insertChild(XElement(name: "mergeCells"), schemaOrder: order)
        doc.root.insertChild(XElement(name: "dimension"), schemaOrder: order)
        doc.root.insertChild(XElement(name: "drawing"), schemaOrder: order)
        XCTAssertEqual(doc.root.elements.map(\.localName), ["sheetPr", "dimension", "sheetData", "foo", "mergeCells", "pageMargins", "drawing", "extLst"])
    }

    func testMutationKeepsParentLinks() throws {
        let doc = try XDocument(string: "<a><b/><c/></a>")
        let b = doc.root.elements[0]
        let c = doc.root.elements[1]
        c.append(b)
        XCTAssertTrue(b.parent === c)
        XCTAssertEqual(doc.string, "<a><c><b/></c></a>")
        let copy = c.deepCopy()
        copy.elements[0].name = "z"
        XCTAssertEqual(b.name, "b")
    }

    /// Lỗi gặp 3 lần trong quá trình làm: phần tử bị tách khỏi cây / bản sao mất ngữ cảnh namespace.
    func testDetachedAndCopiedElementsKeepNamespaceContext() throws {
        let doc = try XDocument(string: #"<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>x</w:t></w:r></w:p></w:body></w:document>"#)
        let p = doc.root.elements[0].elements[0]
        let r = p.elements[0]
        r.removeFromParent()
        XCTAssertTrue(r.is(NS.w, "r"), "tách rời vẫn nhận ra w:r")
        XCTAssertTrue(r.elements[0].is(NS.w, "t"))
        XCTAssertEqual(r.qualifiedName("b", in: NS.w).name, "w:b")
        let copy = p.deepCopy()
        XCTAssertTrue(copy.is(NS.w, "p"))
        XCTAssertFalse(copy.qualifiedName("rPr", in: NS.w).needsDeclaration)
        p.append(r)
        XCTAssertEqual(XDocument(root: doc.root, declaration: nil).string.contains("xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body>"), true)
        XCTAssertEqual(doc.root.descendants(NS.w, "t").count, 1, "gắn lại không sinh khai báo thừa")
        XCTAssertFalse(XDocument(root: doc.root, declaration: nil).string.contains("<w:r xmlns"), "không ghi khai báo phụ khi lưu")
    }
}
