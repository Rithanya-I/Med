import { PDFParse } from 'pdf-parse';

export interface ProcessedDocument {
  name: string;
  fileType: string;
  size: number;
  text: string;
  chunks: string[];
}

export class DocumentProcessor {
  /**
   * Parse an uploaded file from Base64 or string into raw text
   */
  static async extractText(
    filename: string,
    fileType: string,
    contentBase64: string
  ): Promise<string> {
    const buffer = Buffer.from(contentBase64, 'base64');
    const lowerName = filename.toLowerCase();

    // 1. PDF File
    if (fileType.includes('pdf') || lowerName.endsWith('.pdf')) {
      try {
        const parser = new PDFParse({ data: buffer });
        const textResult: any = await parser.getText();
        await parser.destroy();
        if (typeof textResult === 'string' && textResult.trim()) {
          return textResult.trim();
        }
        if (textResult && typeof textResult.text === 'string') {
          return textResult.text.trim();
        }
      } catch (err) {
        console.warn('PDF parsing error, attempting raw text extraction fallback:', err);
        // Fallback: extract ASCII printable strings from PDF buffer
        const rawString = buffer.toString('utf-8');
        const clean = rawString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
        const matches = clean.match(/\(([^()]{3,})\)/g) || [];
        const extracted = matches.map((m) => m.slice(1, -1)).join(' ');
        if (extracted.trim().length > 50) {
          return extracted.trim();
        }
      }
    }

    // 2. Word Document (DOCX)
    if (
      fileType.includes('word') ||
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.doc')
    ) {
      try {
        // DOCX is a zip archive containing word/document.xml
        const rawString = buffer.toString('utf-8');
        // Extract content between <w:t> tags
        const wtMatches = rawString.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
        if (wtMatches && wtMatches.length > 0) {
          return wtMatches
            .map((tag) => tag.replace(/<[^>]+>/g, ''))
            .join(' ')
            .trim();
        }
      } catch (err) {
        console.warn('DOCX XML parsing error:', err);
      }
    }

    // 3. Plain Text, Markdown, CSV, JSON
    const decoded = buffer.toString('utf-8').trim();
    if (decoded.length > 0) {
      // If JSON, pretty format key-value pairs
      if (lowerName.endsWith('.json') || fileType.includes('json')) {
        try {
          const parsed = JSON.parse(decoded);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return decoded;
        }
      }
      return decoded;
    }

    return 'Uploaded document contained no extractable textual content.';
  }

  /**
   * Split text into overlapping chunks
   * chunkSize: ~600 chars
   * chunkOverlap: ~100 chars
   */
  static chunkText(text: string, chunkSize = 650, chunkOverlap = 100): string[] {
    const cleaned = text.replace(/\r\n/g, '\n').replace(/\t/g, ' ').trim();
    if (!cleaned) return [];
    if (cleaned.length <= chunkSize) return [cleaned];

    const chunks: string[] = [];
    const paragraphs = cleaned.split(/\n{2,}/);
    let currentChunk = '';

    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;

      // If single paragraph is longer than chunkSize, split by sentences
      if (trimmedPara.length > chunkSize) {
        const sentences = trimmedPara.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if ((currentChunk + ' ' + sentence).length > chunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            // Keep overlap
            const words = currentChunk.split(/\s+/);
            const overlapWords = words.slice(-Math.floor(chunkOverlap / 6)).join(' ');
            currentChunk = overlapWords + ' ' + sentence;
          } else {
            currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
          }
        }
      } else {
        if ((currentChunk + '\n\n' + trimmedPara).length > chunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          const words = currentChunk.split(/\s+/);
          const overlapWords = words.slice(-Math.floor(chunkOverlap / 6)).join(' ');
          currentChunk = overlapWords + '\n\n' + trimmedPara;
        } else {
          currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedPara}` : trimmedPara;
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter((c) => c.length >= 20);
  }

  /**
   * Process a complete document from upload
   */
  static async process(
    filename: string,
    fileType: string,
    contentBase64: string
  ): Promise<ProcessedDocument> {
    const text = await this.extractText(filename, fileType, contentBase64);
    const chunks = this.chunkText(text);
    const buffer = Buffer.from(contentBase64, 'base64');

    return {
      name: filename,
      fileType,
      size: buffer.length,
      text,
      chunks,
    };
  }
}
