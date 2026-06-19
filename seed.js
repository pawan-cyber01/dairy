import { db } from './firebase-config.js';
import { collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const sampleProducts = [
    {
        id: "prod_1",
        name: "Premium Farm Fresh Paneer",
        description: "Soft, malai-rich paneer made daily from pure cow's milk. High in protein and zero preservatives.",
        images: ["https://images.unsplash.com/photo-1625937286074-9ca519d5d9df?w=800"],
        status: "Available",
        stockQuantity: 50,
        weightOptions: [
            { weight: "250g", price: 120 },
            { weight: "500g", price: 230 },
            { weight: "1kg", price: 450 }
        ],
        nutritionFacts: "Energy: 296 kcal | Protein: 18g | Fat: 22g | Carbs: 3g (per 100g)",
        storageGuide: "Keep refrigerated below 4°C. Consume within 3 days of opening.",
        createdAt: new Date().toISOString()
    },
    {
        id: "prod_2",
        name: "A2 Gir Cow Ghee",
        description: "Pure, golden bilona ghee made from A2 milk of indigenous Gir cows. Rich aroma and granular texture.",
        images: ["https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=800"],
        status: "Available",
        stockQuantity: 25,
        weightOptions: [
            { weight: "500ml", price: 850 },
            { weight: "1L", price: 1600 }
        ],
        nutritionFacts: "Energy: 898 kcal | Fat: 99.8g | Vitamin A: 800mcg (per 100g)",
        storageGuide: "Store in a cool, dry place away from direct sunlight. No refrigeration needed.",
        createdAt: new Date().toISOString()
    },
    {
        id: "prod_3",
        name: "Thick Natural Curd (Dahi)",
        description: "Naturally set, thick and creamy curd containing live probiotic cultures for better gut health.",
        images: ["https://images.unsplash.com/photo-1631301844696-9302c34db034?w=800"],
        status: "Available",
        stockQuantity: 100,
        weightOptions: [
            { weight: "400g", price: 60 },
            { weight: "1kg", price: 140 }
        ],
        nutritionFacts: "Energy: 62 kcal | Protein: 3.2g | Calcium: 120mg (per 100g)",
        storageGuide: "Store continuously at 4°C. Do not freeze.",
        createdAt: new Date().toISOString()
    },
    {
        id: "prod_4",
        name: "Fresh Cow Milk",
        description: "Pasteurized, unhomogenized farm-fresh cow milk delivered within hours of milking.",
        images: ["https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800"],
        status: "Available",
        stockQuantity: 200,
        weightOptions: [
            { weight: "1L", price: 70 }
        ],
        nutritionFacts: "Energy: 65 kcal | Protein: 3.3g | Fat: 3.5g (per 100ml)",
        storageGuide: "Boil before consumption. Keep refrigerated below 4°C.",
        createdAt: new Date().toISOString()
    },
    {
        id: "prod_5",
        name: "White Butter (Safed Makhan)",
        description: "Traditional unsalted white butter churned from fresh cream. Perfect for parathas and cooking.",
        images: ["https://images.unsplash.com/photo-1589149098258-3e9102cd63d3?w=800"],
        status: "Available",
        stockQuantity: 30,
        weightOptions: [
            { weight: "250g", price: 180 },
            { weight: "500g", price: 350 }
        ],
        nutritionFacts: "Energy: 717 kcal | Fat: 81g | Moisture: 16% (per 100g)",
        storageGuide: "Keep refrigerated below 4°C. Consume within 15 days.",
        createdAt: new Date().toISOString()
    }
];

async function seedDatabase() {
    try {
        for (let prod of sampleProducts) {
            await setDoc(doc(db, "products", prod.id), prod);
        }
        document.getElementById('status').innerText = "Successfully added 5 premium products to the database! Redirecting to Home Page...";
        setTimeout(() => {
            window.location.href = "index.html";
        }, 2000);
    } catch (e) {
        console.error("Error seeding DB: ", e);
        document.getElementById('status').innerText = "Error: " + e.message;
        document.getElementById('status').style.color = "red";
    }
}

// Run on load
seedDatabase();
