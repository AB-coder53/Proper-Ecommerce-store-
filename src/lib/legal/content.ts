import { LEGAL_LAST_UPDATED } from "@/lib/legal/contact";
import type { LegalBlock, LegalDocument } from "@/lib/legal/types";

const p = (text: string): LegalBlock => ({ type: "paragraph", text });
const ul = (items: string[]): LegalBlock => ({ type: "list", items });
const h = (text: string): LegalBlock => ({ type: "subheading", text });

export const LEGAL_NAV_LINKS = [
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/shipping", label: "Shipping & Delivery" },
  { href: "/returns", label: "Refund & Returns" },
  { href: "/pricing", label: "Pricing & Tax" },
] as const;

export const TERMS_DOCUMENT: LegalDocument = {
  slug: "terms",
  title: "Terms & Conditions",
  description: "Terms and conditions for using the AB Collection website and purchasing products.",
  lastUpdated: LEGAL_LAST_UPDATED,
  intro: [
    "Welcome to AB Collection. These Terms & Conditions govern your access to and use of the AB Collection website and your purchase of products from us.",
    "By accessing our website, placing an order, making a reservation, or otherwise using our services, you agree to these Terms & Conditions.",
    "If you do not agree with these terms, please do not use our website or place an order.",
  ],
  sections: [
    {
      title: "1. About AB Collection",
      blocks: [
        p(
          "AB Collection is a direct-to-consumer clothing brand focused on premium everyday clothing and essentials.",
        ),
        p(
          "For questions, support, orders, exchanges, or other customer-service matters, you may contact us at abcollection.co.in@gmail.com or +91 7489346362.",
        ),
      ],
    },
    {
      title: "2. Products",
      blocks: [
        p(
          "We make reasonable efforts to ensure that product descriptions, photographs, colours, specifications, measurements, and other information displayed on our website are accurate. However:",
        ),
        ul([
          "Actual colours may vary slightly depending on your device's screen and display settings.",
          "Measurements may have minor variations due to manufacturing processes.",
          "Product appearance may vary slightly between batches.",
          "Product availability is subject to stock availability.",
        ]),
        p(
          "We reserve the right to update product information, specifications, colours, sizes, pricing, or availability without prior notice.",
        ),
      ],
    },
    {
      title: "3. Product Orders",
      blocks: [
        p(
          "An order placed through our website constitutes a request to purchase the selected product(s).",
        ),
        p(
          "An order is considered accepted by AB Collection only after we have successfully processed and confirmed the order.",
        ),
        p("We reserve the right to refuse, cancel, or limit an order in circumstances including:"),
        ul([
          "Product unavailability",
          "Incorrect pricing or product information",
          "Suspected fraudulent activity",
          "Incorrect customer information",
          "Delivery limitations",
          "Technical or system errors",
          "Other circumstances that prevent us from fulfilling the order",
        ]),
        p(
          "If an order is cancelled by us after payment has been received, the applicable amount paid by the customer will be handled in accordance with our Refund, Return & Cancellation Policy.",
        ),
      ],
    },
    {
      title: "4. Pricing",
      blocks: [
        p("All product prices displayed on the website are stated in Indian Rupees (INR)."),
        p(
          "At present, AB Collection is not registered under GST and therefore does not separately charge GST to customers.",
        ),
        p(
          "The amount displayed as the product price is the applicable product price payable by the customer, unless otherwise stated at checkout.",
        ),
        p(
          "AB Collection reserves the right to change product prices at any time. Any price change will not affect an order that has already been confirmed.",
        ),
        p(
          "For further information, please refer to our Pricing & Tax Information page at /pricing.",
        ),
      ],
    },
    {
      title: "5. Shipping & Delivery",
      blocks: [
        p("We currently aim to process confirmed orders within approximately 2–3 business days."),
        p(
          "After dispatch, delivery within India is generally expected within approximately 5–7 business days, depending on the delivery location, courier service, weather, public holidays, logistical conditions, and other circumstances beyond our control.",
        ),
        p("Estimated delivery timelines are not guaranteed delivery dates."),
        p("For complete information, please refer to our Shipping & Delivery Policy at /shipping."),
      ],
    },
    {
      title: "6. Returns, Exchanges & Refunds",
      blocks: [
        p(
          "AB Collection does not offer refunds for change of mind, incorrect size selection, colour preference, or other reasons unrelated to a defect or mistake by AB Collection.",
        ),
        p("Eligible exchanges are limited to situations where:"),
        ul([
          "The product has a manufacturing or product defect; or",
          "AB Collection has sent the wrong product, size, colour, or another incorrect item.",
        ]),
        p("Eligible issues must be reported within 2 days of delivery."),
        p(
          "Products must meet the applicable eligibility requirements described in our Refund, Return & Cancellation Policy at /returns.",
        ),
        p(
          "Where the issue is caused by AB Collection, we will bear the applicable return shipping cost.",
        ),
      ],
    },
    {
      title: "7. Customer Responsibilities",
      blocks: [
        p(
          "Customers are responsible for providing accurate information when placing an order, including:",
        ),
        ul([
          "Full name",
          "Mobile number",
          "Email address, where applicable",
          "Complete delivery address",
          "Correct product, size, and colour selection",
        ]),
        p(
          "AB Collection is not responsible for delays or failed deliveries caused by incorrect or incomplete information supplied by the customer.",
        ),
      ],
    },
    {
      title: "8. Website Use",
      blocks: [
        p("You agree not to misuse our website, including by:"),
        ul([
          "Attempting unauthorized access to our systems",
          "Introducing malicious software",
          "Interfering with website functionality",
          "Using automated systems to abuse the website",
          "Engaging in fraudulent activities",
          "Using the website for unlawful purposes",
        ]),
        p("We reserve the right to restrict or terminate access where misuse is identified."),
      ],
    },
    {
      title: "9. Intellectual Property",
      blocks: [
        p("All content available on the AB Collection website, including but not limited to:"),
        ul([
          "Brand name",
          "Logo",
          "Product photographs",
          "Product descriptions",
          "Graphics",
          "Website design",
          "Text",
          "Videos",
          "Marketing material",
        ]),
        p("is owned by or licensed to AB Collection unless otherwise stated."),
        p(
          "You may not reproduce, copy, modify, distribute, publish, or commercially use our content without prior written permission.",
        ),
      ],
    },
    {
      title: "10. Third-Party Services",
      blocks: [
        p(
          "Our website may use third-party services such as payment providers, logistics partners, analytics services, website infrastructure providers, or communication services.",
        ),
        p(
          "Your use of such services may also be subject to the respective third party's terms and policies.",
        ),
        p(
          "AB Collection is not responsible for failures caused solely by third-party services outside our reasonable control.",
        ),
      ],
    },
    {
      title: "11. Force Majeure",
      blocks: [
        p(
          "AB Collection will not be responsible for delays or failures caused by circumstances beyond our reasonable control, including natural disasters, extreme weather, strikes, government restrictions, transportation disruptions, technical failures, public emergencies, or courier disruptions.",
        ),
      ],
    },
    {
      title: "12. Changes to These Terms",
      blocks: [
        p("We may update these Terms & Conditions from time to time."),
        p(
          'The updated version will be published on this page with the revised "Last Updated" date.',
        ),
        p(
          "Your continued use of the website after changes are published constitutes acceptance of the updated terms.",
        ),
      ],
    },
    {
      title: "13. Governing Law",
      blocks: [
        p("These Terms & Conditions shall be governed by the applicable laws of India."),
        p(
          "Any dispute arising in connection with these terms shall be subject to the jurisdiction of the appropriate courts having jurisdiction over AB Collection's business location, subject to applicable law.",
        ),
      ],
    },
  ],
};

