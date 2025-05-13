const paypal = require("@paypal/checkout-server-sdk");

// Set up PayPal environment (Sandbox or Live)
let environment = new paypal.core.SandboxEnvironment(
  "YOUR_CLIENT_ID",
  "YOUR_CLIENT_SECRET"
);
let client = new paypal.core.PayPalHttpClient(environment);
app.post("/paypal/webhook", async (req, res) => {
  const webhookId = "YOUR_WEBHOOK_ID"; // Found in your PayPal Dashboard
  const transmissionId = req.headers["paypal-transmission-id"];
  const timestamp = req.headers["paypal-transmission-time"];
  const signature = req.headers["paypal-transmission-sig"];
  const certUrl = req.headers["paypal-cert-url"];
  const authAlgo = req.headers["paypal-auth-algo"];
  const webhookEvent = req.body;

  const verifyRequest = new paypal.notifications.VerifyWebhookSignatureRequest();
  verifyRequest.requestBody({
    auth_algo: authAlgo,
    cert_url: certUrl,
    transmission_id: transmissionId,
    transmission_sig: signature,
    transmission_time: timestamp,
    webhook_id: webhookId,
    webhook_event: webhookEvent
  });

  try {
    const response = await client.execute(verifyRequest);

    if (response.result.verification_status === "SUCCESS") {
      console.log("Webhook verified.");
      
      // Proceed with your existing event handling logic here
      const event = webhookEvent;

      if (event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
        const subscriptionId = event.resource.id;
        const payerEmail = event.resource.subscriber.email_address;
        const planId = event.resource.plan_id;

        await db.collection("users").doc(payerEmail).set({
          email: payerEmail,
          subscriptionId: subscriptionId,
          subscriptionPlan: planId,
          status: "active",
          updatedAt: new Date().toISOString()
        }, { merge: true });

        return res.sendStatus(200);
      }

      return res.sendStatus(200);
    } else {
      console.warn("Webhook verification failed.");
      return res.sendStatus(400);
    }
  } catch (err) {
    console.error("Verification error:", err);
    return res.sendStatus(500);
  }
});
