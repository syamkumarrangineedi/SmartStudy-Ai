package com.studyassistant.offlineai.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.*;

@Data
@Document(collection = "students")
public class Student {

    @Id
    private String id;

    private String name;
    private String password;        // simple plain-text password (no auth lib needed)
    private String currentLevel;    // BEGINNER / INTERMEDIATE / ADVANCED
    private int totalScore;         // cumulative score across all quizzes
    private int quizzesTaken;

    // Per-topic stats: { "Python": {attempts:3, correct:12, total:15}, ... }
    private Map<String, TopicStat> topicStats = new HashMap<>();

    // Last 20 quiz results for the activity chart
    private List<QuizResult> recentResults = new ArrayList<>();

    // ── Inner classes (stored as sub-documents in MongoDB) ──

    @Data
    public static class TopicStat {
        private int attempts;   // number of quizzes taken on this topic
        private int correct;    // total correct answers
        private int total;      // total questions answered
        public double percent() {
            return total == 0 ? 0 : Math.round((correct * 100.0 / total) * 10.0) / 10.0;
        }

        // Getters
        public int getAttempts() { return attempts; }
        public void setAttempts(int attempts) { this.attempts = attempts; }
        public int getCorrect() { return correct; }
        public void setCorrect(int correct) { this.correct = correct; }
        public int getTotal() { return total; }
        public void setTotal(int total) { this.total = total; }
    }

    @Data
    public static class QuizResult {
        private String topic;
        private int score;
        private int total;
        private long timestamp;

        // Getters and setters
        public String getTopic() { return topic; }
        public void setTopic(String topic) { this.topic = topic; }
        public int getScore() { return score; }
        public void setScore(int score) { this.score = score; }
        public int getTotal() { return total; }
        public void setTotal(int total) { this.total = total; }
        public long getTimestamp() { return timestamp; }
        public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
    }

    // ── Helper: compute level from totalScore ──
    public String computeLevel() {
        if (totalScore < 50)  return "BEGINNER";
        if (totalScore < 150) return "INTERMEDIATE";
        return "ADVANCED";
    }

    // ── Helper: record a quiz result ──
    public void recordQuiz(String topic, int correct, int total) {
        // Update topic stats
        TopicStat stat = topicStats.getOrDefault(topic, new TopicStat());
        stat.setAttempts(stat.getAttempts() + 1);
        stat.setCorrect(stat.getCorrect() + correct);
        stat.setTotal(stat.getTotal() + total);
        topicStats.put(topic, stat);

        // Update totals
        totalScore += correct;
        quizzesTaken++;
        currentLevel = computeLevel();

        // Add to recent results (keep last 20)
        QuizResult r = new QuizResult();
        r.setTopic(topic);
        r.setScore(correct);
        r.setTotal(total);
        r.setTimestamp(System.currentTimeMillis());
        recentResults.add(r);
        if (recentResults.size() > 20)
            recentResults.remove(0);
    }

    // ── Helper: weakest topics (score < 60%) ──
    public List<String> getWeakTopics() {
        List<String> weak = new ArrayList<>();
        for (Map.Entry<String, TopicStat> e : topicStats.entrySet()) {
            if (e.getValue().percent() < 60) weak.add(e.getKey());
        }
        return weak;
    }

    // Keep backward-compat getters for existing code
    public String getId()   { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public int getTotalScore() { return totalScore; }
    public void setTotalScore(int totalScore) { this.totalScore = totalScore; }
    public int getQuizzesTaken() { return quizzesTaken; }
    public void setQuizzesTaken(int quizzesTaken) { this.quizzesTaken = quizzesTaken; }
    public int getScore() { return totalScore; } // assuming score is totalScore
    public void setScore(int score) { this.totalScore = score; }
    public String getCurrentLevel() { return currentLevel; }
    public void setCurrentLevel(String currentLevel) { this.currentLevel = currentLevel; }
    public List<Integer> getPerformanceHistory() { return List.of(); } // placeholder
    public void setPerformanceHistory(List<Integer> performanceHistory) { }
    public boolean isLoggedIn() { return false; } // placeholder
    public void setLoggedIn(boolean loggedIn) { }
}