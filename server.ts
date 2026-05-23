import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory / file persisted database for comments & pins
const COMMENTS_FILE = path.join(process.cwd(), "comments-db.json");

interface CommentPin {
  id: string;
  designId: string;
  userName: string;
  text: string;
  x: number;
  y: number;
  createdAt: string;
}

// Initial seed comments representing Module 5 specification (Julianne V. commenting on Victorian Noir)
const defaultComments: CommentPin[] = [
  {
    id: "c-1",
    designId: "preset-victorian-noir",
    userName: "Julianne V. (VisionSpace Pro)",
    text: "This gothic ambiance is absolutely mesmerizing! The deep charcoal textures really make the ceiling heights pop. Let's source velvet drapery here.",
    x: 48,
    y: 68,
    createdAt: new Date(Date.now() - 3600000 * 2.5).toISOString() // 2.5 hours ago
  },
  {
    id: "c-2",
    designId: "preset-japandi",
    userName: "Aris T. (Architect)",
    text: "Keep the cedar planks untreated to let the natural aromatherapy settle. The scale works beautifully next to the tatami flooring.",
    x: 65,
    y: 40,
    createdAt: new Date(Date.now() - 3600000 * 1.1).toISOString()
  }
];

function loadComments(): CommentPin[] {
  try {
    if (fs.existsSync(COMMENTS_FILE)) {
      const data = fs.readFileSync(COMMENTS_FILE, "utf-8");
      return JSON.parse(data);
    } else {
      fs.writeFileSync(COMMENTS_FILE, JSON.stringify(defaultComments, null, 2));
      return defaultComments;
    }
  } catch (error) {
    console.error("Failed to read comments, using default", error);
    return defaultComments;
  }
}

function saveComments(comments: CommentPin[]) {
  try {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2));
  } catch (error) {
    console.error("Failed to write comments", error);
  }
}

// Ensure database file exist
loadComments();

