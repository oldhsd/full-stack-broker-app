const mongoose = require('mongoose');

const brokerSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    phone: { type: Number, required: true },   // was "Phone" (capital) — fixed to match req.body's "phone"
    email: { type: String, required: true, trim: true, lowercase: true }
});
const Broker = mongoose.model("Broker", brokerSchema);

const saleSchema = new mongoose.Schema({
    broker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Broker",
        required: true
    },
    Product_name: { type: String, required: true, trim: true },
    Product_quantity: { type: Number, required: true, min: 1 },
    Product_cost_per: { type: Number, required: true, min: 0 }
}, { timestamps: true });
const Sale = mongoose.model("Sale", saleSchema);

module.exports = { Broker, Sale };
