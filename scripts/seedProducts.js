const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');

dotenv.config();
mongoose.connect(process.env.MONGO_URI);

const randomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const seedProducts = async () => {
    await Product.deleteMany();

    const products = [
        {
            name: 'Fresh Apples',
            price: 3.5,
            images: [
                'https://picsum.photos/id/101/300/300',
                'https://picsum.photos/id/102/300/300',
                'https://picsum.photos/id/103/300/300'
            ],
            description: 'Crispy and juicy red apples.',
            category: 'Fruits',
            brand: 'FruitKing',
            isOnSale: true,
            salePrice: 2.8,
            saleDuration: {
                start: randomDate(new Date('2025-01-01'), new Date('2025-01-10')),
                end: randomDate(new Date('2025-01-11'), new Date('2025-01-20'))
            }
        },
        {
            name: 'Whole Wheat Bread',
            price: 1.5,
            images: [
                'https://picsum.photos/id/104/300/300',
                'https://picsum.photos/id/105/300/300',
                'https://picsum.photos/id/106/300/300'
            ],
            description: 'Healthy whole grain bread.',
            category: 'Bakery',
            brand: 'BakeHouse',
            isOnSale: false
        },
        {
            name: 'Organic Eggs (12-pack)',
            price: 4.0,
            images: [
                'https://picsum.photos/id/107/300/300',
                'https://picsum.photos/id/108/300/300',
                'https://picsum.photos/id/109/300/300'
            ],
            description: 'Farm fresh organic eggs.',
            category: 'Dairy',
            brand: 'GreenFarm',
            isOnSale: true,
            salePrice: 3.5,
            saleDuration: {
                start: randomDate(new Date('2025-02-01'), new Date('2025-02-05')),
                end: randomDate(new Date('2025-02-06'), new Date('2025-02-15'))
            }
        },
        {
            name: 'Milk 1L',
            price: 2.0,
            images: [
                'https://picsum.photos/id/110/300/300',
                'https://picsum.photos/id/111/300/300',
                'https://picsum.photos/id/112/300/300'
            ],
            description: 'Dairy fresh 1L milk.',
            category: 'Dairy',
            brand: 'MilkPack',
            isOnSale: false,
            variants: [
                {
                    name: 'Full Cream',
                    price: 2.2,
                    stock: 30,
                    salePrice: 1.9,
                    saleDuration: {
                        start: randomDate(new Date('2025-03-01'), new Date('2025-03-05')),
                        end: randomDate(new Date('2025-03-06'), new Date('2025-03-15'))
                    }
                },
                {
                    name: 'Low Fat',
                    price: 1.9,
                    stock: 20
                }
            ]
        },
        {
            name: 'Basmati Rice 5kg',
            price: 15.0,
            images: [
                'https://picsum.photos/id/113/300/300',
                'https://picsum.photos/id/114/300/300',
                'https://picsum.photos/id/115/300/300'
            ],
            description: 'Aromatic long-grain rice.',
            category: 'Grains',
            brand: 'RiceMaster',
            isOnSale: true,
            salePrice: 12.0,
            saleDuration: {
                start: randomDate(new Date('2025-04-01'), new Date('2025-04-10')),
                end: randomDate(new Date('2025-04-11'), new Date('2025-04-20'))
            }
        },
        {
            name: 'Orange Juice 1L',
            price: 3.0,
            images: [
                'https://picsum.photos/id/116/300/300',
                'https://picsum.photos/id/117/300/300',
                'https://picsum.photos/id/118/300/300'
            ],
            description: '100% pure orange juice.',
            category: 'Beverages',
            brand: 'FreshSip',
            isOnSale: false
        },
        {
            name: 'Chicken Nuggets 500g',
            price: 6.0,
            images: [
                'https://picsum.photos/id/119/300/300',
                'https://picsum.photos/id/120/300/300',
                'https://picsum.photos/id/121/300/300'
            ],
            description: 'Crispy frozen chicken nuggets.',
            category: 'Frozen',
            brand: 'YumFoods',
            isOnSale: true,
            salePrice: 5.0,
            saleDuration: {
                start: randomDate(new Date('2025-05-01'), new Date('2025-05-10')),
                end: randomDate(new Date('2025-05-11'), new Date('2025-05-20'))
            }
        },
        {
            name: 'Toilet Paper (10 Rolls)',
            price: 4.5,
            images: [
                'https://picsum.photos/id/122/300/300',
                'https://picsum.photos/id/123/300/300',
                'https://picsum.photos/id/124/300/300'
            ],
            description: 'Soft and strong toilet paper.',
            category: 'Household',
            brand: 'CleanUp',
            isOnSale: false
        },
        {
            name: 'Shampoo 250ml',
            price: 5.5,
            images: [
                'https://picsum.photos/id/125/300/300',
                'https://picsum.photos/id/126/300/300',
                'https://picsum.photos/id/127/300/300'
            ],
            description: 'For silky smooth hair.',
            category: 'Personal Care',
            brand: 'HairCare',
            isOnSale: false
        },
        {
            name: 'Green Tea (20 Bags)',
            price: 2.5,
            images: [
                'https://picsum.photos/id/128/300/300',
                'https://picsum.photos/id/129/300/300',
                'https://picsum.photos/id/130/300/300'
            ],
            description: 'Healthy and refreshing.',
            category: 'Beverages',
            brand: 'TeaTime',
            isOnSale: true,
            salePrice: 2.0,
            saleDuration: {
                start: randomDate(new Date('2025-06-01'), new Date('2025-06-10')),
                end: randomDate(new Date('2025-06-11'), new Date('2025-06-20'))
            }
        }
    ];

    await Product.insertMany(products);
    console.log('✅ Dummy products seeded');
    process.exit();
};

seedProducts();
