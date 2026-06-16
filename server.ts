/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import QRCode from "qrcode";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Initialize Supabase Server Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://znqluvthvecdegtnozfg.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpucWx1dnRodmVjZGVndG5vemZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODg4ODg4ODgsImV4cCI6MTk4ODg4ODg4OH0.dummy-key";
const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);

// Lazy billing stripe setup
let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is missing");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2025-02-18-pre" as any,
    });
  }
  return stripeClient;
}

function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

// 1. Stripe Raw Webhook Endpoint (MUST be declared before global express.json middleware)
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req: any, res: any) => {
  const sig = req.headers["stripe-signature"];
  let event: any;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (isStripeConfigured() && webhookSecret && sig) {
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`❌ Webhook signature verification failed:`, err.message);
      return res.status(400).send(`Webhook Signature Verification Error: ${err.message}`);
    }
  } else {
    // Simulated/Dev webhook processing
    try {
      event = JSON.parse(req.body.toString());
      console.log(`ℹ️ Simulated stripe webhook received type:`, event.type);
    } catch (err: any) {
      return res.status(400).send(`Invalid webhook request bundle: ${err.message}`);
    }
  }

  // Handle high-value webhook events
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const email = session.customer_email || session.customer_details?.email;
        const customerId = session.customer;
        const purchaseType = session.metadata?.type; // "subscription" or "ticket"

        console.log(`✅ checkout.session.completed handled. user: ${userId}, email: ${email}, type: ${purchaseType}`);

        if (userId) {
          // If a subscription pass is purchased
          if (purchaseType === "subscription") {
            const plan = "gold_premium"; // mapping ticket or checkout tier to subscriptionPlan database state
            
            // Sync to Supabase profile
            const { error: profileErr } = await supabaseServer
              .from("user_profiles")
              .update({ 
                subscriptionPlan: plan, 
                updatedAt: new Date().toISOString() 
              })
              .eq("userId", userId);

            if (profileErr) {
              console.warn("Supabase sub update deferred (using local cache client recovery):", profileErr.message);
            }

            // Sync payment method card info if available
            if (customerId && isStripeConfigured()) {
              try {
                const stripe = getStripe();
                const pms = await stripe.paymentMethods.list({
                  customer: customerId as string,
                  type: "card",
                });
                if (pms.data.length > 0) {
                  const cardPm = pms.data[0];
                  const pmObj = {
                    id: cardPm.id,
                    userId,
                    provider: "stripe",
                    customerId: customerId,
                    paymentMethodId: cardPm.id,
                    cardBrand: cardPm.card?.brand || "Visa",
                    lastFourDigits: cardPm.card?.last4 || "4242",
                    expiryMonth: cardPm.card?.exp_month,
                    expiryYear: cardPm.card?.exp_year,
                    isDefault: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  await supabaseServer.from("user_payment_methods").upsert(pmObj);
                }
              } catch (cardErr: any) {
                console.warn("Card detail list pull failed:", cardErr.message);
              }
            }
          } else if (purchaseType === "ticket") {
            // Register a successful booked ticket
            const { error: ticketErr } = await supabaseServer
              .from("booked_tickets")
              .insert({
                userId,
                movieId: session.metadata?.movieId,
                movieTitle: session.metadata?.movieTitle || "Movie Lounge Ticket",
                time: session.metadata?.time,
                hallName: session.metadata?.hallName || session.metadata?.hall,
                seat: session.metadata?.seat,
                bookedAt: new Date().toISOString(),
                price: parseFloat(session.metadata?.priceValue) || 12.50,
              });
            
            if (ticketErr) console.warn("Supabase ticket update offline check:", ticketErr.message);
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const intent = event.data.object;
        const userId = intent.metadata?.userId;
        const purchaseType = intent.metadata?.type; // "ticket"
        
        console.log(`✅ payment_intent.succeeded handled. user: ${userId}, type: ${purchaseType}`);

        if (userId && purchaseType === "ticket") {
          // Register successful booked ticket
          const { error: ticketErr } = await supabaseServer
            .from("booked_tickets")
            .insert({
              userId,
              movieId: intent.metadata?.movieId,
              movieTitle: intent.metadata?.movieTitle || "Movie Lounge Ticket",
              time: intent.metadata?.time,
              hallName: intent.metadata?.hallName || intent.metadata?.hall,
              seat: intent.metadata?.seat,
              bookedAt: new Date().toISOString(),
              price: parseFloat(intent.metadata?.priceValue) || 12.50,
            });
            
          if (ticketErr) console.warn("Supabase ticket update failed:", ticketErr.message);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = sub.customer;
        // In customer.subscription.updated, find user profile by customerId
        const { data: profiles } = await supabaseServer
          .from("user_payment_methods")
          .select("userId")
          .eq("customerId", customerId)
          .limit(1);

        if (profiles && profiles.length > 0) {
          const userId = profiles[0].userId;
          const status = sub.status;
          const plan = (status === "active" || status === "trialing") ? "gold_premium" : "spectator";
          
          await supabaseServer
            .from("user_profiles")
            .update({ subscriptionPlan: plan, updatedAt: new Date().toISOString() })
            .eq("userId", userId);

          console.log(`🔄 customer.subscription.updated subscription status for ${userId} set to ${plan} (${status})`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = sub.customer;
        
        const { data: pData } = await supabaseServer
          .from("user_payment_methods")
          .select("userId")
          .eq("customerId", customerId)
          .limit(1);

        if (pData && pData.length > 0) {
          const userId = pData[0].userId;
          await supabaseServer
            .from("user_profiles")
            .update({ subscriptionPlan: "spectator", updatedAt: new Date().toISOString() })
            .eq("userId", userId);

          console.log(`❌ customer.subscription.deleted plan set to spectator for ${userId}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.warn(`💳 Invoice payment failed: sub ${invoice.subscription}, amount: ${invoice.amount_due}`);
        break;
      }
    }
  } catch (err: any) {
    console.error(`💥 Error dispatching Stripe webhook action:`, err.message);
  }

  res.json({ received: true });
});

// Configure JSON standard body-parser for non-webhook standard POST/GET transactions
app.use(express.json());

// 2. Stripe Config Endpoint
app.get("/api/stripe/config", (req, res) => {
  res.json({
    publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder_for_rowone_cinema",
    isConfigured: isStripeConfigured()
  });
});

// 2a. Fetch Real-time Stripe Prices API
app.get("/api/stripe/prices", async (req: any, res: any) => {
  const defaultPrices = [
    {
      id: "price_1Tibrl4cPcPYOVNbzktH30UU",
      name: "ROWONE Pass",
      price: "$14.99",
      rawAmount: 14.99,
      period: "month",
      description: "Unlocks the entire theater with ultimate executive privileges.",
      features: [
        "Unlimited access to all catalogue films",
        "Discounted new releases ($4.99 tickets)",
        "Early access to limited studio premieres",
        "Gold VIP 'PASS' profile badge",
        "Priority high-fidelity audio streams",
        "Unlimited synchronous group watch parties"
      ],
      type: "subscription",
      highlighted: true
    },
    {
      id: "price_ticket_standard",
      name: "Standard Movie Ticket",
      price: "$12.50",
      rawAmount: 12.50,
      period: "one-time",
      description: "The classic social movie watching ticket for any standard screening.",
      features: [
        "Plush standard cinema seat hold",
        "High-fidelity stereo audio stream",
        "Live text & social chat room access with friends"
      ],
      type: "one-time",
      highlighted: false
    },
    {
      id: "price_ticket_premium",
      name: "Premium VIP Ticket",
      price: "$18.50",
      rawAmount: 18.50,
      period: "one-time",
      description: "Ultimate immersive cinema screening with deluxe custom features.",
      features: [
        "Ultra-plush luxury motor recliner seat selection",
        "Golden-ear VIP certified multi-channel spatial audio",
        "Complimentary gourmet cinema snack and beverage box",
        "Exclusive behind-the-scenes companion panel access"
      ],
      type: "one-time",
      highlighted: false
    }
  ];

  if (!isStripeConfigured()) {
    return res.json({ prices: defaultPrices, simulated: true });
  }

  try {
    const stripe = getStripe();
    const stripePrices = await stripe.prices.list({
      active: true,
      expand: ["data.product"],
      limit: 20
    });

    if (!stripePrices || stripePrices.data.length === 0) {
      return res.json({ prices: defaultPrices, simulated: true });
    }

    // Map retrieved prices to our unified display schema
    const prices = stripePrices.data.map((p) => {
      const prod = p.product as any;
      const name = prod?.name || "Cinema Ticket";
      const desc = prod?.description || "Admission pass powered by Stripe.";
      const type = p.type === "recurring" ? "subscription" : "one-time";
      const amount = p.unit_amount ? p.unit_amount / 100 : 12.50;
      const isSub = type === "subscription";

      // Dynamically attach features based on name / defaults
      let features = prod?.marketing_features?.map((f: any) => f.name) || [];
      if (features.length === 0) {
        if (isSub) {
          features = [
            "Unlimited access to all catalogue films",
            "Discounted new releases ($4.99 tickets)",
            "Early access to limited studio premieres",
            "Gold VIP 'PASS' profile badge"
          ];
        } else {
          features = [
            "Admission for specified movie screening",
            "Premium audio stream options",
            "Interactive chat room with fellow viewers"
          ];
        }
      }

      return {
        id: p.id,
        name,
        price: `$${amount.toFixed(2)}`,
        rawAmount: amount,
        period: isSub ? (p.recurring?.interval || "month") : "one-time",
        description: desc,
        features,
        type,
        highlighted: isSub || name.toLowerCase().includes("pass")
      };
    });

    // Ensure we keep them sorted such that sub/passes or higher tier items appear in structure
    prices.sort((a, b) => (b.highlighted ? 1 : 0) - (a.highlighted ? 1 : 0));

    res.json({ prices, simulated: false });
  } catch (err: any) {
    console.error("⚠️ Error fetching real Stripe prices:", err.message);
    res.json({ prices: defaultPrices, simulated: true, error: err.message });
  }
});

// 3. Create Checkout Session for subscriptions and individual ticket selections
app.post("/api/stripe/create-checkout-session", async (req: any, res: any) => {
  const { userId, email, type, priceValue, priceId, movieTitle, movieId, time, hall, seat } = req.body;

  if (!userId || !email) {
    return res.status(400).json({ error: "Missing required core properties: userId and email" });
  }

  const successUrl = `${req.headers.origin || "http://localhost:3000"}/${type === "subscription" ? "settings/billing" : type === "studio" ? "settings" : "history"}?stripe_success=true&type=${type}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${req.headers.origin || "http://localhost:3000"}/`;

  // If no Stripe Secret Key configured, return a custom simulated success redirect route instantly
  if (!isStripeConfigured()) {
    console.log(`⚠️ Stripe is not fully configured on server. Simulating Checkout session redirection URL.`);
    const mockSessionId = `mock_sess_${Math.random().toString(36).substring(2, 11)}`;
    const mockSuccessUrl = successUrl
      .replace("{CHECKOUT_SESSION_ID}", mockSessionId)
      + `&simulated=true`
      + `&userId=${encodeURIComponent(userId)}`
      + `&email=${encodeURIComponent(email)}`
      + `&priceValue=${priceValue || (type === "studio" ? "49.99" : "14.99")}`
      + `&priceId=${priceId || ""}`
      + `&movieTitle=${encodeURIComponent(movieTitle || "")}`
      + `&movieId=${encodeURIComponent(movieId || "")}`
      + `&time=${encodeURIComponent(time || "")}`
      + `&hall=${encodeURIComponent(hall || "")}`
      + `&seat=${encodeURIComponent(seat || "")}`;

    return res.json({ 
      url: mockSuccessUrl, 
      simulated: true,
      sessionId: mockSessionId
    });
  }

  try {
    const stripe = getStripe();

    // 1. Search or create customer on Stripe
    let customerId: string | undefined;
    const { data: savedPM } = await supabaseServer
      .from("user_payment_methods")
      .select("customerId")
      .eq("userId", userId)
      .limit(1);

    if (savedPM && savedPM.length > 0 && savedPM[0].customerId) {
      customerId = savedPM[0].customerId;
    } else {
      // Find or create customer by email
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email,
          metadata: { userId },
          name: email.split("@")[0]
        });
        customerId = customer.id;
      }
    }

    let sessionParams: Stripe.Checkout.SessionCreateParams;

    if (type === "subscription") {
      // Monthly Pass subscription setup
      const activePriceId = priceId || "price_1Tibrl4cPcPYOVNbzktH30UU";
      
      sessionParams = {
        payment_method_types: ["card", "link"],
        mode: "subscription",
        customer: customerId,
        line_items: [
          {
            price: activePriceId,
            quantity: 1,
          },
        ],
        metadata: {
          userId,
          type: "subscription",
          priceId: activePriceId
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      };
    } else if (type === "studio") {
      // One-time premium studio registration payment
      sessionParams = {
        payment_method_types: ["card", "link"],
        mode: "payment",
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "ROWONE Studio Distributor License",
                description: "One-time registration license fees for DRC DRM broadcasting rights & customized grand theater lounges."
              },
              unit_amount: 4999,
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId,
          type: "studio",
          priceValue: "49.99"
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      };
    } else {
      // One-time premium cinematics ticket receipt
      sessionParams = {
        payment_method_types: ["card", "link"],
        mode: "payment",
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: movieTitle || "ROWONE Cinema Ticket",
                description: `Watch Show: ${time || "Lounge Schedule"} | Seat: ${seat || "Hall Center"}`
              },
              unit_amount: Math.round((parseFloat(priceValue) || 12.50) * 100),
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId,
          type: "ticket",
          priceValue: String(priceValue || 12.50),
          movieId: movieId || "",
          movieTitle: movieTitle || "",
          time: time || "",
          hallName: hall || "",
          seat: seat || ""
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.json({ url: session.url, sessionId: session.id, simulated: false });

  } catch (err: any) {
    console.error(`💥 Create checkout session failed:`, err.message);
    res.status(500).json({ error: `Failed to open secure payment gateway: ${err.message}` });
  }
});

// 4. Verification Endpoint when redirected back to application with checkout parameter
app.get("/api/stripe/verify-session", async (req: any, res: any) => {
  const { session_id, simulated, userId, email, type } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: "Missing session_id identifier" });
  }

  // 1. If simulated checkout session
  if (simulated === "true" || !isStripeConfigured()) {
    console.log(`ℹ️ Verifying simulated session returning local update metrics for user ${userId}`);
    
    // Simulate updating Supabase profile
    if (userId) {
      if (type === "subscription") {
        await supabaseServer
          .from("user_profiles")
          .update({ subscriptionPlan: "gold_premium", updatedAt: new Date().toISOString() })
          .eq("userId", userId);
      } else if (type === "studio") {
        try {
          await supabaseServer
            .from("profiles")
            .update({ account_type: "studio" })
            .eq("id", userId);
        } catch (errProfile) {
          console.warn("Failed updating simulated profiles:", errProfile);
        }

        try {
          await supabaseServer
            .from("user_profiles")
            .update({ accountType: "studio", updatedAt: new Date().toISOString() })
            .eq("userId", userId);
        } catch (errUserProfiles) {
          console.warn("Failed updating simulated user_profiles:", errUserProfiles);
        }

        // Update studio verified status
        await supabaseServer
          .from("studios")
          .update({ is_verified: true })
          .eq("owner_user_id", userId);

        // Insert into studio_payments
        const refCode = 'PM_REG_' + Math.floor(Math.random() * 9000000 + 1000000);
        await supabaseServer.from('studio_payments').insert({
          studio_id: userId,
          amount: 49.99,
          status: 'success',
          payment_reference: refCode
        });

        // Trigger rpc activate_studio
        try {
          await supabaseServer.rpc('activate_studio', {
            studio_id: userId,
            payment_reference: refCode
          });
        } catch (rpcErr) {
          console.warn('RPC activate_studio failed or ignored:', rpcErr);
        }
      } else if (type === "ticket") {
        const mockTicket = {
          userId,
          movieId: req.query.movieId || "m1",
          movieTitle: req.query.movieTitle || "Communal Feature",
          time: req.query.time || "19:00",
          hallName: req.query.hall || "Premium Hall 1",
          seat: req.query.seat || "C6",
          bookedAt: new Date().toISOString(),
          price: parseFloat(req.query.priceValue) || 12.50
        };
        await supabaseServer.from("booked_tickets").insert(mockTicket);
      }
    }

    return res.json({
      success: true,
      simulated: true,
      userId,
      type,
      customerId: "cus_simulated_stripe_4242",
      activePlan: type === "subscription" ? "gold_premium" : undefined
    });
  }

  // 2. Real Stripe session verification
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const activeUserId = session.metadata?.userId || userId;
    const purchaseType = session.metadata?.type || type;
    const customerId = session.customer;

    if (session.payment_status === "paid") {
      if (activeUserId) {
        if (purchaseType === "subscription") {
          // Update profile Plan status
          await supabaseServer
            .from("user_profiles")
            .update({ subscriptionPlan: "gold_premium", updatedAt: new Date().toISOString() })
            .eq("userId", activeUserId);

          // Retrieve and save the payment card info for future Checkout 1-click simulations
          try {
            const pms = await stripe.paymentMethods.list({
              customer: customerId as string,
              type: "card",
            });
            if (pms.data.length > 0) {
              const card = pms.data[0];
              const userPm = {
                id: card.id,
                userId: activeUserId,
                provider: "stripe",
                customerId: customerId,
                paymentMethodId: card.id,
                cardBrand: card.card?.brand || "Visa",
                lastFourDigits: card.card?.last4 || "4242",
                expiryMonth: card.card?.exp_month,
                expiryYear: card.card?.exp_year,
                isDefault: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              await supabaseServer.from("user_payment_methods").upsert(userPm);
            }
          } catch (pmErr) {
            console.warn("Failed retrieving card method during verification session pass hook", pmErr);
          }
        } else if (purchaseType === "studio") {
          try {
            await supabaseServer
              .from("profiles")
              .update({ account_type: "studio" })
              .eq("id", activeUserId);
          } catch (errProfile) {
            console.warn("Failed updating profiles under web checkout:", errProfile);
          }

          try {
            await supabaseServer
              .from("user_profiles")
              .update({ accountType: "studio", updatedAt: new Date().toISOString() })
              .eq("userId", activeUserId);
          } catch (errUserProfiles) {
            console.warn("Failed updating user_profiles under web checkout:", errUserProfiles);
          }

          // Update studio verified status
          await supabaseServer
            .from("studios")
            .update({ is_verified: true })
            .eq("owner_user_id", activeUserId);

          // Insert into studio_payments
          await supabaseServer.from("studio_payments").insert({
            studio_id: activeUserId,
            amount: 49.99,
            status: "success",
            payment_reference: session_id || session.id
          });

          // Trigger rpc activate_studio
          try {
            await supabaseServer.rpc("activate_studio", {
              studio_id: activeUserId,
              payment_reference: session_id || session.id
            });
          } catch (rpcErr) {
            console.warn("RPC activate_studio failed or ignored under web checkout:", rpcErr);
          }
        } else if (purchaseType === "ticket") {
          // One-time movie purchase
          const ticketObj = {
            userId: activeUserId,
            movieId: session.metadata?.movieId,
            movieTitle: session.metadata?.movieTitle || "Sync Movie Ticket",
            time: session.metadata?.time,
            hallName: session.metadata?.hallName,
            seat: session.metadata?.seat,
            bookedAt: new Date().toISOString(),
            price: parseFloat(session.metadata?.priceValue || "12.50")
          };
          await supabaseServer.from("booked_tickets").insert(ticketObj);
        }
      }

      return res.json({
        success: true,
        simulated: false,
        paymentStatus: session.payment_status,
        userId: activeUserId,
        type: purchaseType,
        customerId
      });
    }

    return res.json({
      success: false,
      paymentStatus: session.payment_status,
      message: "The checkout session remains pending or incomplete."
    });

  } catch (err: any) {
    console.error(`💥 Session verification failure:`, err.message);
    res.status(500).json({ error: `Verification process disrupted: ${err.message}` });
  }
});

// 5. Get customer saved cards directly from Stripe's API
app.get("/api/stripe/payment-methods", async (req: any, res: any) => {
  const { customerId } = req.query;

  if (!customerId) {
    return res.status(400).json({ error: "Missing customerId specification" });
  }

  if (!isStripeConfigured()) {
    return res.json({ methods: [], simulated: true });
  }

  try {
    const stripe = getStripe();
    const pms = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card"
    });

    const parsed = pms.data.map(item => ({
      id: item.id,
      brand: item.card?.brand || "Card",
      last4: item.card?.last4,
      expMonth: item.card?.exp_month,
      expYear: item.card?.exp_year
    }));

    res.json({ methods: parsed, simulated: false });
  } catch (err: any) {
    console.warn(`Could not retrieve customer payment parameters: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// 6. Create Stripe Customer Portal Session for subscription & billing management
app.post("/api/stripe/create-portal-session", async (req: any, res: any) => {
  const { customerId, userId, email } = req.body;
  const returnUrl = `${req.headers.origin || "http://localhost:3000"}/settings`;

  if (!isStripeConfigured()) {
    console.log(`⚠️ Stripe is not fully configured. Creating a simulated customer portal navigation link.`);
    return res.json({
      url: `${returnUrl}?simulated_portal=true&userId=${encodeURIComponent(userId || "")}`,
      simulated: true
    });
  }

  try {
    const stripe = getStripe();
    let targetCustomerId = customerId;

    // A. Attempt database lookup if customerId not directly provided
    if (!targetCustomerId && userId) {
      const { data: savedPM } = await supabaseServer
        .from("user_payment_methods")
        .select("customerId")
        .eq("userId", userId)
        .limit(1);

      if (savedPM && savedPM.length > 0 && savedPM[0].customerId) {
        targetCustomerId = savedPM[0].customerId;
      }
    }

    // B. Attempt Stripe Customer API lookup if still unresolved
    if (!targetCustomerId && email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        targetCustomerId = customers.data[0].id;
      }
    }

    // C. Validation Check
    if (!targetCustomerId) {
      return res.status(404).json({
        error: "Stripe Customer profile unrecognized. Please activate a plan first to register your billing profile."
      });
    }

    // D. Generate secure Billing Portal session link
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: targetCustomerId,
      return_url: returnUrl,
    });

    console.log(`🎟️ Secure billing portal URL generated for customer ${targetCustomerId}`);
    return res.json({ url: portalSession.url, simulated: false });

  } catch (err: any) {
    console.error(`💥 Failed to configure billing portal session:`, err.message);
    res.status(500).json({ error: `Could not access billing portal: ${err.message}` });
  }
});

// 7. Create Stripe Payment Intent for custom Express Checkout or Elements button
app.post("/api/stripe/create-payment-intent", async (req: any, res: any) => {
  const { userId, email, amount, movieTitle, movieId, time, hall, seat } = req.body;

  if (!amount) {
    return res.status(400).json({ error: "Amount value is required for Payment Intent initialization." });
  }

  const cents = Math.round(parseFloat(amount) * 100);

  if (!isStripeConfigured()) {
    console.log(`⚠️ Stripe key unconfigured. Returning mock Client Secret for Elements container.`);
    return res.json({
      clientSecret: `pi_mock_${Math.random().toString(36).substring(2, 11)}_secret_${Math.random().toString(36).substring(2, 8)}`,
      simulated: true,
      publishableKey: "pk_test_placeholder_for_rowone_cinema"
    });
  }

  try {
    const stripe = getStripe();

    // Search or create customer on Stripe
    let customerId: string | undefined;
    if (userId) {
      const { data: savedPM } = await supabaseServer
        .from("user_payment_methods")
        .select("customerId")
        .eq("userId", userId)
        .limit(1);

      if (savedPM && savedPM.length > 0 && savedPM[0].customerId) {
        customerId = savedPM[0].customerId;
      } else if (email) {
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const customer = await stripe.customers.create({
            email,
            metadata: { userId },
            name: email.split("@")[0]
          });
          customerId = customer.id;
        }
      }
    }

    const intent = await stripe.paymentIntents.create({
      amount: cents,
      currency: "usd",
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: userId || "guest_user",
        type: "ticket",
        movieId: movieId || "",
        movieTitle: movieTitle || "ROWONE Custom Purchase",
        time: time || "",
        hallName: hall || "",
        seat: seat || "",
        priceValue: String(amount)
      }
    });

    res.json({
      clientSecret: intent.client_secret,
      simulated: false,
      publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY
    });
  } catch (err: any) {
    console.error(`💥 Create payment intent failed:`, err.message);
    res.status(500).json({ error: `Could not launch checkout intent: ${err.message}` });
  }
});

// 8. Retrieve Stripe payment history for subscription renewals and ticket purchases
app.get("/api/stripe/payment-history", async (req: any, res: any) => {
  const { userId, email } = req.query;

  const getSimulatedHistory = async () => {
    // Collect local tickets from Database for one-time purchase representation
    let dbTickets: any[] = [];
    if (userId) {
      try {
        const { data } = await supabaseServer
          .from("booked_tickets")
          .select("*")
          .eq("userId", userId)
          .order("bookedAt", { ascending: false });
        if (data) dbTickets = data;
      } catch (err) {
        console.warn("⚠️ Failed to retrieve db tickets for simulated history:", err);
      }
    }

    // Combine standard subscription renewal history with actual booked tickets
    const items: any[] = [];

    // Add subscription renewals
    items.push({
      id: "ch_sim_sub_01948",
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      description: "Monthly ROWONE Pass renewal",
      amount: 14.99,
      type: "subscription",
      paymentMethod: "Visa •••• 4242",
      status: "succeeded",
      receiptUrl: "#"
    });

    items.push({
      id: "ch_sim_sub_00287",
      date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      description: "Monthly ROWONE Pass renewal",
      amount: 14.99,
      type: "subscription",
      paymentMethod: "Visa •••• 4242",
      status: "succeeded",
      receiptUrl: "#"
    });

    // Map booked database tickets to simulated payment history
    dbTickets.forEach((ticket, idx) => {
      items.push({
        id: `ch_sim_tkt_${ticket.id || idx}`,
        date: new Date(ticket.bookedAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        description: `Movie Ticket: ${ticket.movieTitle || "ROWONE Cinema Screening"} (Seat ${ticket.seat || "C3"})`,
        amount: parseFloat(ticket.price) || 12.50,
        type: "one-time",
        paymentMethod: "Stripe Link Express",
        status: "succeeded",
        receiptUrl: "#"
      });
    });

    // Sort items by date
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return items;
  };

  if (!isStripeConfigured()) {
    const backupList = await getSimulatedHistory();
    return res.json({ transactions: backupList, simulated: true });
  }

  try {
    const stripe = getStripe();
    let customerId: string | undefined;

    // A. Look up customer ID in Supabase
    if (userId) {
      const { data: savedPM } = await supabaseServer
        .from("user_payment_methods")
        .select("customerId")
        .eq("userId", userId)
        .limit(1);

      if (savedPM && savedPM.length > 0 && savedPM[0].customerId) {
        customerId = savedPM[0].customerId;
      }
    }

    // B. Search Stripe customers list if still empty
    if (!customerId && email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    if (!customerId) {
      // If customer has no Stripe profile yet, return their local bookings and empty list
      const backupList = await getSimulatedHistory();
      return res.json({ transactions: backupList, simulated: true, note: "No active Stripe merchant profile linked yet." });
    }

    // Retrieve real Stripe charges for the customer
    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 50,
    });

    const transactions = charges.data.map((charge: any) => {
      const brand = charge.payment_method_details?.card?.brand || "Card";
      const last4 = charge.payment_method_details?.card?.last4 || "";
      const methodLabel = brand !== "Card" ? `${brand} •••• ${last4}` : "Stripe Secure";

      return {
        id: charge.id,
        date: new Date(charge.created * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        description: charge.description || (charge.invoice ? "Monthly ROWONE Pass renewal" : "Cinema ticket purchase"),
        amount: charge.amount / 100,
        type: charge.invoice ? "subscription" : "one-time",
        paymentMethod: methodLabel,
        status: charge.status === "succeeded" ? "succeeded" : charge.status === "failed" ? "failed" : "pending",
        receiptUrl: charge.receipt_url || "#"
      };
    });

    res.json({ transactions, simulated: false });
  } catch (err: any) {
    console.error("💥 Failed retrieving Stripe payment history:", err.message);
    const backupList = await getSimulatedHistory();
    res.json({ transactions: backupList, simulated: true, error: err.message });
  }
});


// =========================================================================
// 🎬 REELS & MOVIES SHAREABLE URLS, QR CODE GENERATION & ANALYTICS SYSTEMS
// =========================================================================

// Store uploaded content in-memory on the server as backup/local cache
const serverSideUploadedContent: any[] = [];

// Helper to sanitize title to URL slug
function sanitizeTitleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .trim()
    .replace(/\s+/g, "-")     // Replace spaces with hyphens
    .replace(/-+/g, "-");     // Replace multiple hyphens with single hyphen
}

// Helper to ensure slug is unique
async function checkUniqueSlug(baseSlug: string): Promise<string> {
  let isDuplicate = serverSideUploadedContent.some(item => item.slug === baseSlug);
  
  try {
    const { data } = await supabaseServer
      .from("uploaded_content")
      .select("id")
      .eq("slug", baseSlug)
      .maybeSingle();
    if (data) {
      isDuplicate = true;
    }
  } catch (err) {
    console.warn("Supabase check failed on slug uniqueness query, falling back:", err);
  }

  if (!isDuplicate) {
    return baseSlug;
  }
  // If exists, append 5-character string
  const randomHex = Math.random().toString(16).substring(2, 7);
  return `${baseSlug}-${randomHex}`;
}

// 1. Endpoint: Retrieve content by its unique slug and record visits
app.get("/api/content/by-slug/:contentType/:slug", async (req: any, res: any) => {
  const { contentType, slug } = req.params;
  const referrer = req.query.referrer || req.headers["referer"] || "";
  const visitorIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "anonymous";

  console.log(`🔍 Lookup slug: ${slug} (${contentType}) from IP ${visitorIp}`);

  let foundItem: any = null;

  // Search in memory first
  foundItem = serverSideUploadedContent.find(
    item => item.slug === slug && item.contentType === contentType
  );

  // Then try Supabase
  try {
    const { data, error } = await supabaseServer
      .from("uploaded_content")
      .select("*")
      .eq("slug", slug)
      .eq("content_type", contentType)
      .maybeSingle();

    if (error) {
      console.warn("Supabase query error retrieving content by slug:", error);
    }
    
    if (data) {
      // Map database columns to app metadata standard structure
      foundItem = {
        id: data.id,
        title: data.title,
        slug: data.slug,
        contentType: data.content_type,
        creatorId: data.creator_id,
        originalVideoUrl: data.original_video_url,
        shareUrl: data.share_url,
        qrCodeUrl: data.qr_code_url,
        uploadDate: data.upload_date,
        views: data.views || 0,
        shares: data.shares || 0,
        linkClicks: data.link_clicks || 0,
        qrScans: data.qr_scans || 0,
        sharesByPlatform: data.shares_by_platform || { whatsapp: 0, facebook: 0, x: 0, telegram: 0, email: 0, copy: 0 },
        referringSources: data.referring_sources || {},
        uniqueVisitors: data.unique_visitors || [],
        ...(data.metadata || {})
      };
    }
  } catch (err) {
    console.warn("Supabase connect failed during slug lookup:", err);
  }

  if (!foundItem) {
    return res.status(404).json({ error: "Reel or Movie content not found matching selected slug." });
  }

  // --- ANALYTICS UPDATE ---
  // Increment view count + link click
  foundItem.views = (foundItem.views || 0) + 1;
  foundItem.linkClicks = (foundItem.linkClicks || 0) + 1;

  // Track referring source
  if (referrer) {
    try {
      const refUrl = new URL(referrer);
      const host = refUrl.hostname || "direct";
      const referralDict = foundItem.referringSources || {};
      referralDict[host] = (referralDict[host] || 0) + 1;
      foundItem.referringSources = referralDict;
    } catch {
      const host = referrer.substring(0, 50);
      const referralDict = foundItem.referringSources || {};
      referralDict[host] = (referralDict[host] || 0) + 1;
      foundItem.referringSources = referralDict;
    }
  } else {
    const referralDict = foundItem.referringSources || {};
    referralDict["direct"] = (referralDict["direct"] || 0) + 1;
    foundItem.referringSources = referralDict;
  }

  // Track unique visitors
  const visitorsList = foundItem.uniqueVisitors || [];
  if (!visitorsList.includes(visitorIp)) {
    visitorsList.push(visitorIp);
  }
  foundItem.uniqueVisitors = visitorsList;

  // Persist back (Supabase & Server Side cache)
  const cacheIndex = serverSideUploadedContent.findIndex(item => item.id === foundItem.id);
  if (cacheIndex >= 0) {
    serverSideUploadedContent[cacheIndex] = foundItem;
  } else {
    serverSideUploadedContent.push(foundItem);
  }

  try {
    await supabaseServer
      .from("uploaded_content")
      .update({
        views: foundItem.views,
        link_clicks: foundItem.linkClicks,
        referring_sources: foundItem.referringSources,
        unique_visitors: foundItem.uniqueVisitors
      })
      .eq("id", foundItem.id);
  } catch (errDb) {
    console.warn("Failed updating view/click metrics in Supabase:", errDb);
  }

  res.json(foundItem);
});

// 2. Endpoint: Upload a new Movie or Reel, generate unique URL and QR
app.post("/api/content/upload", async (req: any, res: any) => {
  const { title, contentType, creatorId, originalVideoUrl, synopsis, genre, rating, runtime, format, imageUrl, heroImageUrl } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Missing required content title value" });
  }

  const type = (contentType || "movie").toLowerCase();
  if (type !== "movie" && type !== "reel") {
    return res.status(400).json({ error: "contentType must be either 'movie' or 'reel'" });
  }

  // 1. Generate slug, handle collision verification
  const baseSlug = sanitizeTitleToSlug(title);
  const slug = await checkUniqueSlug(baseSlug);

  // 2. Generate permanent seo friendly share Url (e.g. static link layout)
  const shareUrl = `https://www.rowone.xyz/${type}s/${slug}`;

  // 3. Generate QR code representation directly
  let qrCodeUrl = "";
  try {
    qrCodeUrl = await QRCode.toDataURL(shareUrl, {
      margin: 1.5,
      width: 256,
      color: {
        dark: "#000000",
        light: "#ffffff",
      }
    });
  } catch (qrErr: any) {
    console.error("QR creation failed on backend server:", qrErr);
  }

  const id = `m-${Date.now()}`;
  const uploadDate = new Date().toISOString();

  // Create UI representation record
  const contentRecord = {
    id,
    title: title.toUpperCase(),
    slug,
    contentType: type,
    creatorId: creatorId || "anonymous",
    originalVideoUrl: originalVideoUrl || "",
    shareUrl,
    qrCodeUrl,
    uploadDate,
    views: 0,
    shares: 0,
    linkClicks: 0,
    qrScans: 0,
    sharesByPlatform: { whatsapp: 0, facebook: 0, x: 0, telegram: 0, email: 0, copy: 0 },
    referringSources: {},
    uniqueVisitors: [],
    synopsis: synopsis || "An elite high-budget classic theatrical release uploaded via ROWONE Studio.",
    genre: genre || "CLASSIC",
    rating: rating || "PG-13",
    runtime: runtime || "2h 15m",
    format: format || "DOLBY CINEMA",
    ratingScore: 4.8,
    reviewsCount: "0",
    imageUrl: imageUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=600",
    heroImageUrl: heroImageUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1200",
    startsIn: "Tomorrow",
    cast: [],
    capacity: 100,
    isUserUploaded: true
  };

  // Add to local server-side cache
  serverSideUploadedContent.push(contentRecord);

  // 4. Save permanently in Supabase table "uploaded_content"
  try {
    const { error } = await supabaseServer
      .from("uploaded_content")
      .insert({
        id,
        title: contentRecord.title,
        slug,
        content_type: type,
        creator_id: contentRecord.creatorId,
        original_video_url: contentRecord.originalVideoUrl,
        share_url: shareUrl,
        qr_code_url: qrCodeUrl,
        upload_date: uploadDate,
        views: 0,
        shares: 0,
        link_clicks: 0,
        qr_scans: 0,
        shares_by_platform: contentRecord.sharesByPlatform,
        referring_sources: contentRecord.referringSources,
        unique_visitors: contentRecord.uniqueVisitors,
        metadata: {
          synopsis: contentRecord.synopsis,
          genre: contentRecord.genre,
          rating: contentRecord.rating,
          runtime: contentRecord.runtime,
          format: contentRecord.format,
          imageUrl: contentRecord.imageUrl,
          heroImageUrl: contentRecord.heroImageUrl,
          startsIn: "Tomorrow",
          ratingScore: 4.8,
          reviewsCount: "0",
        }
      });

    if (error) {
      console.warn("Supabase database insert warning (using cache fallback index):", error.message);
    } else {
      console.log(`✅ Stored shareable link "${slug}" permanently in Supabase.`);
    }
  } catch (errDb) {
    console.warn("Could not insert uploaded content row in Supabase, using local memory server Side cache fallback:", errDb);
  }

  res.status(201).json(contentRecord);
});

// 3. Endpoint: Increment clicks, qr scans, shares per platform
app.post("/api/content/analytics", async (req: any, res: any) => {
  const { id, updateType, platform, referrer } = req.body;
  const visitorIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "anonymous";

  if (!id || !updateType) {
    return res.status(400).json({ error: "Missing required properties: id and updateType" });
  }

  console.log(`📊 Metric hit: ID ${id}, Type: ${updateType}, Platform: ${platform} from IP ${visitorIp}`);

  let foundItem = serverSideUploadedContent.find(item => item.id === id);

  // If not in cache, query from Supabase to synchronize
  if (!foundItem) {
    try {
      const { data } = await supabaseServer
        .from("uploaded_content")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        foundItem = {
          id: data.id,
          title: data.title,
          slug: data.slug,
          contentType: data.content_type,
          creatorId: data.creator_id,
          originalVideoUrl: data.original_video_url,
          shareUrl: data.share_url,
          qrCodeUrl: data.qr_code_url,
          uploadDate: data.upload_date,
          views: data.views || 0,
          shares: data.shares || 0,
          linkClicks: data.link_clicks || 0,
          qrScans: data.qr_scans || 0,
          sharesByPlatform: data.shares_by_platform || { whatsapp: 0, facebook: 0, x: 0, telegram: 0, email: 0, copy: 0 },
          referringSources: data.referring_sources || {},
          uniqueVisitors: data.unique_visitors || [],
          ...(data.metadata || {})
        };
        serverSideUploadedContent.push(foundItem);
      }
    } catch (errDb) {
      console.warn("Supabase fetch failed during analytic query:", errDb);
    }
  }

  if (!foundItem) {
    return res.status(404).json({ error: "Selected movie or reel identifier not found." });
  }

  // Update counters
  if (updateType === "click") {
    foundItem.views = (foundItem.views || 0) + 1;
    foundItem.linkClicks = (foundItem.linkClicks || 0) + 1;
  } else if (updateType === "qr_scan") {
    foundItem.views = (foundItem.views || 0) + 1;
    foundItem.qrScans = (foundItem.qrScans || 0) + 1;
  } else if (updateType === "share") {
    foundItem.shares = (foundItem.shares || 0) + 1;
    if (platform) {
      const platformKey = platform.toLowerCase();
      const pDict = foundItem.sharesByPlatform || { whatsapp: 0, facebook: 0, x: 0, telegram: 0, email: 0, copy: 0 };
      pDict[platformKey] = (pDict[platformKey] || 0) + 1;
      foundItem.sharesByPlatform = pDict;
    }
  }

  // Track unique visitors
  const visList = foundItem.uniqueVisitors || [];
  if (!visList.includes(visitorIp)) {
    visList.push(visitorIp);
  }
  foundItem.uniqueVisitors = visList;

  // Track referring sources
  if (referrer) {
    try {
      const parsedRef = new URL(referrer);
      const host = parsedRef.hostname || "direct";
      const refs = foundItem.referringSources || {};
      refs[host] = (refs[host] || 0) + 1;
      foundItem.referringSources = refs;
    } catch {
      const refs = foundItem.referringSources || {};
      const hostName = referrer.substring(0, 50);
      refs[hostName] = (refs[hostName] || 0) + 1;
      foundItem.referringSources = refs;
    }
  }

  // Save back to memory cache
  const idx = serverSideUploadedContent.findIndex(item => item.id === id);
  if (idx >= 0) {
    serverSideUploadedContent[idx] = foundItem;
  }

  // Save back permanently to Supabase
  try {
    await supabaseServer
      .from("uploaded_content")
      .update({
        views: foundItem.views,
        shares: foundItem.shares,
        link_clicks: foundItem.linkClicks,
        qr_scans: foundItem.qrScans,
        shares_by_platform: foundItem.sharesByPlatform,
        referring_sources: foundItem.referringSources,
        unique_visitors: foundItem.uniqueVisitors
      })
      .eq("id", id);
  } catch (errDb) {
    console.warn("Could not synchronize analytics metric to Supabase:", errDb);
  }

  res.json({ success: true, updatedItem: foundItem });
});


// Serve frontend static assets and setup Vite development server middleware
async function setupViteAndListen() {
  if (process.env.NODE_ENV !== "production") {
    const viteModule = await import("vite");
    const vite = await viteModule.createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 ROWONE Node full-stack integration server listening on http://localhost:${PORT}`);
  });
}

setupViteAndListen();
