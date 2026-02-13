const mammoth = require("mammoth");
const { csvParse } = require('d3-dsv');
const xlsx = require('xlsx');
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { Blob } = require("buffer");

//Buffer contains the uploaed data wich is kept by the multer

const parseFile = async (Filebuffer, mimeType) => {

    try {
        console.log(`[FileParser] Parsing file. Type: ${mimeType}, Buffer Size: ${Filebuffer ? Filebuffer.length : 'null'}`);

        if (!Filebuffer) {
            throw new Error("File buffer is empty or null");
        }

        let ParsedText = ""

        if (mimeType === "application/pdf") {
            try {
                // Convert Buffer to Blob for LangChain Loader
                const blob = new Blob([Filebuffer], { type: 'application/pdf' });
                const loader = new PDFLoader(blob, {
                    splitPages: false, // Return one document for the whole PDF
                });
                const docs = await loader.load();

                // Combine content from all pages (if splitPages was true, docs would be array of pages)
                ParsedText = docs.map(doc => doc.pageContent).join('\n\n');

            } catch (pdfError) {
                console.error("[FileParser] PDF Parse Error details:", pdfError);
                throw pdfError;
            }
        }
        else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const WordData = await mammoth.extractRawText({ buffer: Filebuffer })
            ParsedText = WordData.value
        }
        else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            const workbook = xlsx.read(Filebuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0]; // Read first sheet
            const sheet = workbook.Sheets[sheetName];
            // Convert to CSV string, then we can process it like CSV text
            ParsedText = xlsx.utils.sheet_to_csv(sheet);
        }
        else if (mimeType === 'text/csv' || mimeType === 'application/csv') {
            const csvtext = Filebuffer.toString("utf-8")
            const csvData = csvParse(csvtext)
            ParsedText = csvData.map(row => Object.values(row).join(", ")).join("\n")
        }
        else if (mimeType === "text/plain" || mimeType === 'application/json') {
            ParsedText = Filebuffer.toString("utf-8")
        } else {
            console.warn(`[FileParser] Unsupported MIME type: ${mimeType}`);
            throw new Error("Unsupported file type")
        }

        if (!ParsedText) {
            console.warn("[FileParser] Extracted text is empty.");
        }

        return ParsedText.trim()

    } catch (error) {
        console.error("Error parsing file:", error.message);
        throw new Error("Failed to extract text from file");
    }

}

module.exports = { parseFile }
