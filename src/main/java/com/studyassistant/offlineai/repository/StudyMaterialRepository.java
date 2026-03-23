package com.studyassistant.offlineai.repository;

import com.studyassistant.offlineai.model.StudyMaterial;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface StudyMaterialRepository extends MongoRepository<StudyMaterial, String> {

    List<StudyMaterial> findBySubject(String subject);

    List<StudyMaterial> findByTopicContainingIgnoreCase(String topic);
}