require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dns = require('dns');
const { Broker, Sale } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

dns.setServers([
    "1.1.1.1",
    "8.8.8.8"
]);

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((e) => {
        console.log("DB Connection Error:", e);
    });


// ---------------- Brokers ----------------

app.post('/add', async (req, res) => {
    try {
        const { name, phone, email } = req.body;

        if (!name || !phone || !email) {
            return res.status(400).json({ error: "name, phone and email are all required" });
        }

        const broker = await Broker.create({ name, phone, email });
        res.json({ msg: 'Broker created successfully', broker });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/fetchbroker', async (req, res) => {
    try {
        const brokers = await Broker.find();
        res.json(brokers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/broker/:id', async (req, res) => {
    try {
        const { name, phone, email } = req.body;
        const broker = await Broker.findByIdAndUpdate(
            req.params.id,
            { name, phone, email },
            { new: true, runValidators: true }
        );
        if (!broker) return res.status(404).json({ error: "Broker not found" });
        res.json({ msg: "Broker updated successfully", broker });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/broker/:id', async (req, res) => {
    try {
        const broker = await Broker.findByIdAndDelete(req.params.id);
        if (!broker) return res.status(404).json({ error: "Broker not found" });
        await Sale.deleteMany({ broker: req.params.id }); // keep sales table clean
        res.json({ msg: "Broker and their sales deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ---------------- Sales ----------------

app.post('/sale', async (req, res) => {
    try {
        const { broker, Product_name, Product_quantity, Product_cost_per } = req.body;

        if (!broker) {
            return res.status(400).json({ error: "Broker ID is required!" });
        }
        if (!Product_name) {
            return res.status(400).json({ error: "Product name is required!" });
        }
        if (!Product_quantity || Product_quantity <= 0) {
            return res.status(400).json({ error: "Product quantity must be greater than 0" });
        }
        if (Product_cost_per == null || Product_cost_per < 0) {
            return res.status(400).json({ error: "Product cost per unit cannot be negative" });
        }

        const br = await Broker.findById(broker);
        if (!br) {
            return res.status(404).json({ error: "Broker not found in Database!" });
        }

        const sales_data = await Sale.create({ broker, Product_name, Product_cost_per, Product_quantity });

        res.json({ msg: "Sales record added successfully", data: sales_data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/fetchsales', async (req, res) => {
    try {
        const sales = await Sale.find().sort({ createdAt: -1 }).populate('broker', 'name email phone');
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/sale/:id', async (req, res) => {
    try {
        const sale = await Sale.findByIdAndDelete(req.params.id);
        if (!sale) return res.status(404).json({ error: "Sale not found" });
        res.json({ msg: "Sale deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ---------------- Analytics ----------------

app.get('/decode', async (req, res) => {
    try {
        const saledata = await Sale.find();
        const Brokerdata = await Broker.find();

        let leaderboard = [];

        for (let i = 0; i < Brokerdata.length; i++) {
            let currentbroker = Brokerdata[i];
            let totalsale = 0;
            let totalcost = 0;

            for (let j = 0; j < saledata.length; j++) {
                let currentsale = saledata[j];

                if (currentsale.broker && currentsale.broker.toString() === currentbroker._id.toString()) {
                    totalcost += currentsale.Product_quantity * currentsale.Product_cost_per;
                    totalsale += currentsale.Product_quantity;
                }
            }

            leaderboard.push({
                brokerId: currentbroker._id,
                name: currentbroker.name,
                totalsale: totalsale,
                totalcost: totalcost
            });
        }

        if (leaderboard.length === 0) {
            return res.json({ msg: "No brokers found to evaluate analytics." });
        }

        leaderboard.sort((a, b) => b.totalsale - a.totalsale);

        let topBroker = leaderboard[0];
        let lowestBroker = leaderboard[leaderboard.length - 1];

        res.json({
            topBroker: topBroker,
            lowestBroker: lowestBroker,
            allBrokers: leaderboard
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ---------------- Fallback ----------------

app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
