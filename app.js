const express = require('express');
const app = express();
const path = require('path');

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Middleware to serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Define routes for your pages
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/tictactoe', (req, res) => {
    res.render('tictactoe');
});

app.get('/connect4', (req, res) => {
    res.render('connect4');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
