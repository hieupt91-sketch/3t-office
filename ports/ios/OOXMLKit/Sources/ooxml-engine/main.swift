import Foundation
import OOXMLBridge

let bridge = OOXMLBridge()
while let line = readLine() {
    let response = bridge.handle(Data(line.utf8))
    FileHandle.standardOutput.write(response)
    FileHandle.standardOutput.write(Data([0x0A]))
}
