import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Service from "../models/Service.js";
import Package from "../models/Package.js";

const services = [
  {
    title: "Wedding Planning",
    category: "Wedding",
    description: "End-to-end planning for ceremonies, receptions, decor, guest flow, and day-of coordination.",
    basePrice: 150000,
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Corporate Events",
    category: "Corporate",
    description: "Launches, conferences, annual days, offsites, stage production, registration, and hospitality.",
    basePrice: 90000,
    imageUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Private Celebrations",
    category: "Social",
    description: "Birthdays, anniversaries, baby showers, themed parties, entertainment, and catering support.",
    basePrice: 45000,
    imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Concerts & Festivals",
    category: "Live",
    description: "Artist coordination, sound, lighting, crowd operations, ticketing support, and backstage logistics.",
    basePrice: 250000,
    imageUrl: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=80"
  }
];

const packages = [
  {
    name: "Essential",
    description: "Planning support for small gatherings with core coordination, basic decor, and event-day guidance.",
    price: 49999,
    features: ["Event consultation", "Planning checklist", "Basic decor plan", "Day-of coordination"]
  },
  {
    name: "Signature",
    description: "A full planning package for premium social and corporate events.",
    price: 149999,
    features: ["Theme design", "Service planning", "Budget tracking", "Guest experience plan", "Event manager"]
  },
  {
    name: "Luxury",
    description: "High-touch planning for large events with premium production, hospitality, and full event supervision.",
    price: 399999,
    features: ["Custom concept", "Production design", "Dedicated team", "VIP hospitality", "Post-event reporting"]
  }
];

export const seedDefaults = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@festive.local";
  const adminExists = await User.exists({ email: adminEmail.toLowerCase() });

  if (!adminExists) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin@12345", 12);
    await User.create({
      name: process.env.ADMIN_NAME || "Festive Admin",
      email: adminEmail,
      passwordHash,
      role: "admin",
      emailVerified: true
    });
    console.log(`Seeded admin user: ${adminEmail}`);
  }

  if ((await Service.countDocuments()) === 0) {
    await Service.insertMany(services);
    console.log("Seeded services");
  }

  if ((await Package.countDocuments()) === 0) {
    await Package.insertMany(packages);
    console.log("Seeded packages");
  }
};
