import os
from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from groq import Groq

# Load environment variables (to get GROQ_API_KEY)
load_dotenv()

# Global variables for caching
_embeddings = None
_vector_db = None

def get_vector_db():
    """Caches the embedding model and DB connection so it only loads ONCE."""
    global _embeddings, _vector_db
    if _embeddings is None:
        print("-> Loading Embedding Model into RAM (Cold Start)...")
        _embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    if _vector_db is None:
        print("-> Connecting to ChromaDB...")
        _vector_db = Chroma(persist_directory="./chroma_db", embedding_function=_embeddings)
        
    return _vector_db

def ask_knowledge_vault(user_question):
    print(f"\nQuestion: {user_question}")
    print("-" * 50)
    
    # 1. Grab the cached Vector Database (Lightning Fast!)
    vector_db = get_vector_db()
    
    # 2. The Retrieval Phase (The "R" in RAG)
    # We ask ChromaDB to find the 3 textbook chunks that are mathematically most similar to the user's question.
    print("-> Retrieving relevant knowledge from the Vector DB...")
    results = vector_db.similarity_search(user_question, k=3)
    
    # We combine the 3 chunks into a single giant string of context.
    retrieved_context = "\n\n".join([doc.page_content for doc in results])
    
    # 3. The Generation Phase (The "G" in RAG)
    # We secretly inject the retrieved context into a massive prompt behind the scenes.
    # The AI thinks it is a genius, but really it's just reading the text we fed it!
    prompt = f"""
    You are an expert AI studying assistant.
    Answer the user's question using the following context retrieved from their textbook/syllabus.
    
    CRITICAL RULE: Usually, you must rely ONLY on the textbook context. However, if the textbook context contains an obvious printing mistake, spelling error, or objectively false scientific/mathematical information, you MUST politely point out the textbook's mistake to the student and then provide the factually correct answer.
    
    If the context does not contain the answer at all, say "I don't have enough information in the textbook to answer that."
    
    CONTEXT RETRIEVED FROM TEXTBOOK:
    {retrieved_context}
    
    USER QUESTION:
    {user_question}
    """
    
    print("-> Generating answer via Groq LLM...")
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3 # Low temperature so it doesn't hallucinate
    )
    
    answer = response.choices[0].message.content
    print("\n[AI Answer]:")
    print(answer)
    print("=" * 50)
    
    return answer

if __name__ == "__main__":
    # Test the system with a question
    ask_knowledge_vault("What is the main topic of this document?")