// Preset high-fidelity design data for fallbacks or specific preset queries
const presetDesigns = {
  Japandi: {
    name: "Ethereal Zen Sanctuary",
    tagline: "Harmonious wood and stone pairings for mental clarity.",
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
    description: "A serene blending of Japanese minimalism and Scandinavian warmth. The space emphasizes clean architectural lines, open voids, and natural untreated organic textures. Gentle indirect lighting wraps around local cedar posts, while soft acoustic linens bring tranquility to the main seating volume.",
    materials: ["Cedar Wood Plank", "Himalayan Raw Slate", "Unbleached Soft Linen"],
    hotspots: [
      { id: "hs-1", x: 45, y: 55, name: "Sled Base Cedar Coffee Table", description: "Minimal low-slung table crafted from sustainably-sourced solid cedar planks. Soft oiled natural finish.", brand: "DWR Premium", basePrice: 450, shopLink: "https://www.dwr.com" },
      { id: "hs-2", x: 30, y: 35, name: "Raw Himalayan Slate Wall Cladding", description: "Exquisite hand-split black slate panels, optimizing acoustic isolation and deep mineral accent tones.", brand: "Artisan Tile Co", basePrice: 1200, shopLink: "https://www.restorationhardware.com" },
      { id: "hs-3", x: 70, y: 65, name: "Oatmeal Belgian Linen Sectional", description: "Feather-filled deep lounge sofa layered in durable hand-woven organic yarns.", brand: "West Elm Studio", basePrice: 2200, shopLink: "https://www.westelm.com" }
    ],
    costing: [
      { category: "Product", name: "Sled Base Cedar Coffee Table", qty: 1, basePrice: 450, brand: "West Elm / DWR" },
      { category: "Product", name: "Oatmeal Belgian Linen Sectional", qty: 1, basePrice: 2200, brand: "DWR / Restoration" },
      { category: "Material", name: "Raw Himalayan Slate Panel Cladding", qty: 120, basePrice: 10, brand: "Artisan Custom" },
      { category: "Material", name: "Organic Wool Flatweave Area Rug", qty: 1, basePrice: 750, brand: "Lulu & Georgia" },
      { category: "Labor", name: "Specialized Stone Laying & Alignment", qty: 16, basePrice: 65, brand: "" },
      { category: "Labor", name: "Acoustic Soft Wall Prep & Fine Finishing", qty: 8, basePrice: 50, brand: "" }
    ]
  },
  "Gothic Noir": {
    name: "Nocturnal Muse Elegance",
    tagline: "Mysterious dark Victorian contrast with premium leather accents.",
    image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    description: "Deep noir wood finishes pair with high-shadow textiles for an intimate dramatic study. Arched windows framed by heavy blackout velvets balance structural brass details. Perfect as a high-focus library, lounge, or premium creative music studio.",
    materials: ["Charred Ash Wood", "Nero Marquina Marble", "Luxe Vintage Velvet"],
    hotspots: [
      { id: "hs-1", x: 38, y: 48, name: "Nero Marquina Plinth Coffee Console", description: "Hollow cuboid console cut entirely from deep Spanish black marble with distinct calcite veins.", brand: "Restoration Hardware", basePrice: 1850, shopLink: "https://www.restorationhardware.com" },
      { id: "hs-2", x: 50, y: 72, name: "Tufted Vintage Obsidian Velvet Daybed", description: "Gothic tufting on hand-carved kiln-dried hardwood legs. Exceptionally plush seating index.", brand: "Custom Atelier", basePrice: 3200, shopLink: "https://www.dwr.com" },
      { id: "hs-3", x: 80, y: 30, name: "Brushed Brass Sconce Lamp Set", description: "Dimmable warm glow fixture, housing classic amber filaments for atmospheric low light.", brand: "Schoolhouse Electric", basePrice: 350, shopLink: "https://www.schoolhouse.com" }
    ],
    costing: [
      { category: "Product", name: "Nero Marquina Plinth Console", qty: 1, basePrice: 1850, brand: "Restoration Hardware" },
      { category: "Product", name: "Tufted Vintage Obsidian Daybed", qty: 1, basePrice: 3200, brand: "Custom Atelier" },
      { category: "Material", name: "Charred Ash Timber Molding Frame", qty: 60, basePrice: 20, brand: "Custom Profile" },
      { category: "Material", name: "Luxe Vintage Velvet Drapes", qty: 4, basePrice: 300, brand: "The Shade Store" },
      { category: "Labor", name: "Intricate Wood Molding Carpentry", qty: 24, basePrice: 75, brand: "" },
      { category: "Labor", name: "Deep Satin Wall Airless Spray Paint", qty: 12, basePrice: 55, brand: "" }
    ]
  },
  Minimalist: {
    name: "Organic Flow Pavilion",
    tagline: "Fluid architectural volumes, soft linens, and sculpted lighting.",
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
    description: "An airy modernist expanse utilizing smooth structural microcement and curving drywall alcoves. Light bounces deeply off of textured white finishes to optimize spaciousness and a warm, weightless psychological vibe.",
    materials: ["Sanded Pure Microcement", "Scorched Light Travertine", "Bouclé Ribbed Textile"],
    hotspots: [
      { id: "hs-1", x: 48, y: 62, name: "Sculptural Bouclé Contour Armchair", description: "Fluid organic curved chair upholstered in cozy, heavily textured off-white wool loops.", brand: "B&B Italia", basePrice: 2400, shopLink: "https://www.bebitalia.com" },
      { id: "hs-2", x: 25, y: 55, name: "Brushed Travertine Column Pedestal", description: "Porous light travertine block table adding structural solidity to curved corners.", brand: "Crate & Barrel", basePrice: 650, shopLink: "https://www.crateandbarrel.com" },
      { id: "hs-3", x: 50, y: 30, name: "Recessed Overhead Warm Light Halo", description: "Seamless gypsum drywall channel housing continuous architectural dim-to-warm LED strips.", brand: "Lutron Architectural", basePrice: 850, shopLink: "https://www.lutron.com" }
    ],
    costing: [
      { category: "Product", name: "Sculptural Bouclé Contour Armchair", qty: 2, basePrice: 2400, brand: "B&B Italia Custom" },
      { category: "Product", name: "Brushed Travertine Column Pedestal", qty: 1, basePrice: 650, brand: "Crate & Barrel" },
      { category: "Material", name: "Sanded Light Pre-mix Microcement", qty: 15, basePrice: 85, brand: "Kerapoxy" },
      { category: "Material", name: "Textured Ribbed Wall Panels", qty: 10, basePrice: 120, brand: "Muralto" },
      { category: "Labor", name: "Seamless Microcement Plastering", qty: 32, basePrice: 70, brand: "" },
      { category: "Labor", name: "Curved Drywall Gypsum Framework", qty: 16, basePrice: 65, brand: "" }
    ]
  }
};

