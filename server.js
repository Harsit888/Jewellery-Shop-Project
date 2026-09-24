require('dotenv').config();
const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const axios = require('axios');

const app = express();

// --- MIDDLEWARE ---
app.use(express.json());
app.use(cors());

// --- RAZORPAY INSTANCE INITIALIZATION ---
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// --- IN-MEMORY CACHE FOR METAL RATES ---
let metalCache = {
  gold24k_10g: null,
  gold22k_10g: null,
  silver_1kg: null,
  lastFetched: 0
};

const FIVE_MINUTES_MS = 5 * 60 * 1000;

// --- HELPER FUNCTION: FETCH OR RETURN CACHED METAL RATES ---
async function getLiveMetalRates() {
  const now = Date.now();

  // Agar 5 minute se kam waqt hua hai, toh Cache se data return karo
  if (metalCache.gold24k_10g && (now - metalCache.lastFetched < FIVE_MINUTES_MS)) {
    return { rates: metalCache, cached: true };
  }

  try {
    // 1. Fetch Gold Rates (INR)
    const goldResponse = await axios.get('https://www.goldapi.io/api/XAU/INR', {
      headers: { 'x-access-token': process.env.GOLD_API_KEY }
    });

    // 2. Fetch Silver Rates (INR)
    const silverResponse = await axios.get('https://www.goldapi.io/api/XAG/INR', {
      headers: { 'x-access-token': process.env.GOLD_API_KEY }
    });

    const pricePerGram24K = goldResponse.data.price_gram_24k;
    const pricePerGram22K = goldResponse.data.price_gram_22k;
    const pricePerGramSilver = silverResponse.data.price_gram_24k;

    // Standard Market Units Calculate karke Cache update karo
    metalCache = {
      gold24k_10g: Math.round(pricePerGram24K * 10),      // 10 Grams 24K Gold
      gold22k_10g: Math.round(pricePerGram22K * 10),      // 10 Grams 22K Gold
      silver_1kg: Math.round(pricePerGramSilver * 1000),  // 1 Kg Silver
      lastFetched: now
    };

    return { rates: metalCache, cached: false };
  } catch (error) {
    console.error("GoldAPI Error:", error.response?.data || error.message);
    
    // API Failure ke waqt Fallback Cache return karo agar available ho
    if (metalCache.gold24k_10g) {
      return { rates: metalCache, cached: true, warning: "Using fallback cache" };
    }
    throw new Error("Unable to fetch metal rates");
  }
}

// --- API ENDPOINT: LIVE METAL RATES ---
app.get('/api/metal-rates', async (req, res) => {
  try {
    const data = await getLiveMetalRates();
    res.json({
      success: true,
      data: data.rates,
      lastUpdated: new Date(data.rates.lastFetched).toLocaleTimeString()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- API ENDPOINT: CREATE RAZORPAY ORDER ---
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid amount" });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert INR to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    console.error("Razorpay Order Creation Failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- SERVER INITIALIZATION ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Luxe Backend Server is running on port ${PORT}`);
});