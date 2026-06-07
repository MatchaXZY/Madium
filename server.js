const express = require('express');
const multer  = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
// Use Render's assigned port, or 3000 for local testing
const port = process.env.PORT || 3000;

// Set up storage
const upload = multer({ dest: 'uploads/' });

// Create the uploads folder if it doesn't exist when the server boots
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// 1. Homepage with the upload form
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px;">
            <h2>Simple File Sharer</h2>
            <form action="/upload" method="POST" enctype="multipart/form-data" style="margin-bottom: 20px;">
                <input type="file" name="myFile" required style="display: block; margin-bottom: 15px;" />
                <button type="submit" style="padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Upload and Get Link</button>
            </form>
            <p style="color: #666; font-size: 0.9em;"><em>Note: Render uses ephemeral storage. Uploaded files will vanish when the server sleeps or restarts!</em></p>
        </div>
    `);
});

// 2. Handle the upload and generate the link
app.post('/upload', upload.single('myFile'), (req, res) => {
    if (!req.file) return res.send('Upload failed.');
    
    // Dynamically build the URL so it works on localhost AND your live Render domain
    const downloadLink = \`\${req.protocol}://\${req.get('host')}/download/\${req.file.filename}\`;
    
    res.send(`
        <div style="font-family: sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px; text-align: center;">
            <h3 style="color: #28a745;">Upload Successful!</h3>
            <p>Here is your shareable, instant-download link:</p>
            <input type="text" value="\${downloadLink}" readonly style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px;" />
            <br>
            <a href="\${downloadLink}" style="display: inline-block; margin-top: 10px; text-decoration: none; color: #007bff;">Test Download</a>
            <br><br>
            <a href="/" style="text-decoration: none; color: #666; font-size: 0.9em;">Upload another file</a>
        </div>
    `);
});

// 3. The Instant Download Route
app.get('/download/:fileId', (req, res) => {
    const fileId = req.params.fileId;
    const filePath = path.join(__dirname, 'uploads', fileId);

    // Check if file exists on the server
    if (fs.existsSync(filePath)) {
        // Force instant download
        res.download(filePath, 'shared_file_download'); 
    } else {
        res.status(404).send('<h2>404</h2><p>File not found. It may have expired or the server restarted.</p>');
    }
});

app.listen(port, () => {
    console.log(\`Server running on port \${port}\`);
});
