# KnowledgeVault 🧠

KnowledgeVault is a personalized AI-powered learning assistant built with a FastAPI backend and a React frontend. It allows you to build a local **Retrieval-Augmented Generation (RAG)** pipeline to query your own study materials, PDFs, and even physical textbooks using Google Gemini and ChromaDB.

## Features ✨

*   **PDF Ingestion:** Upload and process PDF documents (like syllabuses or notes) directly into your vector database.
*   **Physical Page Scanning:** Take a photo of a physical textbook page, and the application will extract the educational text using Gemini Vision OCR and add it to your Knowledge Vault.
*   **AI Question Answering:** Ask questions against your ingested documents and receive highly accurate, context-aware answers powered by Gemini and ChromaDB.
*   **FastAPI Backend:** A robust Python backend serving REST APIs for the RAG pipeline.
*   **React + Vite Frontend:** A fast, modern frontend application to interact with your Knowledge Vault.

## Tech Stack 🛠️

*   **Backend:** Python 3.11+, FastAPI, Uvicorn
*   **Frontend:** React, Vite, JavaScript, CSS
*   **AI / LLMs:** Google Generative AI (Gemini), Groq (if configured)
*   **Vector Database:** ChromaDB
*   **Embeddings & Document Processing:** Sentence-Transformers (HuggingFace)

## Setup & Installation 🚀

### 1. Backend Setup (FastAPI)

1. Ensure you have Python 3.11 or higher installed.
2. Clone the repository and navigate to the root directory.
3. Create a `.env` file in the root directory and add your API keys:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   GROQ_API_KEY=your_groq_api_key_here
   ```
4. Install the required Python dependencies (ideally in a virtual environment like `.venv`):
   ```bash
   pip install -r requirements.txt
   # OR if using uv/poetry, install based on pyproject.toml
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload
   ```
   The backend will be available at `http://127.0.0.1:8000`.

### 2. Frontend Setup (React/Vite)

1. Open a new terminal and navigate to the `frontend/` directory.
2. Install the Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the URL provided by Vite (usually `http://localhost:5173`).

## Usage 💡

1. **Ingest Documents:** Run the `/api/ingest` endpoint or use the frontend to process local PDFs into ChromaDB.
2. **Scan Pages:** Upload images to the `/api/scan-page` endpoint to digitize physical textbooks via Gemini Vision.
3. **Ask Questions:** Use the frontend chat interface to ask questions. The backend will retrieve relevant chunks from ChromaDB and generate an answer using the LLM.

## Project Structure 📁

*   `main.py`: The FastAPI application and API routes.
*   `ingest.py`: Logic for reading and chunking PDF documents.
*   `build_vector_db.py`: Logic for storing chunks into ChromaDB.
*   `query.py`: Logic for retrieving context from ChromaDB and querying the LLM.
*   `chroma_db/`: Local directory where the Chroma SQLite database and vector embeddings are stored.
*   `frontend/`: The React application codebase.
