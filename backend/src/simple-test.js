const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

app.post('/create-did', (req, res) => {
  res.json({ message: 'Create DID endpoint works!' });
});

app.listen(5000, () => {
  console.log('Simple test server running on port 5000');
});