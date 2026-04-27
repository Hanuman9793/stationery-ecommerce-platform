const Subscriber = require("../models/Subscriber");

exports.addSubscriber = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email required" });
        
        let sub = await Subscriber.findOne({ email });
        if (sub) return res.status(400).json({ message: "Already subscribed" });

        sub = new Subscriber({ email });
        await sub.save();
        res.status(201).json({ message: "Subscribed successfully" });
    } catch(err) {
        res.status(500).json({ message: "Server error" });
    }
}

exports.getSubscribers = async (req, res) => {
    try {
        const subs = await Subscriber.find().sort({ subscribedAt: -1 });
        res.json(subs);
    } catch(err) {
        res.status(500).json({ message: "Server error" });
    }
}
