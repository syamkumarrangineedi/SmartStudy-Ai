# SmartStudy-Ai — Backend

Spring Boot backend for the AI Study Assistant.

## Tech Stack
- Java 17 + Spring Boot
- MongoDB (local, port 27017)
- Ollama with phi model (port 11434)
- Apache PDFBox for PDF extraction

## Setup

### 1. Start Ollama
ollama serve
ollama pull phi

### 2. Start MongoDB
mongod

### 3. Run Backend
mvn spring-boot:run

Runs on → http://localhost:8080

## Frontend Repo
https://github.com/syamkumarrangineedi/ai-study-assistant-ui
