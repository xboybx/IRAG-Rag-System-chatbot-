const ImageKit = require("imagekit");


const ImageKitio = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});


const uploadFile = async (file) => {
    return new Promise((resolve, reject) => {
        ImageKitio.upload({
            file: file.buffer,
            fileName: file.originalname,
            folder: "rag-system"
        }, (error, result) => {
            if (error) {
                reject(error);
            }
            resolve(result);
        })
    })
}


const deleteFile = async (fileId) => {
    return new Promise((resolve, reject) => {
        ImageKitio.deleteFile(fileId, (error, result) => {
            if (error) {
                reject(error);
            }
            resolve(result);
        })
    })
}

module.exports = { uploadFile, deleteFile };