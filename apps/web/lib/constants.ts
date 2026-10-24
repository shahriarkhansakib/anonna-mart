export const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

export const CLOUDINARY_FALLBACK = {
  defaultProduct:
    "https://res.cloudinary.com/dgmcwmwof/image/upload/v1792836752/anonna-mart/catalog/homedecor.jpg",
  footerLeaves:
    "https://res.cloudinary.com/dgmcwmwof/image/upload/v1792836750/anonna-mart/catalog/footer-leaves.jpg",
  specialOfferBanner:
    "https://res.cloudinary.com/dgmcwmwof/image/upload/v1792836766/anonna-mart/catalog/WhatsApp_Image_2026-10-08_at_3_36_13_PM__1_.jpg",
  authHero:
    "https://res.cloudinary.com/dgmcwmwof/image/upload/v1792846437/anonna-mart/catalog/auth-hero.jpg",
  mascot:
    "https://res.cloudinary.com/dgmcwmwof/image/upload/v1792846446/anonna-mart/catalog/growmate-mascot.png",
  heroLifestyle:
    "https://res.cloudinary.com/dgmcwmwof/image/upload/v1792846448/anonna-mart/catalog/hero-lifestyle.jpg",
  categories: {
    "Home Decor":
      "https://res.cloudinary.com/dgmcwmwof/image/upload/v1792836752/anonna-mart/catalog/homedecor.jpg",
    Crockeries:
      "https://res.cloudinary.com/dgmcwmwof/image/upload/v1792836748/anonna-mart/catalog/crockeries.jpg",
    "Women Dresses":
      "https://res.cloudinary.com/dgmcwmwof/image/upload/v1792836749/anonna-mart/catalog/dress.jpg",
    "Grocery Items":
      "https://res.cloudinary.com/dgmcwmwof/image/upload/v1792836751/anonna-mart/catalog/grocery.jpg",
    Toiletries:
      "https://res.cloudinary.com/dgmcwmwof/image/upload/v1792836762/anonna-mart/catalog/toiletries.jpg",
  } as Record<string, string>,
};
