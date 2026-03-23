package com.studyassistant.offlineai.service;

import com.studyassistant.offlineai.model.Student;
import com.studyassistant.offlineai.repository.StudentRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class Studentservice {

    private final StudentRepository repo;

    public Studentservice(StudentRepository repo) {
        this.repo = repo;
    }

    public Map<String, Object> register(String name, String password) {
        Map<String, Object> result = new HashMap<>();
        try {
            if (name == null || name.isBlank()) {
                result.put("error", "Name is required"); return result;
            }
            if (password == null || password.isBlank()) {
                result.put("error", "Password is required"); return result;
            }
            if (repo.existsByName(name.trim())) {
                result.put("error", "Username already taken"); return result;
            }

            Student s = new Student();
            s.setName(name.trim());
            s.setPassword(password);
            s.setCurrentLevel("BEGINNER");
            s.setTotalScore(0);
            s.setQuizzesTaken(0);

            Student saved = repo.save(s); // use returned object — it has the generated _id

            result.put("success",    true);
            result.put("studentId",  saved.getId()   != null ? saved.getId()   : "");
            result.put("name",       saved.getName() != null ? saved.getName() : name.trim());
            result.put("level",      saved.getCurrentLevel() != null ? saved.getCurrentLevel() : "BEGINNER");
            return result;

        } catch (Exception e) {
            e.printStackTrace();
            result.put("error", "Registration failed: " + e.getMessage());
            return result;
        }
    }

    public Map<String, Object> login(String name, String password) {
        Map<String, Object> result = new HashMap<>();
        try {
            if (name == null || name.isBlank()) {
                result.put("error", "Name is required"); return result;
            }
            Optional<Student> opt = repo.findByName(name.trim());
            if (opt.isEmpty()) {
                result.put("error", "Student not found. Please register first."); return result;
            }
            Student s = opt.get();
            if (!password.equals(s.getPassword())) {
                result.put("error", "Incorrect password"); return result;
            }
            result.put("success",      true);
            result.put("studentId",    s.getId()           != null ? s.getId()           : "");
            result.put("name",         s.getName()         != null ? s.getName()         : "");
            result.put("level",        s.getCurrentLevel() != null ? s.getCurrentLevel() : "BEGINNER");
            result.put("totalScore",   s.getTotalScore());
            result.put("quizzesTaken", s.getQuizzesTaken());
            return result;

        } catch (Exception e) {
            e.printStackTrace();
            result.put("error", "Login failed: " + e.getMessage());
            return result;
        }
    }

    public Optional<Student> getProfile(String studentId) {
        try { return repo.findById(studentId); }
        catch (Exception e) { return Optional.empty(); }
    }

    public Map<String, Object> saveQuizResult(String studentId, String topic, int correct, int total) {
        Map<String, Object> result = new HashMap<>();
        try {
            Optional<Student> opt = repo.findById(studentId);
            if (opt.isEmpty()) { result.put("error", "Student not found"); return result; }

            Student s = opt.get();
            s.recordQuiz(topic, correct, total);
            repo.save(s);

            result.put("success",    true);
            result.put("level",      s.getCurrentLevel());
            result.put("totalScore", s.getTotalScore());
            result.put("weakTopics", s.getWeakTopics());
            return result;

        } catch (Exception e) {
            e.printStackTrace();
            result.put("error", "Could not save result: " + e.getMessage());
            return result;
        }
    }
}