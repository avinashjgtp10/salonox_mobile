const fs = require('fs');
const https = require('https');
const path = require('path');

const url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/120px-Google_%22G%22_logo.svg.png';
const dest = path.join(__dirname, '../assets/images/google-logo.png');

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.5 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

const file = fs.createWriteStream(dest);

https.get(url, options, function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close();
    console.log('Google logo downloaded successfully to ' + dest);
  });
}).on('error', function(err) {
  fs.unlink(dest, () => {});
  console.error('Error downloading google logo: ' + err.message);
});
