// scripts/seedProducts.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');

dotenv.config();
mongoose.connect(process.env.MONGO_URI);

const seedProducts = async () => {
    await Product.deleteMany();

    await Product.insertMany([
        {
            name: 'Apple',
            price: 1.2,
            image: 'https://picsum.photos/200/300',
            description: 'Fresh red apples',
            stock: 50,
            category: 'Fruit',
            brand: 'olper'
        },
        {
            name: 'Milk 1L',
            price: 2.5,
            image: 'https://picsum.photos/200/300',
            description: 'Dairy milk 1 liter pack',
            stock: 30,
            category: 'Dairy',
            brand: 'milk pack'
        },
        {
            name: 'Basmati Rice 5kg',
            price: 12.0,
            image: 'https://picsum.photos/200/300',
            description: 'Premium basmati rice',
            stock: 20,
            category: 'Grains',
            brand: 'Nestle'
        }
    ]);

    console.log('✅ Dummy products seeded');
    process.exit();
};

seedProducts();
