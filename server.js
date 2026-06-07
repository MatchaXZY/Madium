const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
// Use Render's assigned port, or 3000 if testing locally
const port = process.env.PORT || 3000;

// 1. Connect to your Cloud Datastore (S3 or Cloudflare R2)
const s3 = new S3Client({
    region: process.env.AWS_REGION || 'auto', 
    endpoint: process.env.S3_ENDPOINT,        
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
    }
});

// 2. Configure Multer to upload straight to the Cloud
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME,
        key: function (req, file, cb) {
            // Keeps exact original name, adds a timestamp to prevent overwriting
            const exactFileName = Date.now() + '-' + file.originalname;
            cb(null, exactFileName);
        }
    })
});

// 3. Homepage with the upload form
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px;">
            <h2>Cloud-Powered File Sharer</h2>
            <form action="/upload" method="POST" enctype="multipart/form-data" style="margin-bottom: 20px;">
                <input type="file" name="myFile" required style="display: block; margin-bottom: 15px;" />
                <button type="submit" style="padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Upload to Cloud</button>
            </form>
            <p style="color: #28a745; font-size: 0.9em;"><em>Files are now permanently stored in the cloud!</em></p>
        </div>
    `);
});

// 4. Handle Upload & Generate Link
app.post('/upload', upload.single('myFile'), (req, res) => {
    if (!req.file) return res.send('Upload failed.');
    
    // Generate the shareable link using your live Render domain
    const downloadLink = `${req.protocol}://${req.get('host')}/download/${encodeURIComponent(req.file.key)}`;
    
    res.send(`
        <div style="font-family: sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px; text-align: center;">
            <h3 style="color: #28a745;">Upload Successful!</h3>
            <p>Direct download link (Permanent):</p>
            <input type="text" value="${downloadLink}" readonly style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px;" />
            <br>
            <a href="${downloadLink}" style="display: inline-block; margin-top: 10px; text-decoration: none; color: #007bff;">Test Download</a>
            <br><br>
            <a href="/" style="text-decoration: none; color: #666; font-size: 0.9em;">Upload another file</a>
        </div>
    `);
});

// 5. The Instant Download Route
app.get('/download/:fileKey', async (req, res) => {
    try {
        const fileKey = req.params.fileKey;
        
        // Grab the exact file from your cloud bucket
        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileKey
        });
        
        const response = await s3.send(command);

        // Strip the timestamp we added earlier to get the EXACT original filename
        const originalFileName = fileKey.split('-').slice(1).join('-');

        // Force the browser to download it instantly with the correct original file name and extension
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(originalFileName)}`);
        res.setHeader('Content-Type', response.ContentType);

        // Pipe the file data directly to the user's browser
        response.Body.pipe(res);

    } catch (error) {
        console.error(error);
        res.status(404).send('<h2>404</h2><p>File not found in the cloud datastore.</p>');
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
