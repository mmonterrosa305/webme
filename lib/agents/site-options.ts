export const INDUSTRIES = [
  "Plumbing",
  "HVAC",
  "Restaurant",
  "Salon",
  "Dental",
  "Law",
  "Landscaping",
  "Cleaning",
  "Auto Repair",
  "Construction",
  "Real Estate",
  "Other",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export const COLOR_PALETTES = [
  {
    id: "midnight",
    name: "Midnight",
    description: "Dark navy + white",
    primary: "#0f172a",
    secondary: "#ffffff",
    accent: "#94a3b8",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Blue + teal",
    primary: "#0369a1",
    secondary: "#0d9488",
    accent: "#e0f2fe",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Dark green + cream",
    primary: "#14532d",
    secondary: "#fef3c7",
    accent: "#4ade80",
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm orange + deep red",
    primary: "#ea580c",
    secondary: "#7f1d1d",
    accent: "#fed7aa",
  },
  {
    id: "monochrome",
    name: "Monochrome",
    description: "Black + grey + white",
    primary: "#171717",
    secondary: "#737373",
    accent: "#ffffff",
  },
  {
    id: "lavender",
    name: "Lavender",
    description: "Purple + soft pink",
    primary: "#6b21a8",
    secondary: "#fbcfe8",
    accent: "#e9d5ff",
  },
  {
    id: "earth",
    name: "Earth",
    description: "Brown + terracotta + beige",
    primary: "#78350f",
    secondary: "#c2410c",
    accent: "#f5f5dc",
  },
  {
    id: "neon",
    name: "Neon",
    description: "Electric blue + neon green + dark",
    primary: "#0ea5e9",
    secondary: "#22c55e",
    accent: "#0f172a",
  },
] as const;

export type PaletteId = (typeof COLOR_PALETTES)[number]["id"];

export const DESIGN_STYLES = [
  {
    id: "modern-minimal",
    label: "Modern & Minimal",
    description: "Clean lines, generous whitespace, refined typography",
  },
  {
    id: "bold-dynamic",
    label: "Bold & Dynamic",
    description: "Strong contrast, energetic layouts, impactful headlines",
  },
  {
    id: "elegant-luxury",
    label: "Elegant & Luxury",
    description: "Premium feel, serif accents, sophisticated spacing",
  },
  {
    id: "friendly-approachable",
    label: "Friendly & Approachable",
    description: "Warm, welcoming, rounded shapes, conversational copy",
  },
] as const;

export type StyleId = (typeof DESIGN_STYLES)[number]["id"];

export const SITE_SECTIONS = [
  { id: "hero", label: "Hero" },
  { id: "about", label: "About" },
  { id: "services", label: "Services" },
  { id: "testimonials", label: "Testimonials" },
  { id: "gallery", label: "Gallery" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact" },
  { id: "map", label: "Map" },
] as const;

export type SectionId = (typeof SITE_SECTIONS)[number]["id"];

export const DEFAULT_SECTIONS: SectionId[] = [
  "hero",
  "about",
  "services",
  "contact",
];
