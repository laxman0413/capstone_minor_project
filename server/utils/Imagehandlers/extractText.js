const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require("dotenv").config();

// OCR.Space API key
const apiKey = process.env.OCR_API_KEY; // Replace with your actual API key

// Function to extract text and PII from image
async function extractTextAndPII(imagePath) {
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(imagePath)); // Add the image file
    form.append('language', 'eng');
    form.append('isOverlayRequired', 'true');
    form.append('FileType', '.Auto');
    form.append('IsCreateSearchablePDF', 'false');
    form.append('isSearchablePdfHideTextLayer', 'true');
    form.append('detectOrientation', 'false');
    form.append('isTable', 'false');
    form.append('scale', 'true');
    form.append('OCREngine', '1');
    form.append('detectCheckbox', 'false');
    form.append('checkboxTemplate', '0');

    // Send the request to OCR.Space API
    const response = await axios.post('https://api8.ocr.space/parse/image', form, {
      headers: {
        ...form.getHeaders(),
        'apikey': apiKey
      }
    });

    const { ParsedResults } = response.data;
    //console.log('OCR API Response:', ParsedResults);

    if (ParsedResults && ParsedResults.length > 0) {
      const text = ParsedResults[0].ParsedText.split('\r\n');
      const ocrData = ParsedResults[0].TextOverlay;

      // Use regex to find potential PII (e.g., email addresses, phone numbers)
      const piiPatterns = [
        { label: 'Aadhaar Number', regex: /\d{4}\s?\d{4}\s?\d{4}/g },
        { label: 'PAN Card Number', regex: /[A-Z]{5}\d{4}[A-Z]{1}/g },
        { label: 'Driving License', regex: /[A-Z]{2}[0-9]{2}[A-Z0-9]{11,13}/g }, // Handles various DL formats
        { label: 'Voter ID Card Number', regex: /[A-Z]{3}\d{7}/g },
        { label: 'Passport Number', regex: /[A-Z]{1}\d{7}/g },
        { label: 'Date of Birth', regex: /\b(0[1-9]|1[0-9]|2[0-9]|3[01])[-/](0[1-9]|1[0-2])[-/]\d{4}\b/g },
        { label: 'Mobile Number', regex: /(\+91)?\s?\d{10}/g }, // Indian mobile number with or without +91
        { label: 'Email Address', regex: /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g },
        { label: 'PIN Code', regex: /\b\d{6}\b/g },
        { label: 'IFSC Code', regex: /[A-Z]{4}\d{7}/g },
        { label: 'Bank Account Number', regex: /\d{9,18}/g }, // Common range for bank account numbers
        // Add other patterns as needed
      ];
      let isPan=false;
      // Extract PII based on the regex patterns
      const piiMap = new Map();
      piiPatterns.forEach(pattern => {
        const matches = ParsedResults[0].ParsedText.match(pattern.regex);
        //console.log('Matches for', pattern.label, ':', matches);
        if (matches) {
          matches.forEach(match => {
            const matchingIndex = ocrData.Lines.findIndex(line => line.LineText.includes(match));
            let matchingLine;
            if (matchingIndex !== -1) {
              matchingLine = ocrData.Lines[matchingIndex];
              ocrData.Lines.splice(matchingIndex, 1);
            }
            //console.log('Matching Line:', matchingLine);
            if (matchingLine) {
              if (pattern.label === 'Aadhaar Number') {
                // Reconstruct the Aadhaar number from words
                
                let reconstructedAadhaar = '';
                let aadhaarWords = [];
                for (const word of matchingLine.Words) {
                  if (/\d{4}/.test(word.WordText)) {
                    reconstructedAadhaar += word.WordText + ' ';
                    aadhaarWords.push(word);
                  }
                }
                
                reconstructedAadhaar = reconstructedAadhaar.trim();
                //console.log('Reconstructed Aadhaar Number:', reconstructedAadhaar);
                if (reconstructedAadhaar === match) {
                  // Now, get the location of the first word and use the total width of the words.
                  if (!piiMap.has(pattern.label)) {
                    piiMap.set(pattern.label, []);
                  }
                  let totalWidth = aadhaarWords.reduce((sum, word) => sum + word.Width, 0);

                  piiMap.get(pattern.label).push({
                    text: match,
                    location: {
                      Left: aadhaarWords[0].Left,
                      Top: aadhaarWords[0].Top,
                      Height: aadhaarWords[0].Height+3,
                      Width: aadhaarWords[2].Left-aadhaarWords[0].Left + aadhaarWords[2].Width+2,
                    },
                  });
                }
              } 
              else if (pattern.label === 'Date of Birth') {
                const isdobMatch = matchingLine.LineText.includes('DOB');
                //console.log(matchingLine.LineText, isdobMatch , 'DOB')
                if(isdobMatch || isPan){
                  const dobMatch = /\b(0[1-9]|1[0-9]|2[0-9]|3[01])[-/](0[1-9]|1[0-2])[-/]\d{4}\b/g.exec(match);
                  const dob = dobMatch[0];
                  const matchingWord = matchingLine.Words.find(word => word.WordText === dob);

                  if (matchingWord) {
                    if (!piiMap.has(pattern.label)) {
                      piiMap.set(pattern.label, []);
                    }
                    piiMap.get(pattern.label).push({
                      text: dob,
                      location: {
                        Left: matchingWord.Left,
                        Top: matchingWord.Top,
                        Height: matchingWord.Height,
                        Width: matchingWord.Width,
                      },
                    });
                  }
                }
              }
              else {
                // For other PII types (e.g., Date of Birth), use exact word matching
                const matchingWord = matchingLine.Words.find(word => word.WordText === match);
                if (pattern.label === 'PAN Card Number'){
                  isPan=true;
                }
                if (matchingWord) {
                  if (!piiMap.has(pattern.label)) {
                    piiMap.set(pattern.label, []);
                  }
                  piiMap.get(pattern.label).push({
                    text: match,
                    location: {
                      Left: matchingWord.Left,
                      Top: matchingWord.Top,
                      Height: matchingWord.Height,
                      Width: matchingWord.Width,
                    },
                  });
                }
              }
            }
          });
        }
      });

      const piiLocations = [];
      piiMap.forEach((locations, label) => {
        locations.forEach(locationData => {
          piiLocations.push({
            pii: label,
            text: locationData.text,
            location: locationData.location
          });
        });
      });

      // Display the piiLocations array
      //console.log('PII Locations:', JSON.stringify(piiLocations, null, 2));
      return piiLocations;
    } else {
      console.log('No text found in the image.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Call the function
module.exports = extractTextAndPII;