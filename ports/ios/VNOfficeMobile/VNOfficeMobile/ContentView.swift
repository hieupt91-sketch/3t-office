//
//  ContentView.swift
//  VNOfficeMobile
//
//  Created by Pham Trung Hieu on 24/10/26.
//

import SwiftUI
import UniformTypeIdentifiers
import OOXMLKit

struct ContentView: View {
    @State private var showingImporter = false
    @State private var selectedFile = "Chưa mở tài liệu"
    @State private var status = "Sẵn sàng offline"

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Image(systemName: "doc.richtext")
                    .font(.system(size: 52))
                    .foregroundStyle(.tint)
                Text("VN Office Mobile")
                    .font(.title2.bold())
                Text("OOXMLKit · DOCX · XLSX · PPTX")
                    .foregroundStyle(.secondary)
                Text(status)
                    .font(.callout)
                    .foregroundStyle(.green)
                Button {
                    showingImporter = true
                } label: {
                    Label("Mở tài liệu offline", systemImage: "folder")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                Text(selectedFile)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(24)
            .navigationTitle("Tài liệu")
        }
        .fileImporter(
            isPresented: $showingImporter,
            allowedContentTypes: [.data],
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case .success(let urls):
                guard let url = urls.first else { return }
                let accessed = url.startAccessingSecurityScopedResource()
                defer { if accessed { url.stopAccessingSecurityScopedResource() } }
                do {
                    let bytes = try Data(contentsOf: url).count
                    selectedFile = "Đã mở: \(url.lastPathComponent) (\(bytes) bytes)"
                    status = "Đọc tệp thành công · xử lý trong máy"
                } catch {
                    status = "Không đọc được tệp: \(error.localizedDescription)"
                }
            case .failure(let error):
                status = "Mở tệp thất bại: \(error.localizedDescription)"
            }
        }
    }
}

#Preview {
    ContentView()
}
