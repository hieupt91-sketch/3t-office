import Foundation

/// Namespace OOXML dùng chung. Mỗi namespace gồm URI Transitional và Strict (nếu có).
public enum NS {
    public static let packageRelationships = XMLNamespace("http://schemas.openxmlformats.org/package/2006/relationships", prefix: "")
    public static let contentTypes = XMLNamespace("http://schemas.openxmlformats.org/package/2006/content-types", prefix: "")
    public static let r = XMLNamespace("http://schemas.openxmlformats.org/officeDocument/2006/relationships",
                                       "http://purl.oclc.org/ooxml/officeDocument/relationships", prefix: "r")
    public static let mc = XMLNamespace("http://schemas.openxmlformats.org/markup-compatibility/2006", prefix: "mc")
    public static let a = XMLNamespace("http://schemas.openxmlformats.org/drawingml/2006/main",
                                       "http://purl.oclc.org/ooxml/drawingml/main", prefix: "a")
    public static let pic = XMLNamespace("http://schemas.openxmlformats.org/drawingml/2006/picture",
                                         "http://purl.oclc.org/ooxml/drawingml/picture", prefix: "pic")
    public static let wp = XMLNamespace("http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
                                        "http://purl.oclc.org/ooxml/drawingml/wordprocessingDrawing", prefix: "wp")
    public static let c = XMLNamespace("http://schemas.openxmlformats.org/drawingml/2006/chart",
                                       "http://purl.oclc.org/ooxml/drawingml/chart", prefix: "c")
    public static let s = XMLNamespace("http://schemas.openxmlformats.org/spreadsheetml/2006/main",
                                       "http://purl.oclc.org/ooxml/spreadsheetml/main", prefix: "x")
    public static let w = XMLNamespace("http://schemas.openxmlformats.org/wordprocessingml/2006/main",
                                       "http://purl.oclc.org/ooxml/wordprocessingml/main", prefix: "w")
    public static let p = XMLNamespace("http://schemas.openxmlformats.org/presentationml/2006/main",
                                       "http://purl.oclc.org/ooxml/presentationml/main", prefix: "p")
    public static let p14 = XMLNamespace("http://schemas.microsoft.com/office/powerpoint/2010/main", prefix: "p14")
    public static let x14 = XMLNamespace("http://schemas.microsoft.com/office/spreadsheetml/2009/9/main", prefix: "x14")
    public static let xm = XMLNamespace("http://schemas.microsoft.com/office/excel/2006/main", prefix: "xm")
    public static let cp = XMLNamespace("http://schemas.openxmlformats.org/package/2006/metadata/core-properties", prefix: "cp")
    public static let dc = XMLNamespace("http://purl.org/dc/elements/1.1/", prefix: "dc")
    public static let dcterms = XMLNamespace("http://purl.org/dc/terms/", prefix: "dcterms")
    public static let xsi = XMLNamespace("http://www.w3.org/2001/XMLSchema-instance", prefix: "xsi")
    public static let xml = XMLNamespace("http://www.w3.org/XML/1998/namespace", prefix: "xml")
}

/// Kiểu quan hệ OPC. So khớp chấp nhận cả URI Transitional và Strict.
public struct RelationshipType: Hashable, Sendable {
    public let uris: [String]

    public init(_ uris: String...) { self.uris = uris }

    public var uri: String { uris[0] }

    public func matches(_ type: String) -> Bool { uris.contains(type) }

    private static func office(_ name: String) -> RelationshipType {
        RelationshipType("http://schemas.openxmlformats.org/officeDocument/2006/relationships/\(name)",
                         "http://purl.oclc.org/ooxml/officeDocument/relationships/\(name)")
    }

    public static let officeDocument = office("officeDocument")
    public static let coreProperties = RelationshipType(
        "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
        "http://schemas.openxmlformats.org/officedocument/2006/relationships/metadata/core-properties")
    public static let extendedProperties = office("extended-properties")
    public static let customProperties = office("custom-properties")
    public static let thumbnail = RelationshipType("http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail")
    public static let image = office("image")
    public static let hyperlink = office("hyperlink")
    public static let theme = office("theme")
    public static let styles = office("styles")
    public static let numbering = office("numbering")
    public static let settings = office("settings")
    public static let fontTable = office("fontTable")
    public static let header = office("header")
    public static let footer = office("footer")
    public static let footnotes = office("footnotes")
    public static let endnotes = office("endnotes")
    public static let comments = office("comments")
    public static let chart = office("chart")
    public static let package = office("package")
    public static let oleObject = office("oleObject")
    public static let worksheet = office("worksheet")
    public static let chartsheet = office("chartsheet")
    public static let sharedStrings = office("sharedStrings")
    public static let calcChain = office("calcChain")
    public static let drawing = office("drawing")
    public static let vmlDrawing = office("vmlDrawing")
    public static let table = office("table")
    public static let pivotCacheDefinition = office("pivotCacheDefinition")
    public static let pivotTable = office("pivotTable")
    public static let slide = office("slide")
    public static let slideLayout = office("slideLayout")
    public static let slideMaster = office("slideMaster")
    public static let notesSlide = office("notesSlide")
    public static let notesMaster = office("notesMaster")
    public static let handoutMaster = office("handoutMaster")
    public static let presProps = office("presProps")
    public static let viewProps = office("viewProps")
    public static let tableStyles = office("tableStyles")
    public static let diagramData = office("diagramData")
    public static let diagramLayout = office("diagramLayout")
    public static let diagramQuickStyle = office("diagramQuickStyle")
    public static let diagramColors = office("diagramColors")
    public static let diagramDrawing = RelationshipType("http://schemas.microsoft.com/office/2007/relationships/diagramDrawing")
    public static let commentAuthors = office("commentAuthors")
    public static let modernComment = RelationshipType("http://schemas.microsoft.com/office/2018/10/relationships/comments")
}

public enum ContentType {
    public static let relationships = "application/vnd.openxmlformats-package.relationships+xml"
    public static let xml = "application/xml"
    public static let coreProperties = "application/vnd.openxmlformats-package.core-properties+xml"
    public static let png = "image/png"
    public static let jpeg = "image/jpeg"
    public static let gif = "image/gif"

    // SpreadsheetML
    public static let worksheet = "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"
    public static let sharedStrings = "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"
    public static let spreadsheetStyles = "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"
    // PresentationML
    public static let slide = "application/vnd.openxmlformats-officedocument.presentationml.slide+xml"
    public static let notesSlide = "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"
    public static let notesMaster = "application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml"
    // DrawingML
    public static let chart = "application/vnd.openxmlformats-officedocument.drawingml.chart+xml"

    public static func forImageExtension(_ ext: String) -> String? {
        switch ext.lowercased() {
        case "png": return png
        case "jpg", "jpeg": return jpeg
        case "gif": return gif
        case "bmp": return "image/bmp"
        case "tif", "tiff": return "image/tiff"
        case "emf": return "image/x-emf"
        case "wmf": return "image/x-wmf"
        case "svg": return "image/svg+xml"
        default: return nil
        }
    }
}
