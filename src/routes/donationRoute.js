import express from "express";
import Donation from "../models/Donation.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const MTN_ENV = "sandbox"; // Change to production later
const MTN_API_URL = "https://sandbox.momodeveloper.mtn.com/collection/v1_0/bc-authorize";

// Middleware to get OAuth token
async function getMTNToken() {
  const res = await axios.post(
    "https://sandbox.momodeveloper.mtn.com/collection/token/",
    null,
    {
      headers: {
        "Authorization": `Basic ${process.env.MTN_BASIC_AUTH}`,
        "Ocp-Apim-Subscription-Key": process.env.MTN_SUBSCRIPTION_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      params: { grant_type: "client_credentials" },
    }
  );
  return res.data.access_token;
}

// Create donation and request MTN consent
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, amount, paymentMethod } = req.body;

    if (!name || !phone || !amount || !paymentMethod) {
      return res.status(400).json({ message: "All required fields are needed" });
    }

    const donation = new Donation({ name, email, phone, amount, paymentMethod });
    await donation.save();

    if (paymentMethod === "MTN") {
      const token = await getMTNToken();

      const response = await axios.post(
        MTN_API_URL,
        {
          amount: amount.toString(),
          currency: "XAF",
          externalId: donation._id.toString(),
          payer: { partyIdType: "MSISDN", partyId: phone },
          payerMessage: "Donation to Groupe Protestant",
          payeeNote: "Thank you for supporting the church"
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Target-Environment": MTN_ENV,
            "Ocp-Apim-Subscription-Key": process.env.MTN_SUBSCRIPTION_KEY,
            "X-Callback-Url": `${process.env.SERVER_URL}/api/donations/webhook`,
            "Content-Type": "application/json"
          }
        }
      );

      donation.auth_req_id = response.data.auth_req_id;
      await donation.save();
    }

    res.json({ message: "Donation created. Follow your phone to authorize payment.", donation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// MTN Webhook
router.post("/webhook", async (req, res) => {
  try {
    const { referenceId, status, externalId } = req.body;

    const donation = await Donation.findById(externalId);
    if (!donation) return res.status(404).send("Donation not found");

    if (status === "SUCCESSFUL") donation.status = "Completed";
    else donation.status = "Failed";

    donation.transactionId = referenceId;
    await donation.save();

    res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

// Get all donations
router.get("/", async (req, res) => {
  const donations = await Donation.find().sort({ date: -1 });
  res.json(donations);
});

export default router;
