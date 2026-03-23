package com.studyassistant.offlineai.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@Service
public class OllamaService {

    private static final String OLLAMA_URL = "http://localhost:11434/api/generate";

    private final DocumentService documentService;

    // sessionKey → list of {role, content} turns
    private final Map<String, List<Map<String,String>>> sessionHistory = new HashMap<>();

    private static final Set<String> DOC_KEYWORDS = new HashSet<>(Arrays.asList(
            "document", "pdf", "file", "uploaded", "summarize", "summary",
            "according to", "from the", "what does it say", "mention", "passage"
    ));
    private static final Set<String> CODE_KEYWORDS = new HashSet<>(Arrays.asList(
            "write", "code", "program", "function", "implement", "algorithm",
            "sort", "search", "linked list", "array", "stack", "queue", "tree",
            "c program", "java", "python", "cpp", "c++", "binary search",
            "bubble sort", "fibonacci", "factorial", "recursion", "print", "loop"
    ));

    public OllamaService(DocumentService documentService) {
        this.documentService = documentService;
    }

    private boolean isCodeQuestion(String q) {
        String lower = q.toLowerCase();
        return CODE_KEYWORDS.stream().anyMatch(lower::contains);
    }
    private boolean isDocQuestion(String q) {
        String lower = q.toLowerCase();
        if (isCodeQuestion(q)) return false;
        return DOC_KEYWORDS.stream().anyMatch(lower::contains);
    }

    public String askAI(String question, String sessionKey) {
        RestTemplate restTemplate = new RestTemplate();

        // Get or create history list for this session
        List<Map<String,String>> history = sessionHistory
                .computeIfAbsent(sessionKey, k -> new ArrayList<>());

        String docContent = documentService.getDocumentContent();
        boolean hasDoc    = docContent != null && !docContent.isBlank();
        boolean useDoc    = hasDoc && isDocQuestion(question);
        boolean useCode   = isCodeQuestion(question);

        // ── Build prompt ──────────────────────────────────────────
        // Strategy: give phi a SYSTEM instruction, then replay the last
        // 3 turns as "User: / Assistant:" pairs (prevents full bleed),
        // then the current question.  Never include previous answers
        // verbatim inside the current question block.

        StringBuilder sb = new StringBuilder();

        if (useCode) {
            sb.append("You are an expert programming tutor.\n");
            sb.append("Rules:\n");
            sb.append("- Write complete, correct, commented code in the language requested.\n");
            sb.append("- Never refuse. You CAN write C, C++, Java, Python, JavaScript.\n");
            sb.append("- Output the code first, then a short explanation.\n\n");
        } else if (useDoc) {
            String snippet = docContent.length() > 2000
                    ? docContent.substring(0, 2000) : docContent;
            sb.append("You are a study assistant. Below is text extracted from the user's document.\n");
            sb.append("Read it and answer the question using ONLY this text.\n");
            sb.append("Do NOT say you cannot access files — the text is right here.\n\n");
            sb.append("=== DOCUMENT ===\n").append(snippet).append("\n=== END ===\n\n");
        } else {
            sb.append("You are a knowledgeable study assistant — like a personal tutor.\n");
            sb.append("Answer the student's question directly and helpfully.\n");
            sb.append("Be clear, accurate, and conversational. Do not be vague.\n\n");
        }

        // Append last 3 turns of history (prevents context bleed while keeping follow-up awareness)
        int start = Math.max(0, history.size() - 3);
        for (int i = start; i < history.size(); i++) {
            Map<String,String> turn = history.get(i);
            sb.append("Student: ").append(turn.get("q")).append("\n");
            // Only include a SHORT summary of previous answer, not full text
            String prevA = turn.get("a");
            if (prevA != null && prevA.length() > 120)
                prevA = prevA.substring(0, 120) + "...";
            sb.append("Tutor: ").append(prevA).append("\n\n");
        }

        sb.append("Student: ").append(question).append("\n");
        sb.append("Tutor:");

        String prompt = sb.toString();

        System.out.println("[Ollama] session=" + sessionKey
                + " mode=" + (useCode ? "CODE" : useDoc ? "DOC" : "GENERAL")
                + " historyTurns=" + history.size()
                + " promptLen=" + prompt.length());

        Map<String, Object> req = new HashMap<>();
        req.put("model", "phi");
        req.put("prompt", prompt);
        req.put("stream", false);
        req.put("options", Map.of(
                "num_predict", useCode ? 600 : 400,
                "temperature", useCode ? 0.2 : 0.5,
                "top_p",       0.9,
                "top_k",       40,
                // Stop tokens prevent phi from answering its own next "Student:" turn
                "stop", new String[]{"Student:", "\nStudent", "Human:", "\nHuman"}
        ));

        try {
            Map<?,?> res = restTemplate.postForObject(OLLAMA_URL, req, Map.class);
            String answer = (res != null && res.containsKey("response"))
                    ? res.get("response").toString().trim()
                    : "Sorry, no response from the model.";

            // Store this turn in history
            Map<String,String> turn = new HashMap<>();
            turn.put("q", question);
            turn.put("a", answer);
            history.add(turn);

            // Keep history to last 10 turns max
            if (history.size() > 10) history.remove(0);

            return answer;

        } catch (Exception e) {
            e.printStackTrace();
            return "Error reaching Ollama: " + e.getMessage();
        }
    }

    public String generateQuiz(String topic) {
        RestTemplate restTemplate = new RestTemplate();
        String prompt =
                "You are a quiz generator. Generate exactly 5 multiple choice questions about: " + topic + "\n\n" +
                        "STRICT RULES:\n" +
                        "1. Output ONLY a JSON array. Nothing else before or after.\n" +
                        "2. No markdown, no backticks, no explanation text.\n" +
                        "3. Start your response with [ and end with ]\n\n" +
                        "FORMAT (follow exactly):\n" +
                        "[{\"question\":\"Q?\",\"options\":[\"A) opt1\",\"B) opt2\",\"C) opt3\",\"D) opt4\"],\"answer\":\"A) opt1\"}]\n\n" +
                        "Generate 5 questions about \"" + topic + "\":";

        Map<String, Object> req = new HashMap<>();
        req.put("model", "phi");
        req.put("prompt", prompt);
        req.put("stream", false);
        req.put("options", Map.of(
                "num_predict", 900,
                "temperature", 0.1,
                "top_p", 0.7,
                "top_k", 20,
                "stop", new String[]{"Note:", "Here are", "I hope"}
        ));

        try {
            Map<?,?> res = restTemplate.postForObject(OLLAMA_URL, req, Map.class);
            return res == null ? "[]" : res.get("response").toString().trim();
        } catch (Exception e) {
            return "[]";
        }
    }

    public void clearSession(String sessionKey) {
        sessionHistory.remove(sessionKey);
    }

    public void clearAllForUser(String studentId) {
        sessionHistory.entrySet().removeIf(e -> e.getKey().startsWith(studentId + ":"));
    }
}