// API routes first
app.get("/api/comments/:designId", (req, res) => {
  const { designId } = req.params;
  const comments = loadComments();
  const filtered = comments.filter((c) => c.designId === designId);
  res.json(filtered);
});

app.post("/api/comments/:designId", (req, res) => {
  const { designId } = req.params;
  const { text, x, y, userName } = req.body;

  if (!text || typeof x !== "number" || typeof y !== "number") {
    return res.status(400).json({ error: "Missing required pin parameters (text, x, y)" });
  }

  const comments = loadComments();
  const newComment: CommentPin = {
    id: "comment-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    designId,
    userName: userName || "Julianne V. (VisionSpace Pro)",
    text,
    x,
    y,
    createdAt: new Date().toISOString()
  };

  comments.push(newComment);
  saveComments(comments);

  // Return the full sublist for this design
  res.json(comments.filter((c) => c.designId === designId));
});

// Primary generation API calling Gemini 3.5-flash or falling back elegantly
app.post("/api/generate", async (req, res) => {
  const {
    prompt,
    aesthetic,
    wood, // slider: 0-100
    stone, // slider: 0-100
    textile, // slider: 0-100
    mood, // "Bright" | "Moody"
    energy, // "Zen" | "High Energy"
  } = req.body;

  console.log("Generating with params:", req.body);

  const key = process.env.GEMINI_API_KEY;
  if (!key || key.includes("MY_GEMINI_API_KEY")) {
    console.log("No valid GEMINI_API_KEY detected, initiating high-fidelity fallbacks.");
    const customOptions = generateAuraDesignOptions({
      prompt: prompt || "",
      aesthetic: aesthetic || "Japandi",
      wood: Number(wood ?? 50),
      stone: Number(stone ?? 50),
      textile: Number(textile ?? 50),
      mood: mood || "Bright",
      energy: energy || "Zen"
    });
    return res.json({ options: customOptions, mode: "aesthetic-simulation" });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // We build a system instruction requesting specific structural schema
    const promptMessage = `
    Generate 3 distinct styled interior design variations (Option 1, Option 2, Option 3) based on the user's requirements:
    - User input text prompt: "${prompt || 'Vacant open room ready for architectural layout'}"
    - Selected primary aesthetic starting preset: "${aesthetic || 'Japandi'}"
    - Tweaked Material Composition ratios: Wood Focus: ${wood}%, Stone/Mineral Focus: ${stone}%, Textile/Softness: ${textile}%
    - Light/Vibe constraints: "${mood || 'Bright'}" mood and "${energy || 'Zen'}" energy level.

    Return the result strictly as a valid JSON object matching this schema. Ensure you generate 3 options.
    Each option must have:
    - name: descriptive, high-end design name (such as "Ethereal Cedar Sanctuary", "Slate & Oak Monolith", "Textured Satin Pavilion").
    - tagline: catchy 1-line description.
    - image: a high quality Unsplash interior design image matching the aesthetic. Please select the most appropriate from:
      * Standard Japandi: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80'
      * Noir/Gothic/Moody: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80'
      * Curving/Modern Minimalist: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80'
      * Loft/Warehouse Brick/Industrial: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80'
      * Mid-Century Walnut: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80'
    - description: A detailed architectural 2-sentence description highlighting the spatial feeling, material tactile quality, and emotional layout logic.
    - materials: array of exactly 3 primary physical finishes (e.g. ["Hand-finished Oak Planks", "Raw Travertine Wall Tiles", "Eco-friendly Linen").
    - hotspots: array of exactly 3 interactive hotspot objects representing items. Each hotspot contains:
         * id: "hs-" + unique number
         * x: value from 15 to 85 (representing horizontal location on image)
         * y: value from 20 to 80 (representing vertical location on image)
         * name: product item title (e.g., "Arched Travertine Sideboard", "Hand-oiled Cedar Dining Table")
         * description: specifications like materials, finish, and dimensions.
         * brand: Premium level brand (e.g. "DWR Premium", "Restoration Hardware Custom", "West Elm Studio")
         * basePrice: realistic base price in USD (numeric, e.g. 1200)
         * shopLink: manufacturer domain link (e.g. "https://www.dwr.com")
    - costing: array of at least 5 line items that make up the cost. Columns category ("Product", "Material", or "Labor"), name, qty, basePrice, brand.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptMessage,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  tagline: { type: Type.STRING },
                  image: { type: Type.STRING },
                  description: { type: Type.STRING },
                  materials: { type: Type.ARRAY, items: { type: Type.STRING } },
                  hotspots: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        x: { type: Type.INTEGER },
                        y: { type: Type.INTEGER },
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        brand: { type: Type.STRING },
                        basePrice: { type: Type.NUMBER },
                        shopLink: { type: Type.STRING }
                      },
                      required: ["id", "x", "y", "name", "description", "brand", "basePrice", "shopLink"]
                    }
                  },
                  costing: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        category: { type: Type.STRING, description: "Must be exactly 'Product', 'Material', or 'Labor'" },
                        name: { type: Type.STRING },
                        qty: { type: Type.INTEGER },
                        basePrice: { type: Type.NUMBER },
                        brand: { type: Type.STRING }
                      },
                      required: ["category", "name", "qty", "basePrice"]
                    }
                  }
                },
                required: ["name", "tagline", "image", "description", "materials", "hotspots", "costing"]
              }
            }
          },
          required: ["options"]
        }
      }
    });

    const dataText = response.text || "";
    const parsed = JSON.parse(dataText.trim());

    if (parsed && Array.isArray(parsed.options) && parsed.options.length > 0) {
      // Clean options & ensure ID has option scope
      const finalized = parsed.options.map((opt: any, idx: number) => ({
        ...opt,
        id: `gen-opt-${Date.now()}-${idx + 1}`
      }));
      return res.json({ options: finalized, mode: "gemini-generated" });
    } else {
      throw new Error("Empty option list parsed from Gemini JSON");
    }
  } catch (error) {
    console.error("Gemini Generation failed. Initiating fallback procedural generation:", error);
    const customOptions = generateAuraDesignOptions({
      prompt: prompt || "",
      aesthetic: aesthetic || "Japandi",
      wood: Number(wood ?? 50),
      stone: Number(stone ?? 50),
      textile: Number(textile ?? 50),
      mood: mood || "Bright",
      energy: energy || "Zen"
    });
    return res.json({ options: customOptions, mode: "fallback-simulation", error: (error as any).message });
  }
});

// Helper model simulator for generating beautiful variations dynamically based on sliders
function generateAuraDesignOptions(params: {
  prompt: string;
  aesthetic: string;
  wood: number;
  stone: number;
  textile: number;
  mood: string;
  energy: string;
}) {
  const { prompt, aesthetic, wood, stone, textile, mood, energy } = params;

  // Decide Unsplash images based on dynamic aesthetic selection
  let baseImages = [
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80"
  ];

  if (aesthetic === "Industrial") {
    baseImages = [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80", // Industrial lounge
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80"
    ];
  } else if (aesthetic === "Minimalist") {
    baseImages = [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80"
    ];
  } else if (aesthetic === "Mid-Century") {
    baseImages = [
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80", // walnut desk midcentury
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80"
    ];
  } else if (aesthetic === "Nordic") {
    baseImages = [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80"
    ];
  }

  // Generate 3 elegant options with varying weights on Materials!
  return [
    {
      id: "procedural-opt-1-" + Date.now(),
      name: `${aesthetic} Balanced Organic Flow`,
      tagline: `Warm natural ${wood > 60 ? "raw cedar" : "curated material"} framework tailored to ${energy.toLowerCase()} wellness.`,
      image: baseImages[0],
      description: `Expertly tailored to accentuate micro-details and acoustic dampening. Combining ${wood}% wood accents with a textured textile focus of ${textile}% creates an exceptionally relaxing environment where natural morning light cascades across key focus areas.`,
      materials: [wood > 50 ? "Treated Smoked Oak" : "Limed Pine Beams", stone > 50 ? "Honed Travertine slabs" : "Brushed Terrazzo Tiles", "Eco-friendly Textured Linen"],
      hotspots: [
        { id: "hs-custom-1", x: 42, y: 52, name: `${wood > 50 ? "Smoked Oak" : "Limed Cedar"} Statement Console`, description: "Sustainably crafted with beautiful dovetail joints, showcasing the exquisite premium nature of the wood finish.", brand: "VisionSpace Premium", basePrice: 1100, shopLink: "https://www.dwr.com" },
        { id: "hs-custom-2", x: 20, y: 40, name: `${stone > 50 ? "Travertine" : "Polished Microcement"} Side Table`, description: "Heavy block style cut with high-contrast porous cavities to provide brutalist architectural rhythm.", brand: "Restoration Hardware Custom", basePrice: 750, shopLink: "https://www.restorationhardware.com" },
        { id: "hs-custom-3", x: 72, y: 68, name: "Textured Ribbed Lounge Cushioning", description: "Feather filled modular seats layered in durable Belgian Bouclé and acoustic textile webbing.", brand: "West Elm Studio", basePrice: 1900, shopLink: "https://www.westelm.com" }
      ],
      costing: [
        { category: "Product", name: `${wood > 50 ? "Smoked Oak" : "Limed Cedar"} Statement Console`, qty: 1, basePrice: 1100, brand: "VisionSpace Premium" },
        { category: "Product", name: "Textured Ribbed Lounge Cushioning", qty: 1, basePrice: 1900, brand: "West Elm Studio" },
        { category: "Material", name: `${stone > 50 ? "Travertine" : "Polished Microcement"} Surface Dressing`, qty: 80, basePrice: 15, brand: "Italian Stone Sourcing" },
        { category: "Material", name: "Premium Wool Flatweave Acoustic Rug", qty: 1, basePrice: 800, brand: "Lulu & Georgia" },
        { category: "Labor", name: "Specialist Joinery Placement & Polishing", qty: 12, basePrice: 60, brand: "" },
        { category: "Labor", name: "Acoustic Wall Plastering & Prep", qty: 8, basePrice: 55, brand: "" }
      ]
    },
    {
      id: "procedural-opt-2-" + Date.now(),
      name: `${aesthetic} Mineral & Stone Monolith`,
      tagline: `Imposing structural focus emphasizing luxury ${stone > 60 ? "Himalayan Slate" : "textured quartz"} layers.`,
      image: baseImages[1],
      description: `A more dramatic interpretation emphasizing solid architectural footings. Heavily weighted with ${stone}% mineral features, the design integrates heavy stone surfaces offset by vintage velour drapes and high-shadow atmospheric spotlight mounts.`,
      materials: [stone > 50 ? "Matte Midnight Slate" : "Sanded Ivory Travertine", wood > 50 ? "Charred Walnut Plank" : "Ebonized Birch Frame", "Draped Silk-Velvet Blends"],
      hotspots: [
        { id: "hs-custom-2-1", x: 35, y: 45, name: `${stone > 50 ? "Midnight Slate" : "Ivory Travertine"} Monolithic Table`, description: "A gorgeous single-block structure with heavy raw margins offering an authentic terrestrial focus.", brand: "Atelier RH", basePrice: 1950, shopLink: "https://www.restorationhardware.com" },
        { id: "hs-custom-2-2", x: 55, y: 70, name: "Obsidian High-Shadow Ribbed Daybed", description: "Gothic-inspired tufted seating structure with deep matte-black wood support frameworks.", brand: "B&B Italia Custom", basePrice: 3400, shopLink: "https://www.bebitalia.com" },
        { id: "hs-custom-2-3", x: 82, y: 32, name: "Hand-Blown Smoked Glass Wall Sconces", description: "Minimalist lighting fixtures designed to focus soft lumens against structural stone columns.", brand: "Schoolhouse Design", basePrice: 420, shopLink: "https://www.schoolhouse.com" }
      ],
      costing: [
        { category: "Product", name: `${stone > 50 ? "Midnight Slate" : "Ivory Travertine"} Monolithic Table`, qty: 1, basePrice: 1950, brand: "Atelier RH" },
        { category: "Product", name: "Obsidian High-Shadow Ribbed Daybed", qty: 1, basePrice: 3400, brand: "B&B Italia Custom" },
        { category: "Material", name: "Smoked Glass Sconces & Metal Tubing", qty: 4, basePrice: 105, brand: "Schoolhouse" },
        { category: "Material", name: "Charred Timber Wall Moldings", qty: 110, basePrice: 8, brand: "Custom Sourcing" },
        { category: "Labor", name: "Slab Masonry Levelling & Heavy Install", qty: 16, basePrice: 70, brand: "" },
        { category: "Labor", name: "High-Satin Fine Lacquering Wood Finish", qty: 14, basePrice: 60, brand: "" }
      ]
    },
    {
      id: "procedural-opt-3-" + Date.now(),
      name: `${aesthetic} Velvet Softness & Sculpting`,
      tagline: `Fluid textile layers with microcement walls and curvaceous silhouettes.`,
      image: baseImages[2],
      description: `Focuses on comforting structural fluidity. Highlighting a ${textile}% soft elements weighting, this space uses curved drywall channels and heavy high-texture bouclé seating configurations to create a sensory cocoon.`,
      materials: ["Seamless Fine-Mix Microcement", wood > 50 ? "White Oak Chevron Planks" : "Bleached Ash Trim", "Soft Ribbed Bouclé yarn"],
      hotspots: [
        { id: "hs-custom-3-1", x: 45, y: 64, name: "Ribbed Bouclé Sculptural Armchair", description: "A curving statement chair draped in premium heavy loops, offering deep sinking structural support.", brand: "Cassina Studio", basePrice: 2150, shopLink: "https://www.dwr.com" },
        { id: "hs-custom-3-2", x: 28, y: 56, name: "Sanded travertine pedestal pillar", description: "Porous structural accent to carry lighting fixtures or decorative ceramics.", brand: "West Elm Studio", basePrice: 580, shopLink: "https://www.westelm.com" },
        { id: "hs-custom-3-3", x: 50, y: 25, name: "Integrated Gypsum Low-Energy Halo", description: "continuous diffused ceiling warm LEDs with seamless dry-molded perimeter channels.", brand: "Lutron Architectural", basePrice: 750, shopLink: "https://www.lutron.com" }
      ],
      costing: [
        { category: "Product", name: "Ribbed Bouclé Sculptural Armchair", qty: 2, basePrice: 2150, brand: "Cassina Studio" },
        { category: "Product", name: "Sanded travertine pedestal pillar", qty: 1, basePrice: 580, brand: "West Elm Studio" },
        { category: "Material", name: "Seamless Sanded White Microcement", qty: 14, basePrice: 90, brand: "Custom Polish" },
        { category: "Material", name: "Chevron Solid Bleached Ash Planks", qty: 160, basePrice: 12, brand: "Aura Premium Flooring" },
        { category: "Labor", name: "Specialized Plaster Finishing & Moldings", qty: 24, basePrice: 65, brand: "" },
        { category: "Labor", name: "Drywall Curved Alcove Installation", qty: 12, basePrice: 60, brand: "" }
      ]
    }
  ];
}

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully responsive and running at http://localhost:${PORT}`);
  });
}

startServer();
