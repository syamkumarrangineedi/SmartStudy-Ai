package com.studyassistant.offlineai.controller;

import com.studyassistant.offlineai.service.OllamaService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins ="*")
public class AiController {

    private final OllamaService ollamaService;

    public AiController(OllamaService ollamaService) {
        this.ollamaService = ollamaService;
    }

    @GetMapping("/tutor")
    public String askTutor(@RequestParam String question) {
        return ollamaService.askAI(question, "anonymous");
    }

    @GetMapping("/quiz")
    public String generateQuiz(@RequestParam String topic) {

        String prompt = """
Generate 5 MCQ quiz questions about """ + topic + """

Return JSON format:

[
{
"question":"",
"options":["A","B","C","D"],
"answer":""
}
]
""";

        return ollamaService.askAI(prompt, "quiz");
    }
    @PostMapping("/tutor")
    public String tutor(
            @RequestParam String question,
            @RequestParam String user
    ){
        return ollamaService.askAI(question, user);
    }
}