export const PRIVACY_DOCUMENT: LegalDocument = {
  slug: "privacy",
  title: "Privacy Policy",
  description:
    "How AB Collection collects, uses, and protects your personal information when you use our website and services.",
  lastUpdated: LEGAL_LAST_UPDATED,
  intro: [
    "AB Collection respects your privacy and is committed to protecting the personal information you provide while using our website and services.",
    "This Privacy Policy explains what information we may collect, how we use it, and the choices available to you.",
  ],
  sections: [
    {
      title: "1. Information We Collect",
      blocks: [
        p("Depending on how you interact with AB Collection, we may collect information such as:"),
        h("Personal Information"),
        ul([
          "Full name",
          "Mobile number",
          "Email address",
          "Delivery address",
          "City and other delivery-related information",
        ]),
        h("Order Information"),
        p("When you purchase a product, we may collect information relating to:"),
        ul([
          "Products purchased",
          "Size",
          "Colour",
          "Order details",
          "Delivery information",
          "Order status",
        ]),
        h("Communication Information"),
        p(
          "If you contact us through email, phone, WhatsApp, or other available channels, we may retain information necessary to respond to your request and provide customer support.",
        ),
        h("Early Access / Pre-Launch Information"),
        p(
          "If you voluntarily register for AB Collection Early Access, we may collect your email address and the date/time of registration for the purpose of providing Early Access communications and relevant launch information.",
        ),
      ],
    },
    {
      title: "2. How We Use Your Information",
      blocks: [
        p("We may use collected information to:"),
        ul([
          "Process and fulfil orders",
          "Deliver products",
          "Communicate regarding orders",
          "Provide customer support",
          "Process eligible exchanges",
          "Respond to enquiries",
          "Send Early Access or launch communications where you have requested them",
          "Improve our website, products, services, and customer experience",
          "Prevent fraud, misuse, and unauthorized activity",
          "Maintain business and transaction records",
          "Comply with applicable legal requirements",
        ]),
        p(
          "We do not use your information for purposes unrelated to the operation of AB Collection unless permitted by law or otherwise disclosed to you.",
        ),
      ],
    },
    {
      title: "3. Marketing Communications",
      blocks: [
        p(
          "If you voluntarily provide your email address or otherwise opt in to receive communications, we may use it to send information relating to:",
        ),
        ul([
          "Product launches",
          "Early Access",
          "Offers",
          "New collections",
          "Important brand updates",
        ]),
        p("You may request that we stop sending marketing communications by contacting us."),
      ],
    },
    {
      title: "4. Sharing of Information",
      blocks: [
        p(
          "We may share necessary information with trusted service providers where required to operate our business, including:",
        ),
        ul([
          "Shipping and logistics providers",
          "Payment service providers",
          "Website and technology providers",
          "Customer-support service providers",
          "Other vendors required to fulfil your order or provide our services",
        ]),
        p("We do not sell your personal information as a business practice."),
        p(
          "Information may also be disclosed where required by applicable law, legal process, government authority, or to protect our rights and the security of our customers and services.",
        ),
      ],
    },
    {
      title: "5. Payment Information",
      blocks: [
        p("Payments may be processed through third-party payment providers."),
        p(
          "AB Collection does not intentionally store complete payment-card information such as full card numbers when payment is processed through an external payment provider.",
        ),
        p(
          "Payment information is handled according to the applicable payment provider's policies and security practices.",
        ),
      ],
    },
    {
      title: "6. Cookies and Similar Technologies",
      blocks: [
        p(
          "Our website may use cookies, local storage, analytics tools, or similar technologies to:",
        ),
        ul([
          "Keep the website functioning",
          "Remember certain preferences",
          "Improve user experience",
          "Understand website usage",
          "Support relevant website functionality",
        ]),
        p(
          "You may be able to control certain cookie or browser-storage settings through your browser or device.",
        ),
        p("Disabling certain technologies may affect some website functionality."),
      ],
    },
    {
      title: "7. Data Security",
      blocks: [
        p(
          "We take reasonable measures to protect personal information against unauthorized access, misuse, alteration, disclosure, or destruction.",
        ),
        p("However, no internet-based system can be guaranteed to be completely secure."),
      ],
    },
    {
      title: "8. Data Retention",
      blocks: [
        p(
          "We retain personal information only for as long as reasonably necessary for the purposes described in this Privacy Policy, including order fulfilment, customer support, business records, legal obligations, dispute resolution, and legitimate business requirements.",
        ),
        p(
          "The applicable retention period may vary depending on the type of information and the purpose for which it was collected.",
        ),
      ],
    },
    {
      title: "9. Your Choices",
      blocks: [
        p("You may contact us to:"),
        ul([
          "Ask about personal information associated with your interactions with AB Collection",
          "Request correction of inaccurate information",
          "Request cessation of marketing communications",
          "Raise questions regarding our handling of your personal information",
        ]),
        p(
          "Requests will be handled subject to applicable law and legitimate business, legal, and record-keeping requirements.",
        ),
      ],
    },
    {
      title: "10. Children's Privacy",
      blocks: [
        p(
          "Our website and products are intended for general consumers and are not specifically directed toward children.",
        ),
        p(
          "We do not knowingly seek to collect personal information from children for purposes unrelated to providing our services.",
        ),
      ],
    },
    {
      title: "11. Third-Party Websites",
      blocks: [
        p("Our website may contain links or integrations to third-party websites and services."),
        p(
          "AB Collection is not responsible for the privacy practices or content of third-party websites.",
        ),
        p("We recommend reviewing their privacy policies before providing personal information."),
      ],
    },
    {
      title: "12. Changes to This Privacy Policy",
      blocks: [
        p("We may update this Privacy Policy from time to time."),
        p('Any updated version will be published on this page with a revised "Last Updated" date.'),
      ],
    },
  ],
};

