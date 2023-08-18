const fs = require('fs');
const path = require('path');

function encodeFileToBase64(filePath) {
    try {
        const fileBuffer = fs.readFileSync(filePath);
        const base64String = fileBuffer.toString('base64');
        return base64String;
    } catch (error) {
        console.error('Error encoding the file:', error);
        return null;
    }
}

const filePath = process.argv[2];

if (!filePath) {
    console.error('Usage: node encodeDocxToBase64.js <path-to-file.docx>');
    process.exit(1);
}

const fullPath = path.resolve(filePath); // Convert relative path to full path
const result = encodeFileToBase64(fullPath);

if (result) {
    const outputFilename = `${path.basename(filePath)}.base64`;
    const outputPath = path.join(path.dirname(filePath), outputFilename);
    fs.writeFileSync(outputPath, result, 'utf8');
    console.log(`Base64 encoded data saved to ${outputPath}`);
}