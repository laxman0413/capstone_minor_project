const { createWorker } = require('tesseract.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

class PiiDetector {
  constructor() {
    this.gemini_api_key = process.env.GEMINI_API_KEY;
    this.googleAI = new GoogleGenerativeAI(this.gemini_api_key);
    this.geminiConfig = {
      temperature: 0.9,
      topP: 1,
      topK: 1,
      maxOutputTokens: 4096,
    };
    this.worker = null;
  }

  async initialize() {
    if (!this.worker) {
      this.worker = await createWorker();
    }
  }

  async detectPII(text) {
    try {
      // Get PII from pattern matching
      const patternPII = this.isPotentialPII(text);
      
      // Get PII from Gemini API
      const geminiResults = await this.detectPIIWithGemini(text);
      
      // Combine all results
      return {
        patterns: patternPII || {},
        gemini: geminiResults || []
      };
    } catch (error) {
      console.error('Error in detectPII:', error);
      return { patterns: {}, gemini: [] };
    }
  }

  async detectPIIWithGemini(text) {
    const geminiModel = this.googleAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: "You are a PII detection assistant. Your job is to identify all personally identifiable information in text.",
      ...this.geminiConfig,
    });
     
    try {
      const prompt = `Analyze the following text and identify all instances of Personally Identifiable Information (PII). 

Be particularly careful to detect and categorize PII elements even if they are not explicitly labeled. For example, identify potential Aadhaar numbers, PAN numbers, etc., based on their pattern, even if the text doesn't say "Aadhaar Number:" or "PAN Number:".

The PII elements to detect include: names, addresses, phone numbers, email addresses, national identification numbers (e.g., Social Security Number, Aadhar Number), credit card numbers, bank account details, dates of birth, IP addresses, and any other sensitive data.

Return the detected PII in JSON format with the following fields for each PII item:

* "text": The actual PII text that was detected.

If no PII is found, return an empty JSON array ().

Text: ${text}

Example JSON Output (if PII is found):
[
  {
    "category": "Name",
    "text": "John Doe",
  },
  {
    "category": "Phone Number",
    "text": "+1 555-123-4567",
  },
  {
    "category": "Aadhaar Number", 
    "text": "1234 5678 9012",
  }
]

Example JSON Output (if no PII is found):`;
      
      const result = await geminiModel.generateContent(prompt);
      const response = result.response;
      const responseText = response.text();
      
      console.log("Gemini response:", responseText);
      
      // Try to parse JSON from the response
      try {
        // Extract JSON if it's wrapped in code blocks or other text
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                          responseText.match(/```\n([\s\S]*?)\n```/) ||
                          responseText.match(/\[[\s\S]*\]/);
                          
        const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
        console.log(JSON.parse(jsonStr));
        return JSON.parse(jsonStr);
      } catch (jsonError) {
        console.log("Failed to parse JSON from Gemini response:", jsonError);
        return [{
          type: "gemini_raw_response",
          text: responseText
        }];
      }
    } catch (error) {
      console.log("Gemini API error:", error);
      return [];
    }
  }

  isPotentialPII(text) {
    const patterns = {
      aadhaar: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
      pan: /[A-Z]{5}[0-9]{4}[A-Z]{1}/,
      phone: /(\+91[\s-]?)?[789]\d{9}/,
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
      drivingLicense: /[A-Z]{2}[0-9]{2}[A-Z0-9]{11,13}/,
      passport: /[A-Z][0-9]{7}/,
      creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
      dateOfBirth: /\b(0[1-9]|[12]\d|3[01])[-/](0[1-9]|1[012])[-/]\d{4}\b/,
      pincode: /\b\d{6}\b/,
      bankAccount: /\b\d{9,18}\b/,
      ifsc: /[A-Z]{4}[0-9]{7}/
    };

    const detectedPII = {};
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      if (matches) {
        // Store all matches with their positions
        detectedPII[type] = matches.map(match => ({
          value: match,
          position: text.indexOf(match)
        }));
      }
    }

    return Object.keys(detectedPII).length > 0 ? detectedPII : null;
  }

  async processImage(imagePath) {
    try {
      await this.initialize();

      const { data } = await this.worker.recognize(imagePath);
      const piiLocations = [];

      if (data && data.text) {
        const fullText = data.text;
        console.log("Extracted text from image:", fullText);
        
        // Process the full text to get all PII
        const piiResults = await this.detectPII(fullText);
        console.log("Pii Res",piiResults);
        
        // Process individual words with pattern matching
        if (data.words && Array.isArray(data.words)) {
          for (const word of data.words) {
            if (!word.text) continue;
            const piiTypes = this.isPotentialPII(word.text);

            if (piiTypes) {
              for (const [type, matches] of Object.entries(piiTypes)) {
                for (const match of matches) {
                  piiLocations.push({
                    pattern: type,
                    text: match.value,
                    confidence: word.confidence,
                    location: {
                      Left: word.bbox.x0,
                      Top: word.bbox.y0,
                      Width: Math.abs(word.bbox.x1 - word.bbox.x0),
                      Height: Math.abs(word.bbox.y1 - word.bbox.y0),
                    },
                    source: "pattern"
                  });
                }
              }
            }
          }
        }
        
        // Add Gemini results
        if (piiResults.gemini && Array.isArray(piiResults.gemini)) {
          for (const geminiEntity of piiResults.gemini) {
            console.log("Entity",geminiEntity);
            // Skip if this is just the raw response
            if (geminiEntity.type === "gemini_raw_response") continue;
            
            const entityText = geminiEntity.text;
            if (!entityText) continue;
            
            const startIndex = fullText.indexOf(entityText);
            if (startIndex !== -1) {
              const endIndex = startIndex + entityText.length;
              
              console.log(startIndex,endIndex)
              // Find words that overlap with this entity
              const matchingWords = data.words.filter(word => {
                if (!word.text) return false;
                const wordStartIndex = fullText.indexOf(word.text);
                return wordStartIndex >= startIndex && wordStartIndex < endIndex;
              });
              if (matchingWords.length > 0) {
                const firstWord = matchingWords[0];
                const lastWord = matchingWords[matchingWords.length - 1];
                console.log("first",firstWord.bbox);
                console.log("last",lastWord.bbox);
                piiLocations.push({
                  pattern: geminiEntity.category || geminiEntity.type,
                  text: entityText,
                  confidence: 0.8, // Default confidence for Gemini
                  location: {
                    Left: firstWord.bbox.x0,
                    Top: firstWord.bbox.y0,
                    Width: Math.abs(lastWord.bbox.x1 - firstWord.bbox.x0),
                    Height: Math.max(...matchingWords.map(w => w.bbox.y1)) - firstWord.bbox.y0,
                  },
                  source: "gemini"
                });
              }
            }
          }
        }
      }
      console.log(piiLocations);

      // Remove duplicates by checking for overlapping locations
      return piiLocations;
    } catch (error) {
      console.error('Error in PII detection:', error);
      throw error;
    }
  }
  
  removeDuplicateLocations(locations) {
    const uniqueLocations =[];
    
    for (const location of locations) {
      // Check if this location significantly overlaps with any existing ones
      const isOverlapping = uniqueLocations.some(existing => {
        const existingRect = existing.location;
        const currentRect = location.location;
        
        // Calculate overlap
        const xOverlap = Math.max(0, Math.min(existingRect.left + existingRect.width, 
                                            currentRect.left + currentRect.width) - 
                                Math.max(existingRect.left, currentRect.left));
                                
        const yOverlap = Math.max(0, Math.min(existingRect.top + existingRect.height, 
                                            currentRect.top + currentRect.height) - 
                                Math.max(existingRect.top, currentRect.top));
                                
        const overlapArea = xOverlap * yOverlap;
        const smallerArea = Math.min(existingRect.width * existingRect.height, 
                                    currentRect.width * currentRect.height);
                                    
        // If overlap is more than 50% of the smaller rectangle, consider it a duplicate
        return overlapArea > 0.5 * smallerArea;
      });
      
      if (!isOverlapping) {
        uniqueLocations.push(location);
      }
    }
    
    return uniqueLocations;
  }

  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

module.exports = new PiiDetector();

