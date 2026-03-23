package com.studyassistant.offlineai.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "study_materials")
public class StudyMaterial {

    @Id
    private String id;

    private String subject;
    private String topic;
    private String content;
    private String difficultyLevel; // EASY / MEDIUM / HARD

    // Getters
    public String getId() { return id; }
    public String getSubject() { return subject; }
    public String getTopic() { return topic; }
    public String getContent() { return content; }
    public String getDifficultyLevel() { return difficultyLevel; }
}