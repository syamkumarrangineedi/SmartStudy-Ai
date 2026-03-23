package com.studyassistant.offlineai.controller;

import com.studyassistant.offlineai.service.DocumentService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/document")
@CrossOrigin(origins = "*")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    // Upload PDF or TXT
    @PostMapping("/upload")
    public String uploadFile(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) return "ERROR: No file received.";
        String result = documentService.processFile(file);
        System.out.println("[DocumentController] Upload result: " + result);
        return result;
    }

    // Check what document is currently loaded
    @GetMapping("/status")
    public String getStatus() {
        String name    = documentService.getDocumentName();
        String content = documentService.getDocumentContent();
        if (name == null || name.isBlank()) return "No document loaded";
        int words = content == null ? 0 : content.trim().split("\\s+").length;
        return "Loaded: " + name + " (" + words + " words)";
    }

    // DEBUG: returns first 500 chars of extracted text — use this to verify PDF extraction worked
    @GetMapping("/debug")
    public String debugContent() {
        String content = documentService.getDocumentContent();
        if (content == null || content.isBlank()) return "No document loaded yet.";
        String preview = content.length() > 500 ? content.substring(0, 500) + "..." : content;
        return "=== EXTRACTED TEXT PREVIEW ===\n" + preview;
    }

    // Clear the loaded document
    @DeleteMapping("/clear")
    public String clearDocument() {
        documentService.clearDocument();
        return "Document cleared.";
    }
}