export const SHIPPING_DOCUMENT: LegalDocument = {
  slug: "shipping",
  title: "Shipping & Delivery Policy",
  description: "How AB Collection processes, dispatches, and delivers orders across India.",
  lastUpdated: LEGAL_LAST_UPDATED,
  intro: [
    "At AB Collection, we aim to make your delivery experience simple, reliable, and transparent.",
    "This Shipping & Delivery Policy explains how orders are processed, dispatched, and delivered.",
  ],
  sections: [
    {
      title: "1. Delivery Coverage",
      blocks: [
        p("AB Collection currently ships orders to serviceable locations across India."),
        p(
          "Delivery availability may depend on the serviceability of the customer's complete delivery address.",
        ),
      ],
    },
    {
      title: "2. Order Processing Time",
      blocks: [
        p(
          "After an order is successfully confirmed, we generally aim to process and prepare it for dispatch within 2–3 business days.",
        ),
        p("Business days generally exclude Sundays and public holidays."),
        p(
          "During product launches, promotional periods, unusually high order volumes, or other operational circumstances, processing may take longer.",
        ),
        p(
          "If there is a significant delay, we will make reasonable efforts to communicate the relevant update.",
        ),
      ],
    },
    {
      title: "3. Delivery Timeline",
      blocks: [
        p(
          "After dispatch, orders are generally expected to reach the customer within 5–7 business days.",
        ),
        p("Delivery time may vary depending on:"),
        ul([
          "Delivery location",
          "Courier availability",
          "Weather",
          "Public holidays",
          "Remote or difficult-to-service locations",
          "Transportation disruptions",
          "Operational delays",
          "Other circumstances beyond AB Collection's reasonable control",
        ]),
        p("The stated delivery timeline is an estimate and not a guaranteed delivery date."),
      ],
    },
    {
      title: "4. Dispatch Confirmation",
      blocks: [
        p(
          "Once your order has been dispatched, we may provide shipment or tracking information through the contact details associated with your order, where tracking is available.",
        ),
        p(
          "Customers should use the tracking information, where provided, to monitor the progress of their shipment.",
        ),
      ],
    },
    {
      title: "5. Incorrect Delivery Information",
      blocks: [
        p(
          "Customers are responsible for providing an accurate and complete delivery address and contact information.",
        ),
        p(
          "AB Collection is not responsible for delays, failed deliveries, or additional costs resulting from:",
        ),
        ul([
          "Incorrect address",
          "Incomplete address",
          "Incorrect phone number",
          "Customer being unavailable to receive the shipment",
          "Refusal to accept the shipment",
          "Other information incorrectly provided by the customer",
        ]),
        p(
          "If a shipment is returned to AB Collection because of incorrect or incomplete information provided by the customer, additional shipping charges may apply if re-dispatch is requested.",
        ),
      ],
    },
    {
      title: "6. Delayed Deliveries",
      blocks: [
        p("While we aim to meet our estimated timelines, courier and logistics delays can occur."),
        p(
          "AB Collection is not responsible for delays caused by events outside our reasonable control, including:",
        ),
        ul([
          "Extreme weather",
          "Natural disasters",
          "Public emergencies",
          "Strikes",
          "Transportation disruptions",
          "Government restrictions",
          "Courier network issues",
          "Other unforeseen logistical circumstances",
        ]),
      ],
    },
    {
      title: "7. Damaged Packages",
      blocks: [
        p(
          "If your package appears visibly damaged at the time of delivery, please contact AB Collection as soon as reasonably possible.",
        ),
        p(
          "Where appropriate, customers may be asked to provide photographs or videos of the package and product to help us investigate the issue.",
        ),
      ],
    },
    {
      title: "8. Delivery Issues",
      blocks: [
        p(
          "If you believe your order has been delivered incorrectly, has not arrived within a reasonable period after dispatch, or contains a delivery-related issue, contact us at abcollection.co.in@gmail.com or +91 7489346362.",
        ),
        p("Please include your order details so that we can investigate the issue efficiently."),
      ],
    },
    {
      title: "9. Shipping Charges",
      blocks: [
        p(
          "Applicable shipping charges, if any, will be communicated to the customer during the ordering process before the order is completed.",
        ),
        p(
          "AB Collection reserves the right to offer free shipping, promotional shipping, or location-specific shipping offers from time to time.",
        ),
      ],
    },
  ],
};

