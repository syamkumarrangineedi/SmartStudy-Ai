package com.studyassistant.offlineai.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import java.util.List;

@Service
public class DocumentService {

    private String documentContent = "";

    public String processFile(MultipartFile file) {

        try {

            String text;

            if(file.getOriginalFilename().endsWith(".pdf")){

                PDDocument document = PDDocument.load(file.getInputStream());
                PDFTextStripper stripper = new PDFTextStripper();

                text = stripper.getText(document);

                document.close();

            } else {
                text = new String(file.getBytes());
            }

            documentContent = text;

            return "File uploaded successfully!";

        } catch (Exception e) {
            return "Error reading file";
        }
    }

    public String getDocumentContent() {
        return documentContent;
    }

    public String getDocumentName() {
        return documentContent.isEmpty() ? null : "uploaded_file";
    }

    public List<String> getFileNames() {
        return List.of("uploaded_file"); // placeholder
    }

    public void removeFile(String filename) {
        // placeholder
    }

    public void clearDocument() {
        documentContent = "";
    }
}
