const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

setGlobalOptions({ maxInstances: 10 });

const { addImpactEntry } = require("./utils/addImpactEntry");

// Event payment creation trigger
exports.onEventPaymentCreated = onDocumentCreated("payments/{paymentId}", async (event) => {
  const data = event.data.data();
  if (!data || !data.eventId || !data.userId) return;

  const buyerId = data.userId;
  const eventId = data.eventId;
  const eventTitle = data.eventTitle || "Unnamed Event";

  try {
    console.log(`🎟️ Event Payment Created: ${eventTitle} by ${buyerId}`);

    // 1️⃣ Get the event document to find who organized it
    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) {
      console.warn(`⚠️ Event ${eventId} not found, skipping seller impact.`);
      return;
    }

    const eventData = eventSnap.data();
    const organizerId = eventData.createdBy;

    // 2️⃣ Add impact entries for both buyer and seller (organizer)
    await addImpactEntry(
      buyerId,
      "buy_event_ticket",
      `Bought Ticket for: ${eventTitle}`
    );

    if (organizerId && organizerId !== buyerId) {
      await addImpactEntry(
        organizerId,
        "sell_event_ticket",
        `Sold Ticket for: ${eventTitle}`
      );
    }

    console.log(`✅ Impact entries added for event ticket ${eventTitle}`);
  } catch (err) {
    console.error("❌ Error in onEventPaymentCreated:", err);
  }
});

// Order creation trigger
exports.onOrderCreated = onDocumentCreated("orders/{orderId}", async (event) => {
  const data = event.data.data();
  if (!data || !data.buyerId || !data.sellerId) return;

  const buyerId = data.buyerId;
  const sellerId = data.sellerId;
  const productName = data.productName || "Unnamed Product";

  console.log(`🛒 Order created: ${productName} (Buyer: ${buyerId}, Seller: ${sellerId})`);

  await addImpactEntry(
    buyerId,
    "buy_product",
    `Bought a Product: ${productName}`
  );
  await addImpactEntry(
    sellerId,
    "sell_product",
    `Sold a Product: ${productName}`
  );
});

// Product listing trigger
exports.onProductCreated = onDocumentCreated("products/{productId}", async (event) => {
  const data = event.data.data();
  if (!data || !data.ownerId) return;

  const userId = data.ownerId;
  const productName = data.name || "Unnamed Product";
  const category = data.category || "unspecified";

  console.log(`📦 Product listed by ${userId}: ${productName} (${category})`);

  await addImpactEntry(
    userId,
    "product_listing",
    `Listed a new ${category} product: ${productName}`
  );
});

// Event listing trigger
exports.onEventCreated = onDocumentCreated("events/{eventId}", async (event) => {
  const data = event.data.data();
  if (!data || !data.createdBy) return;

  const userId = data.createdBy;
  const title = data.title || "Untitled Event";

  console.log(`🎉 Event created by ${userId}: ${title}`);

  await addImpactEntry(
    userId,
    "event_listing",
    `Created a new event: ${title}`
  );
});
