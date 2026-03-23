package com.studyassistant.offlineai.repository;

import com.studyassistant.offlineai.model.Student;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface StudentRepository extends MongoRepository<Student, String> {
    Optional<Student> findByName(String name);
    boolean existsByName(String name);
}