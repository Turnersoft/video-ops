import ExpoModulesCore
import Foundation

public class OutdoorIcloudInboxModule: Module {
  private let containerId = "iCloud.com.turnlang.outdoorteleprompter"
  private let inboxFolder = "outdoor-inbox"

  public func definition() -> ModuleDefinition {
    Name("OutdoorIcloudInbox")

    AsyncFunction("isAvailable") { () -> Bool in
      FileManager.default.url(forUbiquityContainerIdentifier: self.containerId) != nil
    }

    AsyncFunction("copyTakeToInbox") { (videoUri: String, jsonBody: String, takeId: String) -> [String: String] in
      guard let container = FileManager.default.url(forUbiquityContainerIdentifier: self.containerId) else {
        throw Exception(
          name: "E_ICLOUD_UNAVAILABLE",
          description: "iCloud container unavailable. Sign in to iCloud and use the Turn Outdoor dev build."
        )
      }

      let docs = container.appendingPathComponent("Documents", isDirectory: true)
      let inbox = docs.appendingPathComponent(self.inboxFolder, isDirectory: true)
      try FileManager.default.createDirectory(at: docs, withIntermediateDirectories: true)
      try FileManager.default.createDirectory(at: inbox, withIntermediateDirectories: true)

      let videoSrc = self.fileURL(from: videoUri)
      let videoDst = inbox.appendingPathComponent("\(takeId).mp4")
      let jsonDst = inbox.appendingPathComponent("\(takeId).json")

      if FileManager.default.fileExists(atPath: videoDst.path) {
        try FileManager.default.removeItem(at: videoDst)
      }
      if FileManager.default.fileExists(atPath: jsonDst.path) {
        try FileManager.default.removeItem(at: jsonDst)
      }

      try FileManager.default.copyItem(at: videoSrc, to: videoDst)
      try jsonBody.write(to: jsonDst, atomically: true, encoding: .utf8)

      return [
        "inboxPath": inbox.path,
        "videoPath": videoDst.path,
        "jsonPath": jsonDst.path,
      ]
    }
  }

  private func fileURL(from uri: String) -> URL {
    if let url = URL(string: uri), url.scheme == "file" {
      return url
    }
    return URL(fileURLWithPath: uri)
  }
}