export const RETURNS_DOCUMENT: LegalDocument = {
  slug: "returns",
  title: "Refund, Return & Cancellation Policy",
  description:
    "AB Collection's policy on refunds, eligible exchanges, returns, and order cancellations.",
  lastUpdated: LEGAL_LAST_UPDATED,
  intro: [
    "At AB Collection, we want you to receive your order in the condition and specification you selected.",
    "Because of the nature of our products and our current business model, we operate a limited exchange policy.",
    "Please read this policy carefully before placing an order.",
  ],
  sections: [
    {
      title: "1. Refunds",
      blocks: [
        p("AB Collection does not offer refunds."),
        p("We do not provide refunds for:"),
        ul([
          "Change of mind",
          "Incorrect size selected by the customer",
          "Colour preference",
          "Ordering the wrong product",
          "Personal preference regarding fit or appearance",
          "Any other reason not caused by a defect or mistake by AB Collection",
        ]),
        p(
          "Once an order has been successfully delivered, the customer cannot request a refund under this policy.",
        ),
      ],
    },
    {
      title: "2. Exchanges",
      blocks: [
        p("An exchange may be provided only where:"),
        ul([
          "The product has a genuine manufacturing or product defect; or",
          "AB Collection has sent an incorrect product, size, colour, or other item compared with the confirmed order.",
        ]),
        p(
          "Exchanges are not provided merely because a customer changes their mind or no longer wants the product.",
        ),
      ],
    },
    {
      title: "3. Exchange Window",
      blocks: [
        p("Eligible issues must be reported within 2 days of delivery."),
        p(
          "The customer must contact AB Collection within this period to initiate an exchange request.",
        ),
        p("Requests submitted after the 2-day window may not be accepted."),
      ],
    },
    {
      title: "4. Product Eligibility",
      blocks: [
        p("For an exchange request, the product should, wherever applicable:"),
        ul([
          "Be unused",
          "Be unworn",
          "Be unwashed",
          "Not have been altered",
          "Have its original tags attached",
          "Be in its original condition",
          "Include original packaging where reasonably available",
        ]),
        p(
          "AB Collection may reject an exchange where inspection indicates that the issue was caused by customer use, washing, alteration, misuse, negligence, or normal wear and tear.",
        ),
      ],
    },
    {
      title: "5. Defective Products",
      blocks: [
        p(
          "If you receive a product that appears to have a genuine manufacturing defect, contact us within 2 days of delivery.",
        ),
        p(
          "We may request photographs, videos, order details, or other information to assess the issue.",
        ),
        p(
          "If the issue is confirmed to be a manufacturing defect, AB Collection will arrange an eligible exchange, subject to product availability.",
        ),
      ],
    },
    {
      title: "6. Wrong Product, Size or Colour",
      blocks: [
        p(
          "If AB Collection sends an item that differs from the confirmed order, please contact us within 2 days of delivery.",
        ),
        p(
          "After verification, we will arrange an eligible exchange where the correct item is available.",
        ),
      ],
    },
    {
      title: "7. Return Shipping for Eligible Exchanges",
      blocks: [
        p(
          "Where the exchange is required because of a confirmed defect or mistake by AB Collection, AB Collection will bear the applicable return shipping cost.",
        ),
        p(
          "Customers should not independently ship the product back without first contacting us and receiving instructions from AB Collection.",
        ),
      ],
    },
    {
      title: "8. Customer-Initiated Returns",
      blocks: [
        p("We do not accept returns or exchanges for:"),
        ul([
          "Change of mind",
          "Incorrect size selection",
          "Incorrect colour selection",
          "Personal preference",
          "Product looking different from how the customer expected",
          "Failure to check the size information before ordering",
        ]),
        p(
          "Customers are encouraged to review the product details and size information carefully before placing an order.",
        ),
      ],
    },
    {
      title: "9. Exchange Availability",
      blocks: [
        p(
          "An exchange is subject to availability of the required replacement product, size, or colour.",
        ),
        p(
          "If the exact replacement is unavailable, AB Collection will communicate the available options.",
        ),
        p("No cash refund will be provided in place of an exchange."),
      ],
    },
    {
      title: "10. Order Cancellation",
      blocks: [
        p("Cancellation requests should be made as early as possible after placing an order."),
        p(
          "If an order has not yet been processed or dispatched, AB Collection may, at its discretion, accept a cancellation request.",
        ),
        p(
          "Once an order has been processed or dispatched, cancellation may no longer be possible.",
        ),
        p(
          "Because AB Collection does not offer refunds under this policy, customers should contact us before placing an order if they have questions regarding products, sizing, colours, or availability.",
        ),
      ],
    },
    {
      title: "11. How to Request an Exchange",
      blocks: [
        p(
          "To request an eligible exchange, contact abcollection.co.in@gmail.com or +91 7489346362.",
        ),
        p("Please provide:"),
        ul([
          "Order number",
          "Customer name",
          "Contact number",
          "Description of the issue",
          "Photographs/videos where requested",
        ]),
        p("Our team will review the request and communicate the next steps."),
      ],
    },
    {
      title: "12. Policy Changes",
      blocks: [
        p("AB Collection may update this policy from time to time."),
        p('Any updated policy will be published on this page with a revised "Last Updated" date.'),
      ],
    },
  ],
};

