package com.studyassistant.offlineai.controller;

import com.studyassistant.offlineai.model.Student;
import com.studyassistant.offlineai.service.Studentservice;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/student")
@CrossOrigin(origins = "*")
public class StudentController {

    private final Studentservice studentService;

    public StudentController(Studentservice studentService) {
        this.studentService = studentService;
    }

    // Health check — test this first: GET http://localhost:8080/api/student/ping
    @GetMapping("/ping")
    public Map<String, Object> ping() {
        Map<String, Object> r = new HashMap<>();
        r.put("status", "StudentController is working");
        r.put("time",   System.currentTimeMillis());
        return r;
    }

    // POST /api/student/register
    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody Map<String, String> body) {
        return studentService.register(
                body.getOrDefault("name", ""),
                body.getOrDefault("password", "")
        );
    }

    // POST /api/student/login
    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        return studentService.login(
                body.getOrDefault("name", ""),
                body.getOrDefault("password", "")
        );
    }

    // GET /api/student/profile/{id}
    @GetMapping("/profile/{id}")
    public Object getProfile(@PathVariable String id) {
        Optional<Student> s = studentService.getProfile(id);
        if (s.isEmpty()) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Student not found");
            return err;
        }
        return s.get();
    }

    // POST /api/student/quiz-result
    @PostMapping("/quiz-result")
    public Map<String, Object> saveResult(@RequestBody Map<String, Object> body) {
        String studentId = String.valueOf(body.getOrDefault("studentId", ""));
        String topic     = String.valueOf(body.getOrDefault("topic", "General"));
        int correct      = Integer.parseInt(String.valueOf(body.getOrDefault("correct", "0")));
        int total        = Integer.parseInt(String.valueOf(body.getOrDefault("total", "1")));
        return studentService.saveQuizResult(studentId, topic, correct, total);
    }
}

