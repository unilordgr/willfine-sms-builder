// wfocr — tiny OCR helper for Willfine SMS Builder (macOS Vision, fully offline).
// Protocol: one base64-encoded image (PNG/JPEG) per line on stdin;
// one JSON array of recognised text candidates per line on stdout.
import Foundation
import Vision
import CoreGraphics
import ImageIO

func recognise(_ data: Data) -> [String] {
    guard let src = CGImageSourceCreateWithData(data as CFData, nil),
          let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { return [] }
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = false
    req.minimumTextHeight = 0.02
    let handler = VNImageRequestHandler(cgImage: img, options: [:])
    do { try handler.perform([req]) } catch { return [] }
    var out: [String] = []
    for obs in req.results ?? [] {
        for cand in obs.topCandidates(3) { out.append(cand.string) }
    }
    return out
}

setvbuf(stdout, nil, _IOLBF, 0)
while let line = readLine(strippingNewline: true) {
    var result: [String] = []
    if let data = Data(base64Encoded: line) { result = recognise(data) }
    let json = (try? JSONSerialization.data(withJSONObject: result)) ?? Data("[]".utf8)
    FileHandle.standardOutput.write(json)
    FileHandle.standardOutput.write(Data("\n".utf8))
}
