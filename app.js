const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

const fs = require('fs');

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    fs.readFile('resource/index.html', (err, data) => {
        res.writeHead(200, {'Content-Type':'text/html'})
        res.end(data)
    })
});

app.listen(port, () => {
    console.log(`app is Listening at ${port}`);
});