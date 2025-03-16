const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const extractTextAndPII = require('./extractText'); 
const qrHandler = require('./QRdetect/qrHandler'); 
const extractDataPii = require('./extractDataPii');
const adhaarHandler = require('./AdhaarPII/aadharHandler');
const DrivingLicenseHandler = require('./drivingLPII/drivingLicenceHandler.js');
const PANHandler = require('./PanPII/panHandler');
const { createWorker } = require('tesseract.js');
const crypto = require('crypto');


async function extractAndHashAadharNumber(imagePath, piiLoc) {
  
  if (!piiLoc) {
    console.error("pii location not found!");
    return;
  }

  const { Left, Top, Width, Height } = piiLoc.location;

  const worker = await createWorker();

  const { data } = await worker.recognize(imagePath, 'eng');
  const filteredWords = data.words.filter(word => {
    const { x0, y0, x1, y1 } = word.bbox; // Bounding box of detected word
    return (
      x0 >= Left && x1 <= Left + Width && // X-axis within range
      y0 >= Top && y1 <= Top + Height     // Y-axis within range
    );
  });

  // Extract and clean Aadhaar Number text
  console.log("Extracted Aadhaar Number:", filteredWords);
  let piiNumber = filteredWords.map(word => word.text).join('')// Keep only digits

  console.log("Extracted Aadhaar Number:", piiNumber);
  await worker.terminate();

  const piiHash = crypto.createHash('sha256').update(piiNumber).digest('hex');

  console.log("Hashed Aadhaar Number:", piiHash);
  return piiHash;
}


async function maskImagePII(imagePath, maskedUploadDir,documentType) {
    try {
        const worker= await createWorker();
        const {data}=await worker.recognize(imagePath);
        console.log(data.text);
        const startTime=Date.now();
        let metadata,piiLocations,qrLocations;
        if(documentType==='adhaar'){
            [metadata, piiLocations, qrLocations] = await Promise.all([
                sharp(imagePath).metadata(),
                adhaarHandler(imagePath),
                qrHandler(imagePath)
            ]);
        }
        else if(documentType==='driving_license'){
            [metadata, piiLocations] = await Promise.all([
                sharp(imagePath).metadata(),
                DrivingLicenseHandler(imagePath),
            ]);
        }
        else if(documentType==='pan'){
            [metadata, piiLocations, qrLocations] = await Promise.all([
                sharp(imagePath).metadata(),
                PANHandler(imagePath),
                qrHandler(imagePath)
            ]);
        }
        else{
            // Run metadata extraction and PII/QR detection in parallel
            [metadata, piiLocations, qrLocations] = await Promise.all([
                sharp(imagePath).metadata(),
                extractDataPii(imagePath),
                qrHandler(imagePath)
            ]);
        }

        //AaDdharNumber
        //dl_no
        //panCard

        


        // console.log('PII Locations:', piiLocations);
        // console.log('QR Locations:', qrLocations);

        let allSensitiveLocations = [];

        // Combine PII and QR Code locations
        if(!piiLocations && !qrLocations){
            throw new Error('Error in PII or QR Code detection');
        }
        else if(!piiLocations){
             allSensitiveLocations = [...qrLocations];
        }
        else if(!qrLocations){
             allSensitiveLocations = [...piiLocations];
        }
        else{
             allSensitiveLocations = [...piiLocations, ...qrLocations];
        }
        console.log(allSensitiveLocations);

        //process for generating Hashes for the pii data
        //AaDdharNumber
        //dl_no
        //panCard

        if (allSensitiveLocations.length > 0) {

            let piiHash='';
            if(documentType==='adhaar'){
                const piiLoc = allSensitiveLocations.find(loc => loc.pattern === 'AadharNumber');
                piiHash=await extractAndHashAadharNumber(imagePath, piiLoc)
                        
                console.log("Aadhar Hash:",piiHash);
            }
            else if(documentType==='driving_license'){
                const piiLoc = allSensitiveLocations.find(loc => loc.pattern === 'dl_no');
                piiHash=await extractAndHashAadharNumber(imagePath, piiLoc)

                console.log("DL Hash:",piiHash);
            }
            else if(documentType==='pan'){
                const piiLoc = allSensitiveLocations.find(loc => loc.pattern === 'panCard');
                piiHash=await extractAndHashAadharNumber(imagePath, piiLoc)
                console.log("pan Hash:",piiHash);
            }

            try {
                const image = sharp(imagePath);
                
                // Prepare blur masks
                const blurMasks = await Promise.all(allSensitiveLocations.map(async (pii) => {
                    // Extract the specific region from the original image
                    const regionBuffer = await sharp(imagePath)
                        .extract({
                            left: pii.location.Left,
                            top: pii.location.Top,
                            width: pii.location.Width,
                            height: pii.location.Height
                        })
                        .blur(20)  // Apply blur to this specific region
                        .toBuffer();
        
                    return {
                        input: regionBuffer,
                        top: pii.location.Top,
                        left: pii.location.Left,
                        blend: 'over'
                    };
                }));
        
                // Composite the blurred masks onto the original image
                const maskedImage = await image.composite(blurMasks);
        
                // Save masked image
                const maskedFilePath = path.join(maskedUploadDir, `masked_${path.basename(imagePath)}`);
                await maskedImage.toFile(maskedFilePath);
                console.log("adhar hash:",piiHash);
                console.log('file processing time:', Date.now() - startTime);
                
                return {maskedFilePath,piiHash};
            } catch (error) {
                console.error('Error masking image:', error);
                throw error;
            }
        }

        return {imagePath,piiHash}; // Return original path if no masking is needed

    } catch (error) {
        console.error('Error masking image:', error);
        throw error;
    }
}

