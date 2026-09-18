export const SITE_NAME = "AB Collection";
export const SITE_TAGLINE = "Premium Everyday Essentials";
export const SITE_URL =
  process.env["NEXT_PUBLIC_SITE_URL"]?.replace(/\/$/, "") || "https://abcollection.co.in";
export const SITE_EMAIL = "abbasbadwahwala53@gmail.com";
export const SITE_INSTAGRAM = "https://instagram.com/abcollection.co.in";
export const SITE_LOCALE = "en_IN";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/collection", label: "Collection" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

export const FAQS = [
  {
    question: "When will the collection launch?",
    answer:
      "Very soon. Register your interest to be the first to know — registered customers get 48 hours of early access before the public.",
  },
  {
    question: "How does the pre-launch offer work?",
    answer:
      "Register before launch and we reserve an exclusive 10% launch discount on your selected pieces. You'll receive your code by WhatsApp and email.",
  },
  {
    question: "Am I paying anything today?",
    answer:
      "No. This is only an interest registration. Nothing is charged now, and you'll receive purchase instructions when the collection launches.",
  },
  {
    question: "Can I select multiple products?",
    answer: "Yes. Select as many pieces as you like — your discount applies across your selection.",
  },
  {
    question: "Will my size be available?",
    answer:
      "The 240 GSM Oversized Tee and the Regular Fit Tee launch in S to XXL. All other pieces launch in S to XL. Registering early helps us produce the right sizes in the right quantities.",
  },
  {
    question: "Is Cash on Delivery available?",
    answer:
      "Payment will be prepaid only at launch. This keeps costs down and pricing honest — savings we pass back to you.",
  },
  {
    question: "How will you use my details?",
    answer:
      "Only to tell you about the launch and fulfil your order. We never sell your data, and you can unsubscribe at any time.",
  },
] as const;
