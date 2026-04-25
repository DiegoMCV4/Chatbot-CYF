import argparse

try:
    import fitz # PyMuPDF
except ImportError:
    fitz = None

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

def extract_text_pypdf(pdf_path):
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def extract_text_fitz(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text() + "\n"
    return text

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf_path")
    args = parser.parse_args()
    
    if fitz:
        print("Using PyMuPDF")
        text = extract_text_fitz(args.pdf_path)
    elif PdfReader:
        print("Using pypdf")
        text = extract_text_pypdf(args.pdf_path)
    else:
        print("No pdf library found.")
        exit(1)
        
    with open("pdf_content.txt", "w", encoding="utf-8") as f:
        f.write(text)
    print("Extracted to pdf_content.txt")