// maskImagePII("/home/laxman.v/Documents/Document-Management-System/uploads/sample3.jpg","masked_uploads")
module.exports = maskImagePII;



/*
// const sharp = require('sharp');
// const path = require('path');
// const fs = require('fs').promises;
// const extractTextAndPII = require('./extractText'); 
// const qrHandler = require('./qrHandler'); 
// const extractDataPii = require('./extractDataPii');
// const adhaarHandler = require('./aadharHandler');
// const DrivingLicenseHandler = require('./drivingLicenceHandler');
// const PANHandler = require('./panHandler');

// async function maskImagePII(imagePath, maskedUploadDir,documentType) {
//     try {
//         const startTime=Date.now();
//         let metadata,piiLocations,qrLocations;
//         if(documentType==='adhaar'){
//             [metadata, piiLocations, qrLocations] = await Promise.all([
//                 sharp(imagePath).metadata(),
//                 adhaarHandler(imagePath),
//                 qrHandler(imagePath)
//             ]);
//         }
//         else if(documentType==='driving_license'){
//             [metadata, piiLocations] = await Promise.all([
//                 sharp(imagePath).metadata(),
//                 DrivingLicenseHandler(imagePath),
//             ]);
//         }
//         else if(documentType==='pan'){
//             [metadata, piiLocations, qrLocations] = await Promise.all([
//                 sharp(imagePath).metadata(),
//                 PANHandler(imagePath),
//                 qrHandler(imagePath)
//             ]);
//         }
//         else{
//             // Run metadata extraction and PII/QR detection in parallel
//             [metadata, piiLocations, qrLocations] = await Promise.all([
//                 sharp(imagePath).metadata(),
//                 extractDataPii(imagePath),
//                 qrHandler(imagePath)
//             ]);
//         }

//         // console.log('PII Locations:', piiLocations);
//         // console.log('QR Locations:', qrLocations);

//         let allSensitiveLocations = [];

//         // Combine PII and QR Code locations
//         if(!piiLocations && !qrLocations){
//             throw new Error('Error in PII or QR Code detection');
//         }
//         else if(!piiLocations){
//              allSensitiveLocations = [...qrLocations];
//         }
//         else if(!qrLocations){
//              allSensitiveLocations = [...piiLocations];
//         }
//         else{
//              allSensitiveLocations = [...piiLocations, ...qrLocations];
//         }

//         if (allSensitiveLocations.length > 0) {
//             try {
//                 const image = sharp(imagePath);
                
//                 // Prepare blur masks
//                 const blurMasks = await Promise.all(allSensitiveLocations.map(async (pii) => {
//                     // Extract the specific region from the original image
//                     const regionBuffer = await sharp(imagePath)
//                         .extract({
//                             left: pii.location.Left,
//                             top: pii.location.Top,
//                             width: pii.location.Width,
//                             height: pii.location.Height
//                         })
//                         .blur(10)  // Apply blur to this specific region
//                         .toBuffer();
        
//                     return {
//                         input: regionBuffer,
//                         top: pii.location.Top,
//                         left: pii.location.Left,
//                         blend: 'over'
//                     };
//                 }));
        
//                 // Composite the blurred masks onto the original image
//                 const maskedImage = await image.composite(blurMasks);
        
//                 // Save masked image
//                 const maskedFilePath = path.join(maskedUploadDir, `masked_${path.basename(imagePath)}`);
//                 await maskedImage.toFile(maskedFilePath);
                
//                 console.log('file processing time:', Date.now() - startTime);
                
//                 return maskedFilePath;
//             } catch (error) {
//                 console.error('Error masking image:', error);
//                 throw error;
//             }
//         }

//         return imagePath; // Return original path if no masking is needed

//     } catch (error) {
//         console.error('Error masking image:', error);
//         throw error;
//     }
// }

// // maskImagePII("/home/laxman.v/Documents/Document-Management-System/uploads/sample3.jpg","masked_uploads")
// module.exports = maskImagePII;
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const piiDetector = require('./piiDetector');

async function maskImagePII(imagePath, maskedUploadDir, documentType) {
    try {
        const startTime = Date.now();
        
        // Get image metadata and detect PII locations
        const [metadata, piiLocations] = await Promise.all([
            sharp(imagePath).metadata(),
            piiDetector.processImage(imagePath)
        ]);

        if (piiLocations.length > 0) {
            try {
                const image = sharp(imagePath);
                
                // Prepare blur masks for each detected PII
                const blurMasks = await Promise.all(piiLocations.map(async (pii) => {
                    // Extract and blur each PII region
                    const regionBuffer = await sharp(imagePath)
                        .extract({
                            left: Math.max(0, Math.floor(pii.location.Left)),
                            top: Math.max(0, Math.floor(pii.location.Top)),
                            width: Math.min(metadata.width - Math.floor(pii.location.Left), Math.ceil(pii.location.Width)),
                            height: Math.min(metadata.height - Math.floor(pii.location.Top), Math.ceil(pii.location.Height))
                        })
                        .blur(10)
                        .toBuffer();

                    return {
                        input: regionBuffer,
                        top: Math.max(0, Math.floor(pii.location.Top)),
                        left: Math.max(0, Math.floor(pii.location.Left)),
                        blend: 'over'
                    };
                }));

                // Apply all blur masks to the original image
                const maskedImage = await image.composite(blurMasks);

                // Save the masked image
                const maskedFilePath = path.join(maskedUploadDir, `masked_${path.basename(imagePath)}`);
                await maskedImage.toFile(maskedFilePath);

                // Cleanup Tesseract worker
                await piiDetector.cleanup();
                
                console.log('File processing time:', Date.now() - startTime);
                return maskedFilePath;
            } catch (error) {
                console.error('Error masking image:', error);
                throw error;
            }
        }

        // If no PII detected, return original image path
        await piiDetector.cleanup();
        return imagePath;

    } catch (error) {
        console.error('Error in maskImagePII:', error);
        await piiDetector.cleanup();
        throw error;
    }
}

module.exports = maskImagePII;
*/