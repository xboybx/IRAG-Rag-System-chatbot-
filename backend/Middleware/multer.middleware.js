const multer = require("multer");

/* 
Multer puts it in RAM temporarily so your code can access it.
Your code sends that RAM data to ImageKit.
ImageKit saves it permanently.
 */

/* 
WHY RAM?: Because ImageKit is an external service. Your Node.js server needs to "hold" the file data somewhere for a split second before it can send it to ImageKit.
If we didn't use RAM, we'd have to save it to your computer's hard drive first (slow), read it back (slow), and then delete it (messy).
Using RAM (memoryStorage) is like holding a package in your hands just long enough to hand it to the delivery driver (ImageKit).
Send to ImageKit: Your controller takes that buffer from RAM (req.file.buffer) and sends it to ImageKit.
Clean Up: Once the function finishes, Node.js automatically clears that RAM. */

const storage = multer.memoryStorage();
if (!storage) {
    throw new Error("Multer storage not initialized");
}

//Initialize upload middleware
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 //Limit file size to 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
            'text/csv',
            'application/csv',
            'text/plain',
            'application/json'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only PDF, DOCX, CSV, TXT, and JSON files are allowed."));
        }
    }
})

if (!upload) {
    throw new Error("Multer upload not initialized");
}

module.exports = upload;