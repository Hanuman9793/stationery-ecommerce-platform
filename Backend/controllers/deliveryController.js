const axios = require("axios");

// Origin point for the shop
const ORIGIN_ADDRESS = "Uruwa Bazar, Gorakhpur, Uttar Pradesh 273407";
const DISTANCE_LIMIT_KM = 8;

exports.checkDeliveryDistance = async (req, res) => {
    try {
        const { address, village } = req.body;

        if (!address) {
            return res.status(400).json({ message: "Address is required" });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        // If no API key, we might be in development or the user hasn't set it up yet.
        // For now, if no key, we'll return a simulated success to allow development to proceed,
        // but normally this would be a hard requirement.
        if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY") {
            console.warn("GOOGLE_MAPS_API_KEY is missing. Using strict simulation mode.");
            
            const lowerAddr = address.toLowerCase();
            const lowerVillage = village ? village.toLowerCase() : "";
            
            // SIMULATION LOGIC:
            // 1. Allow if PIN 273407 is present (Local)
            // 2. Allow if "Uruwa Bazar" or "Adarsh Shop" is mentioned
            // 3. Block if "Lucknow", "Delhi", "Gorakhpur City", or non-local PINs are detected
            const isLocal = lowerAddr.includes("273407") || lowerVillage.includes("uruwa") || lowerAddr.includes("uruwa");
            const isFar = lowerAddr.includes("lucknow") || lowerAddr.includes("delhi") || lowerAddr.includes("city") || (/\d{6}/.test(address) && !address.includes("273407"));

            const allowed = isLocal && !isFar;
            
            return res.json({
                distanceInKm: allowed ? 3.5 : 25.0,
                allowed: allowed,
                limit: DISTANCE_LIMIT_KM,
                simulated: true,
                message: allowed ? "Local address detected (Simulation)" : "Address appears to be outside the 8km delivery zone (Simulation)"
            });
        }

        const destination = village ? `${village}, ${address}` : address;
        
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(ORIGIN_ADDRESS)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;

        const response = await axios.get(url);

        if (response.data.status !== "OK") {
            return res.status(500).json({ message: "Google Maps API Error", details: response.data.error_message });
        }

        const element = response.data.rows[0].elements[0];

        if (element.status !== "OK") {
            return res.status(400).json({ message: "Could not calculate distance to this address. Please enter a valid village or landmark." });
        }

        const distanceInMeters = element.distance.value;
        const distanceInKm = distanceInMeters / 1000;

        const allowed = distanceInKm <= DISTANCE_LIMIT_KM;

        res.json({
            distanceInKm: parseFloat(distanceInKm.toFixed(2)),
            allowed,
            limit: DISTANCE_LIMIT_KM,
            text: element.distance.text
        });

    } catch (error) {
        console.error("Delivery Check Error:", error);
        res.status(500).json({ message: "Server error during delivery validation" });
    }
};
