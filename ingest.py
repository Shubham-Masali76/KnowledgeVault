import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

def process_pdf(pdf_path):
    print(f"1. Loading PDF: {pdf_path}...")
    # Step 1: Load the PDF
    # PyPDFLoader extracts all the raw text out of the PDF pages
    loader = PyPDFLoader(pdf_path)
    pages = loader.load()
    print(f"   -> Successfully extracted {len(pages)} pages of text.")

    # Step 2: The "Chunking" Phase
    # Why chunk? We can't feed a 500-page book into an LLM all at once (it crashes or forgets).
    # We split the book into small 1000-character chunks with a 200-character overlap.
    # The overlap ensures that if a sentence gets cut in half, the context isn't lost!
    print("2. Chunking the text...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )
    
    chunks = text_splitter.split_documents(pages)
    print(f"   -> Successfully split the textbook into {len(chunks)} small chunks.")
    return chunks

if __name__ == "__main__":
    # Create a dummy PDF file path just to show how it works
    sample_path = "sample_syllabus.pdf"
    if os.path.exists(sample_path):
        chunks = process_pdf(sample_path)
        print("\nHere is what Chunk #1 looks like:")
        print("---------------------------------")
        print(chunks[0].page_content)
        print("---------------------------------")
    else:
        print(f"Please place a PDF named {sample_path} in this folder to test it!")
