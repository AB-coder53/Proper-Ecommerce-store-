import type { PrivilegeTestimonial, ValuePillar } from "@/lib/privilege/types";

export const ASSETS = {
  crestLight:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBhHkZnCACMr_5z6r5yrzTb4pav0EMixc-nAk5ZaB7KGjEpkL5I8U90M7ocn9QkmM19CoPPosKPFLFyHPD84fLr_81nbAxj4G3SqJLU3mtHRA98G8CJkq7KkAZofVi14XNbaFNP_V41ap59f0pnGX-dTOXX_tZoe_E2Fiah4UAI-0lW9SwzrfuOd3rwnRfGX8gqa169SMyOlMvGtFvVpwJYx62R2d4pLIf1DVXn-p0JfGca4EArFM3zysOE0A-JHxp2n8U",
  crestDark:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCK-Xfy4d294uRob4pSFqH794sM8ehCJu7j-l2k31sLDBR9b5eLlD6G-vJeLu_ly2qA8KZZQVWUrL_rvJI09CxxK7AfPHMPCXLC5lIUZ-MwXSVYPDXWY5F7nbDQqAkFHH3_vBXqeKe_VjzDyQLhbg-n9YVD60rQeFKSJRrNVv0_VpBs4k98uJ8R97ctTNEVGIOoA3J3QULGSidqJRz_q8kNHAD8yXOqDtZP2SHqocblTplSFg5WsJ5TgbXPV3vHxqVM9LQ",
  profile:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAif9eiWOMHOFia51g1XjtAuUWvI47zWscEHurZiiy2rBvgNh5SFAIbMqlEMbsEZjwFQkImjhbnw7XF85BqTW6T4QPYzGivzaJyHJ6JjkppB8vcOSQtcgBRVSpfm5jUFKPZ4WUc4y2ikk8LZnP2iAKRivSsWiLNWleD5s9pR9KtMXt8LcVB03iNngPzT70xigkjSVTTgRIMsCC7HWi3pJdSBOep0wimHGTOlx9qyA-kJtmDdH3m8HzYzF8bPv4WTEc8Jnc",
  founder:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCNrE0oOfDXh26o8JQShb6mDwH06J44FwEtCVgLz6OlXjUfsVIMRm07zJFTx3SkMpPcqXPicyhy8Qs-iy7oWHATP6KOcpAg3oy_mmm4-ClPIDNzICqeTf9prNKFP8vPZZ3wk591z5LLd-24EaSTjx1Iazfq8AMP6cUk6wHlnQcur74oSzjZHNFZThZo8xdrh6W5GX0JfbKIC7VibVcOms0GzuCox3ohUe0LsKTeWkA-A9IRwC4lorCqRj5IVdSSsKC05WE",
};

export {
  ISTEFADA_DISCOUNT_INR as DISCOUNT_AMOUNT,
  ISTEFADA_PROMO_CODE as PROMO_CODE,
  ISTEFADA_SOURCE,
} from "@/lib/istefada-offer";

export const VALUE_PILLARS: ValuePillar[] = [
  {
    index: "01",
    category: "TEXTILE ARCHITECTURE",
    title: "QUALITY-FIRST FABRICS",
    description:
      "Heavyweight 240+ GSM custom-spun combed cottons designed to retain structural drape after dozens of washes.",
    iconName: "texture",
  },
  {
    index: "02",
    category: "ERGONOMIC TAILORING",
    title: "MADE TO BE WORN",
    description:
      "Relaxed silhouettes engineered specifically for genuine daily movement, heat management, and zero collar deformation.",
    iconName: "straighten",
  },
  {
    index: "03",
    category: "BESPOKE TOUCH",
    title: "ATTENTION TO DETAIL",
    description:
      "From double-needle hem reinforcement to custom tactile zip unboxing, every order is treated as a personal commission.",
    iconName: "inventory",
  },
];

export const TESTIMONIALS: PrivilegeTestimonial[] = [
  {
    id: "t-1",
    initials: "MD",
    name: "Malik Darbar",
    location: "Verified Buyer • Ujjain",
    rating: 5,
    paragraphs: [
      "I really Like The Quality Of T-shirt\nThe material and Comfort is Too Good 😍\nAnd also The packaging and the letter Uh Wrote is genuinely is So Nice\nI really want to order more...",
    ],
    orderedItem: "THE REGULAR FIT — BLACK & WHITE",
  },
  {
    id: "t-2",
    initials: "HM",
    name: "Husain Munim",
    location: "Verified Buyer • Kuwait, UAE",
    rating: 5,
    paragraphs: [
      "Happy customer,\nThanks a lot for personal note.",
      "Wish u best of luck and fitting is perfect.\nI'll be referring and promoting it to my friends & family",
    ],
    orderedItem: "LAVA-SPRAYED ACID WASH — GREY",
  },
  {
    id: "t-3",
    initials: "HK",
    name: "Hakimuddin Kankroliwala",
    location: "Verified Buyer • Indore",
    rating: 5,
    paragraphs: [
      "Bro, got the t-shirt and I really liked it. The quality is actually pretty good and the fabric feels comfortable. Fitting bhi sahi hai and the colour looks really nice.",
      "Honestly, didn’t expect it to be this good 😂. Really happy for you bro, seeing you start something of your own after knowing you since childhood feels really good. Keep it up ❤️",
    ],
    orderedItem: "LAVA-SPRAYED ACID WASH — GREY",
  },
];
