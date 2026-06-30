import os
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from ingest import process_pdf

def create_vector_database():
    # 1. Grab the chunked text from our previous script
    sample_path = "sample_syllabus.pdf"
    if not os.path.exists(sample_path):
        print(f"Error: {sample_path} not found.")
        return
        
    print("1. Extracting and Chunking PDF...")
    chunks = process_pdf(sample_path)
    
    # 1. Initialize the embedding model
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    # 2. Create and persist the database
    vector_db = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory="./chroma_db"
    )
    print("-> Vector Database successfully created and saved to disk!")
    return vector_db

def add_text_to_db(raw_text):
    """Chunks raw OCR text and appends it to the database."""
    print("-> Chunking OCR Text...")
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    # We create a fake Document from the text
    chunks = splitter.create_documents([raw_text])
    
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vector_db = Chroma(persist_directory="./chroma_db", embedding_function=embeddings)
    
    print("-> Adding new OCR chunks to Vector Database...")
    vector_db.add_documents(chunks)
    print("-> OCR text successfully appended to Vector Vault!")

if __name__ == "__main__":
    create_vector_database()
