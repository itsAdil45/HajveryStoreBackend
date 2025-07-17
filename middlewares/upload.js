const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        let folder = 'hajverystore_receipts'; // default folder
        if (req.originalUrl.includes('/Create_main')) {
            folder = 'hajverystore_icons';
        }

        return {
            folder,
            allowed_formats: ['jpg', 'jpeg', 'png'],
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
        };
    },
});

const upload = multer({ storage });

module.exports = upload;