export const PRICING_DOCUMENT: LegalDocument = {
  slug: "pricing",
  title: "Pricing & Tax Information",
  description: "How AB Collection displays product prices, GST status, and promotional pricing.",
  lastUpdated: LEGAL_LAST_UPDATED,
  intro: [
    "This page explains how product prices and applicable taxes are presented by AB Collection.",
  ],
  sections: [
    {
      title: "1. Product Prices",
      blocks: [
        p(
          "All product prices displayed on the AB Collection website are stated in Indian Rupees (INR).",
        ),
        p(
          "The product price displayed on the website represents the price payable for the product unless additional charges are clearly disclosed during checkout.",
        ),
      ],
    },
    {
      title: "2. GST Status",
      blocks: [
        p(
          "AB Collection is currently not registered under the Goods and Services Tax (GST) system.",
        ),
        p(
          "Accordingly, AB Collection does not separately charge or collect GST from customers at present.",
        ),
        p("We do not represent any portion of the product price as GST."),
        p("Because we are currently unregistered, we do not issue GST tax invoices."),
      ],
    },
    {
      title: "3. No Separate GST Charge",
      blocks: [
        p(
          "Customers should not expect a separate GST amount to be added to the product price at checkout at this time.",
        ),
        p(
          "The price communicated by AB Collection is the applicable selling price for the product, subject to any separately disclosed shipping or other applicable charges.",
        ),
      ],
    },
    {
      title: "4. Future GST Registration",
      blocks: [
        p(
          "If AB Collection becomes registered under GST in the future, our pricing and tax presentation may change.",
        ),
        p(
          "Where applicable, we will update this page and the website's pricing information to reflect the relevant tax requirements.",
        ),
        p(
          "Any GST charged after registration will be disclosed to customers in accordance with applicable law.",
        ),
      ],
    },
    {
      title: "5. Price Changes",
      blocks: [
        p("AB Collection reserves the right to change product prices at any time."),
        p("Price changes may occur because of factors including:"),
        ul([
          "Manufacturing costs",
          "Fabric costs",
          "Packaging costs",
          "Logistics costs",
          "Promotional campaigns",
          "Product launches",
          "Business operating costs",
        ]),
        p(
          "A price change will not alter the price of an order that has already been confirmed, unless required by law or due to an obvious technical or pricing error.",
        ),
      ],
    },
    {
      title: "6. Pricing Errors",
      blocks: [
        p(
          "Although we make reasonable efforts to maintain accurate pricing information, technical or human errors may occasionally occur.",
        ),
        p(
          "If a product is displayed at an obviously incorrect price due to a technical or system error, AB Collection reserves the right to cancel the affected order and communicate the issue to the customer.",
        ),
        p(
          "Where payment has already been received for an order cancelled due to such an error, the applicable amount paid will be handled appropriately.",
        ),
      ],
    },
    {
      title: "7. Promotional Pricing",
      blocks: [
        p(
          "From time to time, AB Collection may offer promotional pricing, launch offers, discounts, or other benefits.",
        ),
        p(
          "Promotional offers may be subject to specific terms, eligibility requirements, validity periods, product exclusions, or availability restrictions.",
        ),
        p("Unless specifically stated otherwise, promotional offers cannot be combined."),
      ],
    },
    {
      title: "8. Shipping Charges",
      blocks: [
        p(
          "Shipping charges, if applicable, will be disclosed to the customer before the order is completed.",
        ),
        p(
          "Any promotional free-shipping offer will be subject to the terms communicated with that offer.",
        ),
      ],
    },
  ],
};
