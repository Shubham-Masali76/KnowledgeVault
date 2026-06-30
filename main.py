import os
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from PIL import Image
import io
import google.generativeai as genai

# Import our custom AI Engineering scripts
from ingest import process_pdf
from build_vector_db import create_vector_database, add_text_to_db
from query import ask_knowledge_vault

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

app = FastAPI(title="Knowledge Vault API")

# Allow the React Frontend to communicate with this Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuestionRequest(BaseModel):
    question: str

@app.post("/api/ask")
async def ask_question(req: QuestionRequest):
    """Takes a question from React and runs the RAG pipeline."""
    try:
        # For now, we will refactor ask_knowledge_vault to return the string
        # instead of printing it. 
        # (We will update query.py to return the response shortly!)
        answer = ask_knowledge_vault(req.question)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ingest")
async def trigger_ingestion():
    """Triggers the PDF chunking and Vector Database building."""
    try:
        create_vector_database()
        return {"message": "Vector Database successfully built from PDF!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scan-page")
async def scan_physical_page(file: UploadFile = File(...)):
    """Receives a photo, extracts text via Gemini Vision, and adds it to the DB."""
    try:
        # Read the image from the upload
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Send image to Gemini Vision OCR
        model = genai.GenerativeModel("gemini-1.5-flash")
        print("-> Sending image to Gemini Vision...")
        response = model.generate_content([
            "Extract all the educational text, paragraphs, and concepts from this textbook page exactly as written. Do not add any conversational text, just return the raw textbook text.",
            image
        ])
        
        extracted_text = response.text
        if not extracted_text:
             raise Exception("Gemini could not find any text in this image.")
        
        print("-> Extracted text successfully! Appending to Vector DB...")
        # Add to local RAG database
        add_text_to_db(extracted_text)
        
        return {"message": "Physical page successfully digitized and added to your Vault!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
