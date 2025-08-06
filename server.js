const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB error", err));


app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
});
// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/user', require('./routes/user'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/deals', require('./routes/dealRoutes'));

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});
