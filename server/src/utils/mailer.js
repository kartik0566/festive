import nodemailer from "nodemailer";

export const canSendMail = () => {
  if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
    return true;
  }

  const hasUser = Boolean(process.env.SMTP_USER);
  const hasPassword = Boolean(process.env.SMTP_PASS);
  const authIsComplete = hasUser === hasPassword;

  return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM && authIsComplete);
};

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const password =
    host?.toLowerCase() === "smtp.gmail.com"
      ? process.env.SMTP_PASS?.replace(/\s/g, "")
      : process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 12000,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: password
        }
      : undefined
  });
};

const sendWithResend = async ({ to, subject, text, html }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        to: [to],
        subject,
        text,
        ...(html ? { html } : {})
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      console.error("Resend email delivery failed:", response.status);
      throw new Error("The email API rejected this message. Check the API key and verify the sender address.");
    }
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The email API did not respond in time. Please request a new OTP in a moment.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const sendMail = async ({ to, subject, text, html }) => {
  if (!to) {
    return;
  }

  if (!canSendMail()) {
    throw new Error("Email is not configured. Add a Resend API key and verified sender, or SMTP settings, then request a new OTP.");
  }

  try {
    if (process.env.RESEND_API_KEY) {
      await sendWithResend({ to, subject, text, html });
      return;
    }

    await getTransporter().sendMail({
      from: process.env.MAIL_FROM || "Festive Events <hello@festive.local>",
      to,
      subject,
      text,
      html
    });
  } catch (error) {
    console.error("Email delivery failed:", error.code || error.responseCode || error.message);
    if (process.env.RESEND_API_KEY) {
      throw error;
    }
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    if (
      process.env.RENDER_EXTERNAL_HOSTNAME &&
      !process.env.RESEND_API_KEY &&
      [25, 465, 587].includes(smtpPort) &&
      ["ETIMEDOUT", "ECONNECTION", "ESOCKET"].includes(error.code)
    ) {
      throw new Error(
        "Email could not connect. Render Free blocks outbound SMTP on ports 25, 465, and 587. Configure the Resend email API with a verified sender, or use a paid Render service, then request a new OTP."
      );
    }
    throw new Error("Email delivery failed. Check the SMTP settings in Render and request a new OTP.");
  }
};

export const sendLeadNotification = async (event) => {
  const details = [
    `Name: ${event.name}`,
    `Phone: ${event.phone}`,
    `Email: ${event.email}`,
    `Event: ${event.eventType}`,
    `Date: ${event.eventDate ? new Date(event.eventDate).toDateString() : "Not set"}`,
    `Budget: ${event.budget || "Not set"}`,
    `Selected package: ${event.selectedPackage?.name || "Custom consultation"}`,
    `Package price: ${
      event.selectedPackage?.price ? `INR ${Math.round(event.selectedPackage.price).toLocaleString("en-IN")}` : "Not set"
    }`,
    `Location: ${event.location || "Not set"}`,
    "",
    event.message || ""
  ].join("\n");

  await sendMail({
    to: process.env.MAIL_TO,
    subject: `New event inquiry: ${event.eventType}`,
    text: details
  });

  await sendMail({
    to: event.email,
    subject: "We received your event inquiry",
    text: [
      `Hi ${event.name},`,
      "",
      "Thank you for contacting Festive Events. We received your inquiry and our team will review the details shortly.",
      "",
      details,
      "",
      "Regards,",
      "Festive Events"
    ].join("\n")
  });
};

export const sendWelcomeEmail = async (user) => {
  await sendMail({
    to: user.email,
    subject: "Welcome to Festive Events",
    text: [
      `Hi ${user.name},`,
      "",
      `Your ${user.role} account is ready. You can now log in and use your dashboard.`,
      "",
      "Regards,",
      "Festive Events"
    ].join("\n")
  });
};

export const sendEmailVerificationOtp = async ({ to, name, otp }) => {
  await sendMail({
    to,
    subject: "Verify your Festive Events email",
    text: [
      `Hi ${name || "there"},`,
      "",
      `Your email verification OTP is ${otp}.`,
      "This OTP expires in 10 minutes.",
      "",
      "Regards,",
      "Festive Events"
    ].join("\n")
  });
};

export const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  await sendMail({
    to,
    subject: "Reset your Festive Events password",
    text: [
      `Hi ${name || "there"},`,
      "",
      "Use the link below to choose a new password. This link expires in one hour and can only be used once.",
      resetUrl,
      "",
      "If you did not request this, you can ignore this email.",
      "",
      "Regards,",
      "Festive Events"
    ].join("\n")
  });
};

export const sendLoginOtp = async ({ to, name, otp }) => {
  await sendMail({
    to,
    subject: "Your Festive Events login OTP",
    text: [
      `Hi ${name || "there"},`,
      "",
      `Your login OTP is ${otp}.`,
      "This OTP expires in 10 minutes. If you did not request it, please ignore this email.",
      "",
      "Regards,",
      "Festive Events"
    ].join("\n")
  });
};

export const sendProposalEmail = async ({ to, name, proposal }) => {
  await sendMail({
    to,
    subject: `Proposal ready: ${proposal.title}`,
    text: [
      `Hi ${name || "there"},`,
      "",
      "Your event proposal is ready in your Festive Events dashboard.",
      `Proposal: ${proposal.title}`,
      `Total: INR ${Math.round(proposal.total || 0).toLocaleString("en-IN")}`,
      "",
      "Please log in to review, approve, or reject it.",
      "",
      "Regards,",
      "Festive Events"
    ].join("\n")
  });
};

export const sendInvoiceEmail = async ({ to, name, invoice }) => {
  await sendMail({
    to,
    subject: `Invoice issued: ${invoice.invoiceNumber}`,
    text: [
      `Hi ${name || "there"},`,
      "",
      "Your invoice has been generated.",
      `Invoice: ${invoice.invoiceNumber}`,
      `Total: INR ${Math.round(invoice.total || 0).toLocaleString("en-IN")}`,
      `Paid: INR ${Math.round(invoice.amountPaid || 0).toLocaleString("en-IN")}`,
      "",
      "Please log in to download the invoice PDF or complete payment.",
      "",
      "Regards,",
      "Festive Events"
    ].join("\n")
  });
};

export const sendPaymentReceipt = async ({ to, name, invoice, payment }) => {
  await sendMail({
    to,
    subject: `Payment received for ${invoice.invoiceNumber}`,
    text: [
      `Hi ${name || "there"},`,
      "",
      "We received your payment.",
      `Invoice: ${invoice.invoiceNumber}`,
      `Amount: INR ${Math.round(payment.amount || 0).toLocaleString("en-IN")}`,
      `Payment ID: ${payment.providerPaymentId || payment._id}`,
      `Invoice status: ${invoice.status}`,
      "",
      "Thank you for choosing Festive Events.",
      "",
      "Regards,",
      "Festive Events"
    ].join("\n")
  });
};
