const { faker } = require('@faker-js/faker');
const fs = require('fs');

function getRandomCategories(categories) {
    const numberOfCategories = Math.floor(Math.random() * categories.length/4) + 1; // Random number of categories
    const shuffled = categories.sort(() => 0.5 - Math.random()); // Shuffle categories
    return shuffled.slice(0, numberOfCategories); // Select random categories
}

function generateProducts(numProducts) {
    const categories = [
        'T-shirts', 'Jackets', 'Pants', 'Shoes', 'Hats', 'Accessories', 'Dresses',
        'Sunglasses', 'Watches', 'Belts', 'Socks', 'Underwear', 'Scarves', 'Gloves',
        'Bags', 'Wallets', 'Jewelry', 'Ties', 'Boots', 'Sneakers'
    ];
    const products = [];

    for (let i = 0; i < numProducts; i++) {
        const product = {
            id: i + 1,
            name: faker.commerce.productName(),
            price: parseFloat(faker.commerce.price({min:10, max:2500,dec:2})),
            short_description: faker.commerce.productDescription(),
            long_description: `${faker.commerce.productDescription()}. ${faker.commerce.productDescription()}.`,
            category: getRandomCategories(categories),
            images: [
                faker.image.url({ width: 640, height: 480, category: 'clothes' }),
                faker.image.url({ width: 640, height: 480, category: 'clothes' }),
                faker.image.url({ width: 640, height: 480, category: 'clothes' }),
            ],
        };

        products.push(product);
    }

    return products;
}

const products = generateProducts(5000);

fs.writeFileSync('products.json', JSON.stringify(products, null, 2), 'utf-8');

console.log('Generated 50,000 products and saved to products.json');