const express = require("express");
const app = express();
const stripe = require("stripe")("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");
const cors = require("cors");
const path = require("path");

app.use(cors());
app.use(express.json());

// ✅ SERVE I FILE STATICI (RISOLVE "CANNOT GET /")
app.use(express.static(path.join(__dirname, "public")));

const PORT = 3000;

// ⚠️ Sostituisci con i tuoi veri price_id Stripe
const prices = {
slow: "price_1T1wK9H9wLsGrx9rY7M2Kvwr",
magnet: "price_1T1wKTH9wLsGrx9rlO1QjalH"
};

// ---------------- CREATE CHECKOUT ----------------
app.post("/create-checkout", async (req, res) => {
const { type } = req.body;

if (!prices[type]) {
return res.status(400).json({ error: "Tipo boost non valido" });
}

try {
const session = await stripe.checkout.sessions.create({
payment_method_types: ["card"],
line_items: [
{
price: prices[type],
quantity: 1,
},
],
mode: "payment",
success_url:
"http://localhost:3000/?session_id={CHECKOUT_SESSION_ID}",
cancel_url: "http://localhost:3000/",
metadata: { type }, // 🔥 IMPORTANTISSIMO
});

res.json({ url: session.url });
} catch (err) {
console.error("Errore creazione checkout:", err);
res.status(500).json({ error: "Errore checkout" });
}
});

// ---------------- VERIFY PAYMENT ----------------
app.post("/verify-payment", async (req, res) => {
const { session_id } = req.body;

try {
const session = await stripe.checkout.sessions.retrieve(session_id);

if (session.payment_status === "paid") {
res.json({
success: true,
type: session.metadata.type, // 🔥 ritorna il tipo boost
});
} else {
res.json({ success: false });
}
} catch (err) {
console.error("Errore verifica pagamento:", err);
res.json({ success: false });
}
});

app.listen(PORT, () => {
console.log(`Server avviato su http://localhost:${PORT}`);
});





