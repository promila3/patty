/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Layers,
  Sliders,
  DollarSign,
  User,
  Heart,
  Settings,
  Plus,
  Send,
  X,
  ExternalLink,
  MapPin,
  Compass,
  Info,
  MessageSquare,
  Bookmark,
  Upload,
  Moon,
  Sun,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  Volume2,
  Lock,
  Globe2,
  FolderHeart,
  CheckCircle,
  HelpCircle
} from "lucide-react";

// Types representing the API outputs from server.ts
interface Hotspot {
  id: string;
  x: number;
  y: number;
  name: string;
  description: string;
  brand: string;
  basePrice: number;
  shopLink: string;
}

interface CostItem {
  category: "Product" | "Material" | "Labor";
  name: string;
  qty: number;
  basePrice: number;
  brand?: string;
}

interface DesignOption {
  id: string;
  name: string;
  tagline: string;
  image: string;
  description: string;
  materials: string[];
  hotspots: Hotspot[];
  costing: CostItem[];
}

interface CommentPin {
  id: string;
  designId: string;
  userName: string;
  text: string;
  x: number;
  y: number;
  createdAt: string;
}

// Preset empty rooms for Ingestion
const INGEST_ROOMS = [
  {
    id: "empty-loft",
    name: "Soho Vacant Minimalist Loft",
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    tags: "Double-height ceilings, brick wall exposure"
  },
  {
    id: "empty-penthouse",
    name: "Industrial Concrete Study Voids",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    tags: "Slick structural cement slabs, steel columns"
  },
  {
    id: "empty-conservatory",
    name: "Victorian Solarium Conservatory",
    image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    tags: "Heavy ornate frame arches, natural forest light"
  }
];

export default function App() {
  // Global View / Navigation State
  const [activeTab, setActiveTab] = useState<"ai-studio" | "active-workspace" | "saved" | "profile">("ai-studio");
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [unit, setUnit] = useState<"ft" | "m">("ft");
  const [lang, setLang] = useState<"EN" | "ES" | "FR">("EN");

  // Ingestion & Prompts (Module 1)
  const [selectedVacantRoom, setSelectedVacantRoom] = useState(INGEST_ROOMS[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("Lightweight custom wood dividers with integrated ambient bookshelves and clean white linen accents");
  const [selectedAesthetic, setSelectedAesthetic] = useState<string>("Japandi");
  
  // Custom Sliders
  const [woodFocus, setWoodFocus] = useState<number>(65);
  const [stoneFocus, setStoneFocus] = useState<number>(35);
  const [textileFocus, setTextileFocus] = useState<number>(50);
  const [mood, setMood] = useState<"Bright" | "Moody">("Bright");
  const [energy, setEnergy] = useState<"Zen" | "High Energy">("Zen");

  // Status variables
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<string>("Default Seeds");

  // Style generation options
  const [generatedOptions, setGeneratedOptions] = useState<DesignOption[]>([]);
  
  // Active design detail (Module 2)
  const [selectedOption, setSelectedOption] = useState<DesignOption | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  
  // Cost localization state (Module 3)
  const [locationCode, setLocationCode] = useState<"NYC" | "SF" | "AUS">("NYC");
  const [qualityTier, setQualityTier] = useState<"budget" | "premium" | "luxury">("premium");
  
  // Saved designs state (Module 4)
  const [savedDesigns, setSavedDesigns] = useState<DesignOption[]>([]);
  
  // Dynamic design comments & pins (Module 5)
  const [coDesignEnabled, setCoDesignEnabled] = useState<boolean>(true);
  const [activeComments, setActiveComments] = useState<CommentPin[]>([]);
  const [commentText, setCommentText] = useState<string>("");
  const [pendingPinCoords, setPendingPinCoords] = useState<{ x: number; y: number } | null>(null);
  const [commentingUserName, setCommentingUserName] = useState<string>("Julianne V.");

  // Hover states for highlighted comment pin
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);

  // File Upload input reference
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasImageRef = useRef<HTMLImageElement>(null);

  // Load Seed Designs on startup so active workspace is populated on page load
  useEffect(() => {
    // Generate initial options based on starter presets
    fetchInitialDesignOptions();
  }, []);

  // Fetch comments whenever Selected Design Option changes
  useEffect(() => {
    if (selectedOption) {
      fetchComments(selectedOption.id);
    }
  }, [selectedOption]);

  const fetchInitialDesignOptions = async () => {
    setIsGenerating(true);
    setErrorStatus(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aesthetic: selectedAesthetic,
          wood: woodFocus,
          stone: stoneFocus,
          textile: textileFocus,
          mood,
          energy
        })
      });
      const data = await response.json();
      if (data.options && data.options.length > 0) {
        setGeneratedOptions(data.options);
        setGenerationMode(data.mode);
        // Default select the first generated option for Active Workspace
        setSelectedOption(data.options[0]);
      }
    } catch (err: any) {
      console.error("Initial generation failed", err);
      setErrorStatus("Failed to contact the dynamic generative services. Displaying premium offline presets.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorStatus(null);
    setSelectedHotspot(null);
    setPendingPinCoords(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aesthetic: selectedAesthetic,
          wood: woodFocus,
          stone: stoneFocus,
          textile: textileFocus,
          mood,
          energy
        })
      });
      const data = await response.json();
      if (data.options && data.options.length > 0) {
        setGeneratedOptions(data.options);
        setGenerationMode(data.mode);
        // Autoselect the first one and switch to active-workspace
        setSelectedOption(data.options[0]);
        // Simple screen tracking
        const scrollElem = document.getElementById("main-workspace-header");
        if (scrollElem) scrollElem.scrollIntoView({ behavior: "smooth" });
      } else {
        throw new Error("No options returned from server.");
      }
    } catch (err: any) {
      console.error("Style generation service failed", err);
      setErrorStatus("External model connection is currently busy. Restored stable procedural styles.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Refine Style from within Active Studio with updated materials sliders
  const handleRefineStyle = async () => {
    setIsGenerating(true);
    setErrorStatus(null);
    setSelectedHotspot(null);
    setPendingPinCoords(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Refined: ${prompt}`,
          aesthetic: selectedAesthetic,
          wood: woodFocus,
          stone: stoneFocus,
          textile: textileFocus,
          mood,
          energy
        })
      });
      const data = await response.json();
      if (data.options && data.options.length > 0) {
        setGeneratedOptions(data.options);
        setGenerationMode(data.mode);
        // We replace active option with refined Option 1 of the new batch
        setSelectedOption(data.options[0]);
      }
    } catch (err) {
      console.error("Refining failed", err);
      setErrorStatus("Refining process timed out. Resetting to procedural matrix.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Comments/Pins fetching and writing (Module 5)
  const fetchComments = async (designId: string) => {
    try {
      // Map temporary IDs to standard stored routes if possible
      const targetId = designId.startsWith("procedural") ? "preset-japandi" : designId;
      const response = await fetch(`/api/comments/${targetId}`);
      if (response.ok) {
        const list = await response.json();
        setActiveComments(list);
      }
    } catch (err) {
      console.error("Failed to fetch comments", err);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!coDesignEnabled || !selectedOption) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setPendingPinCoords({ x, y });
    setSelectedHotspot(null); // Clear active product hotspot overlays to focus on commenting
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !pendingPinCoords || !selectedOption) return;

    try {
      const targetId = selectedOption.id.startsWith("procedural") ? "preset-japandi" : selectedOption.id;
      const response = await fetch(`/api/comments/${targetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: commentText,
          x: pendingPinCoords.x,
          y: pendingPinCoords.y,
          userName: `${commentingUserName} (Workspace Collaborator)`
        })
      });

      if (response.ok) {
        const updatedList = await response.json();
        setActiveComments(updatedList);
        setCommentText("");
        setPendingPinCoords(null);
      }
    } catch (err) {
      console.error("Failed to post comment pin", err);
    }
  };

  const handleSaveDesign = (design: DesignOption) => {
    if (savedDesigns.some((d) => d.id === design.id)) {
      // already saved, toggle off
      setSavedDesigns(savedDesigns.filter((d) => d.id !== design.id));
    } else {
      setSavedDesigns([...savedDesigns, design]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
        setSelectedVacantRoom({
          id: "custom-upload",
          name: file.name,
          image: reader.result as string,
          tags: "User uploaded empty layout dimension"
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper calculation formulas for Localized Cost Intelligence Engine (Module 3)
  const getCityMultiplier = () => {
    switch (locationCode) {
      case "SF":
        return 1.35;
      case "AUS":
        return 1.0;
      case "NYC":
      default:
        return 1.45;
    }
  };

  const getQualityMultiplier = () => {
    switch (qualityTier) {
      case "budget":
        return 0.65;
      case "luxury":
        return 1.5;
      case "premium":
      default:
        return 1.0;
    }
  };

  const getQualityBrandName = (brand: string | undefined, category: string) => {
    if (!brand) return "";
    if (qualityTier === "budget") {
      return category === "Product" ? "IKEA / Wayfair Contract" : "Standard Grade Sourcing";
    }
    if (qualityTier === "luxury") {
      return category === "Product" ? "B&B Italia / Cassina Atelier" : "Imported Arch-Luxury Custom";
    }
    return brand; // Premium defaults
  };

  const getCalculatedPrice = (base: number, category: string) => {
    const qMult = getQualityMultiplier();
    
    if (category === "Labor") {
      // Labor responds heavily to location multiplier, but not premium brand tier matching
      const cityMult = getCityMultiplier();
      return Math.round(base * cityMult);
    } else {
      // Products & Materials are scaled of quality index and location margin factors
      const cityFreightFactor = 1.0 + (getCityMultiplier() - 1.0) * 0.15; // 15% location premium
      return Math.round(base * qMult * cityFreightFactor);
    }
  };

  // Get grand totals categorized for progress breakdowns
  const getFinancialTotals = () => {
    if (!selectedOption) return { products: 0, materials: 0, labor: 0, total: 0 };
    
    let products = 0;
    let materials = 0;
    let labor = 0;

    selectedOption.costing.forEach((item) => {
      const qty = item.qty;
      const unitCost = getCalculatedPrice(item.basePrice, item.category);
      const rowSum = unitCost * qty;

      if (item.category === "Product") products += rowSum;
      if (item.category === "Material") materials += rowSum;
      if (item.category === "Labor") labor += rowSum;
    });

    return {
      products,
      materials,
      labor,
      total: products + materials + labor
    };
  };

  const financialStats = getFinancialTotals();

  // Color mappings for modern minimalist theme styling
  const themeClasses = darkMode 
    ? "bg-[#0b0c10] text-[#eaece8] font-sans transition-colors duration-300"
    : "bg-[#f8f9fa] text-[#1e1f22] font-sans transition-colors duration-300";

  return (
    <div id="visionspace-root" className={`${themeClasses} min-h-screen relative`}>
      {/* Upper Status strip & System Banner */}
      <div className={`text-[10px] tracking-widest uppercase py-2 px-6 flex justify-between items-center border-b ${
        darkMode ? "bg-[#14161d] border-neutral-800/80 text-neutral-400" : "bg-[#f1f3f5] border-neutral-200 text-neutral-600"
      }`}>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>SYSTEM ACTIVE &bull; {selectedAesthetic.toUpperCase()} ENGINE READY</span>
          {generationMode && (
            <span className={`px-2 py-0.5 rounded ml-2 text-[9px] ${
              darkMode ? "bg-amber-950 text-amber-300 border border-amber-800" : "bg-amber-100 text-amber-800"
            }`}>
              {generationMode}
            </span>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <span>UTC TIME: 2026-05-23 00:01Z</span>
          <span className="opacity-75">CURATOR: Julianne V.</span>
        </div>
      </div>

      {/* Primary Desktop Navigation & Brand Header */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md ${
        darkMode ? "bg-[#0b0c10]/90 border-neutral-800/80" : "bg-white/90 border-neutral-200"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 opacity-30 blur-sm"></div>
              <div className="relative w-8 h-8 rounded-lg bg-[#14161d] border border-amber-500/50 flex items-center justify-center text-amber-400 font-bold tracking-tighter text-sm">
                VS
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-lg font-bold tracking-tight">VisionSpace</span>
                <span className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent font-mono uppercase font-bold tracking-wider">AI</span>
              </div>
              <p className="text-[9px] tracking-wide text-neutral-400 uppercase font-mono">Precision Spatial Design Platform</p>
            </div>
          </div>

          {/* Central Mode Selector Tabs */}
          <nav className="flex items-center space-x-1 border rounded-lg p-0.5 max-w-lg overflow-x-auto bg-black/5 border-neutral-200/50 dark:bg-black/40 dark:border-neutral-800/70">
            <button
              onClick={() => setActiveTab("ai-studio")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "ai-studio"
                  ? (darkMode ? "bg-[#1f212a] text-white shadow-sm border border-neutral-750" : "bg-white text-neutral-900 shadow-sm border border-neutral-200")
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1. AI Studio</span>
            </button>
            <button
              onClick={() => setActiveTab("active-workspace")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "active-workspace"
                  ? (darkMode ? "bg-[#1f212a] text-white shadow-sm border border-neutral-750" : "bg-white text-neutral-900 shadow-sm border border-neutral-200")
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-orange-400" />
              <span>2. Active Studio</span>
              {selectedOption && (
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "saved"
                  ? (darkMode ? "bg-[#1f212a] text-white shadow-sm border border-neutral-750" : "bg-white text-neutral-900 shadow-sm border border-neutral-200")
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>3. Saved Moodboards</span>
              {savedDesigns.length > 0 && (
                <span className="text-[10px] bg-rose-500 text-white rounded-full px-1.5 font-bold">{savedDesigns.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "profile"
                  ? (darkMode ? "bg-[#1f212a] text-white shadow-sm border border-neutral-750" : "bg-white text-neutral-900 shadow-sm border border-neutral-200")
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>4. Profile</span>
            </button>
          </nav>

          {/* Quick Config Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Quick theme toggles */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg border ${
                darkMode ? "border-neutral-800 bg-[#14161d] hover:bg-neutral-850" : "border-neutral-200 bg-white hover:bg-neutral-50"
              }`}
              title="Toggle Contrast Level"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
            </button>
            {/* Interactive Badge Indicator */}
            <div className={`px-2.5 py-1 rounded-md text-[10px] font-mono flex items-center gap-1.5 ${
              darkMode ? "bg-neutral-900 text-neutral-300" : "bg-neutral-100 text-neutral-700"
            }`}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <span>CO-DESIGN : ACTIVE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Dynamic Alerts Banner */}
        {errorStatus && (
          <div className="mb-6 p-4 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-300 text-sm flex items-start gap-3 animate-fade-in">
            <Info className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
            <div className="flex-1">
              <h5 className="font-semibold text-white">Dynamic Sourcing Simulation Active</h5>
              <p className="text-xs text-amber-200/90 mt-1">{errorStatus}</p>
            </div>
            <button onClick={() => setErrorStatus(null)} className="text-neutral-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: AI STUDIO (Home, Ingestion Deck & Generator Sliders) */}
        {activeTab === "ai-studio" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Hand: Ingestion, Presets, Prompt Deck (lg:col-span-4) */}
            <section className={`lg:col-span-5 p-5 rounded-2xl border ${
              darkMode ? "bg-[#14161d] border-neutral-800/80" : "bg-white border-neutral-250 shadow-sm"
            }`}>
              <div className="flex justify-between items-center mb-5 pb-2 border-b border-neutral-800/40">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                  <h2 className="font-serif text-lg font-bold">1. Material & Aesthetic Ingestion</h2>
                </div>
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest bg-neutral-900 px-2 py-0.5 rounded">MOD-1</span>
              </div>

              {/* Step 1: Vacant space selection (Ingestion Deck) */}
              <div className="mb-6">
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-xs font-mono tracking-wider uppercase text-neutral-400">Step A: Staging Deck</label>
                  <span className="text-[10px] text-amber-500 font-mono">VACANT SPACE</span>
                </div>
                
                {/* Horizontal slider for Vacant designs */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {INGEST_ROOMS.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => {
                        setSelectedVacantRoom(room);
                        setUploadedImage(null);
                      }}
                      className={`relative aspect-video rounded-lg overflow-hidden border p-0.5 transition-all text-left ${
                        selectedVacantRoom.id === room.id && !uploadedImage
                          ? "border-amber-500 ring-2 ring-amber-500/20"
                          : "border-neutral-800 hover:border-neutral-600"
                      }`}
                    >
                      <img src={room.image} className="w-full h-full object-cover rounded-md" alt={room.name} />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-1">
                        <span className="text-[9px] text-white font-medium line-clamp-1">{room.name.split(" ")[0]}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Upload drag drop mock */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    uploadedImage 
                      ? "border-amber-500/50 bg-amber-500/5" 
                      : (darkMode ? "border-neutral-800 bg-[#0b0c10] hover:border-neutral-700" : "border-neutral-350 bg-[#f8f9fa] hover:border-neutral-300")
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*"
                  />
                  {uploadedImage ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-amber-400">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span className="font-semibold text-neutral-300 truncate">Dimensions Ingested Successfully</span>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400">
                      <Upload className="w-5 h-5 mx-auto mb-1.5 opacity-60 text-amber-500" />
                      Drag & drop vacant space room scan or click to browse
                    </p>
                  )}
                </div>
              </div>

              {/* Step 2: Select Starter Aesthetic Preset */}
              <div className="mb-6">
                <label className="block text-xs font-mono tracking-wider uppercase text-neutral-400 mb-2">Step B: Design Aesthetic Alignment</label>
                <div className="flex flex-wrap gap-2">
                  {["Japandi", "Gothic Noir", "Minimalist", "Industrial", "Mid-Century"].map((style) => (
                    <button
                      key={style}
                      onClick={() => setSelectedAesthetic(style)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                        selectedAesthetic === style
                          ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/10 font-semibold"
                          : (darkMode ? "border-neutral-800 hover:border-neutral-700 text-neutral-300" : "border-neutral-250 hover:border-neutral-300 text-neutral-700")
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Prompt container with Mic suggestions */}
              <div className="mb-6">
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-xs font-mono tracking-wider uppercase text-neutral-400">Step C: Custom Focus Instructions</label>
                  <span className="text-[10px] text-neutral-400">MICROMODEL PRESETS</span>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your design vision: physical finishes, structural layouts, windows, materials placement..."
                  className={`w-full h-24 p-3 rounded-xl text-xs font-sans border focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none ${
                    darkMode ? "bg-[#0b0c10] border-neutral-800 text-neutral-100" : "bg-[#f8f9fa] border-neutral-300 text-neutral-900"
                  }`}
                />
                
                {/* Suggestions / Micro-prompts */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    "Unrefined cedar framework & tatami",
                    "Acoustical panels with leather plinths",
                    "High-shadow velvet libraries",
                    "Seamless white microcement corridors"
                  ].map((sug) => (
                    <button
                      key={sug}
                      onClick={() => setPrompt(sug)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        darkMode ? "bg-[#0b0c10] border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-white" : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 4: Fine-tune Materials Sliders */}
              <div className="space-y-4 mb-6">
                <div className="border-t border-neutral-800/40 pt-4">
                  <h4 className="text-xs font-bold font-mono tracking-wider text-neutral-300 uppercase mb-3">Tweak Finishes Ratios</h4>
                </div>

                {/* Wood slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-600"></div>
                      Wood focus ratio
                    </span>
                    <span className="font-mono text-neutral-200 font-semibold">{woodFocus}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={woodFocus}
                    onChange={(e) => setWoodFocus(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Mineral / Stone slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-400"></div>
                      Mineral & Stone focus ratio
                    </span>
                    <span className="font-mono text-neutral-200 font-semibold">{stoneFocus}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={stoneFocus}
                    onChange={(e) => setStoneFocus(Number(e.target.value))}
                    className="w-full accent-neutral-400"
                  />
                </div>

                {/* Textile / Cushion slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                      Softness & Textiles focus ratio
                    </span>
                    <span className="font-mono text-neutral-200 font-semibold">{textileFocus}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={textileFocus}
                    onChange={(e) => setTextileFocus(Number(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>

                {/* Ambient Toggle Matrix */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">Atmosphere lighting</label>
                    <div className="flex border rounded-lg overflow-hidden border-neutral-800 bg-[#0b0c10]">
                      <button
                        onClick={() => setMood("Bright")}
                        className={`flex-1 text-[10px] py-1.5 font-bold uppercase transition-colors ${
                          mood === "Bright" ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        Bright
                      </button>
                      <button
                        onClick={() => setMood("Moody")}
                        className={`flex-1 text-[10px] py-1.5 font-bold uppercase transition-colors ${
                          mood === "Moody" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        Moody
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">Core Energy Index</label>
                    <div className="flex border rounded-lg overflow-hidden border-neutral-800 bg-[#0b0c10]">
                      <button
                        onClick={() => setEnergy("Zen")}
                        className={`flex-1 text-[10px] py-1.5 font-bold uppercase transition-colors ${
                          energy === "Zen" ? "bg-emerald-500 text-black animate-pulse" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        Zen
                      </button>
                      <button
                        onClick={() => setEnergy("High Energy")}
                        className={`flex-1 text-[10px] py-1.5 font-bold uppercase transition-colors ${
                          energy === "High Energy" ? "bg-amber-600 text-white" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        Active
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Generate CTA Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-bold text-sm tracking-wide shadow-xl shadow-amber-500/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-800" />
                    <span>SYNTHESIZING DESIGN LAYOUTS...</span>
                  </div>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>GENERATE AURA DESIGN SCHEMES</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </section>

            {/* Right Hand: Interactive Suggestions Canvas View (lg:col-span-8) */}
            <section className="lg:col-span-7 space-y-6">
              
              {/* Header section with generation summary stats */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-serif font-bold tracking-tight">AI Generated Aura Recommendations</h3>
                  <p className="text-xs text-neutral-400 mt-1">Select any recommendation layout to refine materials, inspect hotspots, or view costing schedules.</p>
                </div>
                {isGenerating && (
                  <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-full text-[10px] font-mono text-amber-400 uppercase">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    Gemini Live
                  </div>
                )}
              </div>

              {/* 3 Suggestions Columns / Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {isGenerating ? (
                  // Skeleton state loaders
                  [1, 2, 3].map((idx) => (
                    <div key={idx} className={`rounded-xl border animate-pulse overflow-hidden ${
                      darkMode ? "bg-[#14161d] border-neutral-800/80" : "bg-white border-neutral-200"
                    }`}>
                      <div className="aspect-square bg-neutral-800/80"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-neutral-800/80 rounded w-2/3"></div>
                        <div className="h-3 bg-neutral-800/80 rounded w-1/2"></div>
                        <div className="h-10 bg-neutral-800/80 rounded"></div>
                        <div className="h-3 bg-neutral-800/80 rounded w-1/3"></div>
                      </div>
                    </div>
                  ))
                ) : generatedOptions.length > 0 ? (
                  generatedOptions.map((opt) => {
                    const isSelection = selectedOption?.id === opt.id;
                    const isSaved = savedDesigns.some((d) => d.id === opt.id);
                    
                    return (
                      <div
                        key={opt.id}
                        className={`rounded-xl border group transition-all flex flex-col justify-between overflow-hidden relative ${
                          isSelection 
                            ? "border-amber-500 ring-1 ring-amber-500/20 shadow-lg" 
                            : (darkMode ? "bg-[#14161d] border-neutral-800/80 hover:border-neutral-750" : "bg-white border-neutral-250 hover:border-neutral-350 shadow-sm")
                        }`}
                      >
                        {/* Image Frame */}
                        <div className="relative aspect-video overflow-hidden bg-neutral-900">
                          <img 
                            src={opt.image} 
                            alt={opt.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-black/10 to-transparent"></div>
                          
                          {/* Top Tag badges overlay */}
                          <div className="absolute top-2.5 left-2.5 flex gap-1">
                            {opt.materials?.slice(0, 2).map((mat, i) => (
                              <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#14161d]/85 text-amber-300 border border-neutral-800/80 backdrop-blur-sm line-clamp-1">
                                {mat.split(" ")[0]}
                              </span>
                            ))}
                          </div>

                          {/* Heart bookmark shortcut absolute trigger */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveDesign(opt);
                            }}
                            className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md transition-colors ${
                              isSaved 
                                ? "bg-rose-500/95 text-white" 
                                : "bg-[#14161d]/75 text-neutral-400 hover:text-white"
                            }`}
                            title="Boomark design variant"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-white" : ""}`} />
                          </button>

                          {/* Cost range summary absolute identifier */}
                          <div className="absolute bottom-2.5 left-2.5">
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-black/60 text-emerald-400 border border-emerald-500/30">
                              Est. {locationCode} Project Budget
                            </span>
                          </div>
                        </div>

                        {/* Description Box */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-serif font-bold text-sm tracking-tight text-white group-hover:text-amber-300 transition-colors">
                              {opt.name}
                            </h4>
                            <p className="text-[11px] text-amber-300/80 font-semibold italic mt-0.5 line-clamp-1">{opt.tagline}</p>
                            <p className="text-[11px] text-neutral-400 mt-2 line-clamp-2 leading-relaxed">{opt.description}</p>
                          </div>

                          {/* Action rows */}
                          <div className="mt-4 pt-3 border-t border-neutral-800/40 flex items-center justify-between">
                            <div className="text-left">
                              <span className="block text-[9px] font-mono uppercase text-neutral-400 tracking-wider">Total Est Cost</span>
                              <span className="font-mono text-sm text-emerald-400 font-bold">
                                ${((opt.costing.reduce((sum, item) => sum + item.basePrice * item.qty, 0)) * getCityMultiplier()).toLocaleString()}
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedOption(opt);
                                // Directly push user into the heavy Interactive Active Studio viewport
                                setActiveTab("active-workspace");
                              }}
                              className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                                isSelection 
                                  ? "bg-amber-500 text-black border-amber-500" 
                                  : "border-[#3a3f50] hover:border-amber-500 text-neutral-300 hover:text-white"
                              }`}
                            >
                              <span>Inspect Elements</span>
                              <ArrowRight className="w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-16 text-center border-2 border-dashed border-neutral-800 rounded-xl">
                    <Sparkles className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-neutral-400">Describe your architectural goals to generate your distinctive aesthetic options</p>
                  </div>
                )}
              </div>

              {/* Proportional In-Depth Process Explanation Box */}
              <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                darkMode ? "bg-neutral-900/60 border-neutral-800/80" : "bg-white border-neutral-250 shadow-xs"
              }`}>
                <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1.5LEADING-relaxed text-neutral-400">
                  <h5 className="font-bold text-white uppercase font-mono tracking-wider">The Engineering Process Protocol</h5>
                  <p>When you trigger the synthesis engine, the platform packages: the spatial volume parameters from your ingested empty loft scan, your active aesthetic focus metrics (wood, mineral and textiles sliders), and light modifiers.</p>
                  <p className="mt-1">The system passes this blueprint directly through local cached microservices or live Gemini requests to return 3 distinctive, mathematically weighted styles complete with dynamic coordinates, furniture listings, and sourcing channels.</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: ACTIVE REFINEMENT WORKSPACE & LOCALIZED COSTING SHEET (Module 2, 3 & 5) */}
        {activeTab === "active-workspace" && (
          <div className="space-y-8">
            
            {/* Header row details */}
            <div id="main-workspace-header" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-neutral-800/40">
              <div>
                <span className="text-[10px] font-mono uppercase bg-amber-500 text-black font-extrabold px-2 py-0.5 rounded tracking-widest">MODULE 2 &bull; DIGITAL WORKBENCH</span>
                <h2 className="text-2xl font-serif font-bold text-white mt-1.5">
                  {selectedOption ? selectedOption.name : "Select Design from AI Studio Grid"}
                </h2>
                <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Interactive overlay view equipped with product hotspots and real-time co-design comments pins.</span>
                </p>
              </div>

              <div className="flex gap-2">
                {selectedOption && (
                  <button
                    onClick={() => handleSaveDesign(selectedOption)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                      savedDesigns.some((d) => d.id === selectedOption.id)
                        ? "bg-rose-500 border-rose-500 text-white"
                        : "border-[#3a3f50] text-[#eaece8] hover:border-amber-500"
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5 fill-current" />
                    <span>{savedDesigns.some((d) => d.id === selectedOption.id) ? "Saved to Moodboard" : "Bookmark Variant"}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setActiveTab("ai-studio");
                    const scrollElem = document.getElementById("visionspace-root");
                    if (scrollElem) scrollElem.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[#3a3f50] text-[#eaece8] hover:border-amber-500 transition-all"
                >
                  Return to Generator Grid
                </button>
              </div>
            </div>

            {selectedOption ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* 1. Main Viewport Stage (lg:col-span-8) */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Visualizer Canvas Card */}
                  <div className={`relative rounded-2xl overflow-hidden border p-1 ${
                    darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
                  }`}>
                    
                    {/* Viewport Labeling margins (Architectural specs) */}
                    <div className="absolute top-4 left-4 z-20 pointer-events-none flex flex-col gap-1.5">
                      <div className="bg-black/60 border border-neutral-800/80 backdrop-blur-md rounded-lg px-2.5 py-1 text-[9px] font-mono text-neutral-300">
                        AURA RENDERING ENGINE: {selectedAesthetic.toUpperCase()}
                      </div>
                      <div className="bg-black/60 border border-neutral-800/80 backdrop-blur-md rounded-lg px-2.5 py-1 text-[9px] font-mono text-neutral-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
                        LOCATION COFACTOR: {locationCode} ({getCityMultiplier()}x)
                      </div>
                    </div>

                    <div className="absolute top-4 right-4 z-20 flex gap-2">
                      <div className="bg-black/60 border border-neutral-800/80 backdrop-blur-md rounded-lg p-2 text-xs font-mono text-emerald-400 font-bold">
                        Est. Project Budget: ${financialStats.total.toLocaleString()}
                      </div>
                    </div>

                    {/* Interactive Clickable Canvas Box */}
                    <div 
                      onClick={handleImageClick}
                      className="relative overflow-hidden cursor-crosshair group rounded-xl"
                      style={{ maxHeight: "550px" }}
                    >
                      <img
                        ref={canvasImageRef}
                        src={selectedOption.image}
                        alt={selectedOption.name}
                        className="w-full object-cover rounded-xl"
                        style={{ height: "100%", maxHeight: "550px", objectPosition: "center 40%" }}
                      />
                      
                      {/* Interactive Canvas Grid overlays */}
                      <div className="absolute inset-x-0 bottom-0 py-3.5 px-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center pointer-events-none z-10">
                        <span className="text-[10px] text-neutral-400 font-mono tracking-wider">CLICK VIEWPORT TO ATTACH PARTICIPATIVE PIN COMMENTS &bull; CO-DESIGN ACTIVE</span>
                        <div className="flex gap-4 text-[10px] text-neutral-300 font-mono">
                          <span>A: {woodFocus}% WOOD</span>
                          <span>B: {stoneFocus}% STONE</span>
                          <span>C: {textileFocus}% TEXTILE</span>
                        </div>
                      </div>

                      {/* A. PRODUCT HOTSPOTS (Module 2 Pulse tags) */}
                      {selectedOption.hotspots?.map((hs) => {
                        const isHotspotSelection = selectedHotspot?.id === hs.id;
                        return (
                          <div
                            key={hs.id}
                            style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
                          >
                            {/* Pulse background halo */}
                            <div className={`absolute -inset-2.5 rounded-full filter blur-xs animate-pulse-slow ${
                              isHotspotSelection ? "bg-amber-500/50" : "bg-white/40"
                            }`}></div>

                            {/* Center Dot Tag */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedHotspot(hs);
                                setPendingPinCoords(null); // Close commenting pin during product inspection
                              }}
                              className={`relative w-5.5 h-5.5 rounded-full border shadow flex items-center justify-center font-bold text-[10px] transition-all hover:scale-115 ${
                                isHotspotSelection
                                  ? "bg-amber-500 border-amber-300 text-black font-extrabold"
                                  : "bg-white/95 border-neutral-800 text-neutral-900"
                              }`}
                            >
                              +
                            </button>

                            {/* Quick name tooltip on Hover */}
                            <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-[#14161d] text-white text-[10px] px-2 py-0.5 rounded border border-neutral-800 opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none">
                              {hs.name}
                            </div>
                          </div>
                        );
                      })}

                      {/* B. CO-DESIGN COMMENTS PIN OVERLAY (Module 5 Yellow coordinates) */}
                      {activeComments.map((comment) => {
                        const isHovered = hoveredCommentId === comment.id;
                        return (
                          <div
                            key={comment.id}
                            style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-all scale-100 hover:scale-115"
                            onMouseEnter={() => setHoveredCommentId(comment.id)}
                            onMouseLeave={() => setHoveredCommentId(null)}
                          >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-mono text-[9px] font-bold shadow-md relative ${
                              isHovered 
                                ? "bg-amber-400 border-white text-slate-900 ring-4 ring-amber-500/35" 
                                : "bg-neutral-900/90 border-amber-400 text-amber-400"
                            }`}>
                              📌
                            </div>
                            
                            {/* Number hover tag tooltip */}
                            <div className="absolute bottom-7 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 text-[9px] font-bold px-2 py-0.5 rounded whitespace-nowrap opacity-0 md:group-hover:opacity-100 pointer-events-none transition-all">
                              {comment.userName.split(" ")[0]}
                            </div>
                          </div>
                        );
                      })}

                      {/* C. PENDING NEW PIN PLACEMENT INDICATOR */}
                      {pendingPinCoords && (
                        <div
                          style={{ left: `${pendingPinCoords.x}%`, top: `${pendingPinCoords.y}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 z-30 animate-bounce"
                        >
                          <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center font-bold text-xs text-white shadow-xl">
                            📍
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Refined Texture Fine-Tuning Slider Drawer (Module 2 inner refinement) */}
                  <div className={`p-5 rounded-2xl border ${
                    darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-serif font-bold text-base">Fine-Tune Layout Repainting</h4>
                        <p className="text-xs text-neutral-400 mt-0.5">Iterate on material composition ratios to trigger customized model regenerations.</p>
                      </div>
                      <span className="text-[10px] font-mono tracking-widest text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded">MOD-2</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5 select-none">
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-neutral-400 font-mono">WOOD INTEGRATION</span>
                          <span className="font-bold text-neutral-150">{woodFocus}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={woodFocus}
                          onChange={(e) => setWoodFocus(Number(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-neutral-400 font-mono">STONE & SURFACE</span>
                          <span className="font-bold text-neutral-150">{stoneFocus}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={stoneFocus}
                          onChange={(e) => setStoneFocus(Number(e.target.value))}
                          className="w-full accent-neutral-300"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-neutral-400 font-mono">TEXTILE COMFORT</span>
                          <span className="font-bold text-neutral-150">{textileFocus}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={textileFocus}
                          onChange={(e) => setTextileFocus(Number(e.target.value))}
                          className="w-full accent-rose-400"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-neutral-800/20">
                      <button
                        onClick={handleRefineStyle}
                        disabled={isGenerating}
                        className="py-2.5 px-6 rounded-lg bg-white hover:bg-neutral-100 text-slate-950 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {isGenerating ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span>Request Repainting refinement</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. LOCALIZED COSTING INTELLIGENCE (Module 3 Dynamic Panels) */}
                  <div className={`p-5 rounded-2xl border ${
                    darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
                  }`}>
                    
                    {/* Control Bar city, premium toggles */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-neutral-800/40">
                      <div>
                        <span className="text-[10px] font-mono tracking-widest text-[#eaece8] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">MODULE 3 &bull; FINANCIAL LAYERS</span>
                        <h4 className="text-lg font-serif font-bold text-white mt-1">Cost Localization Engine</h4>
                        <p className="text-xs text-neutral-450 mt-1">Factors in metropolitan labor indices and custom supplier brands instantaneously.</p>
                      </div>

                      {/* City Dropdown, Quality Selector */}
                      <div className="flex flex-wrap gap-3 items-center">
                        
                        {/* Metropolis Select */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono uppercase text-neutral-450">Metropol</span>
                          <select
                            value={locationCode}
                            onChange={(e) => setLocationCode(e.target.value as any)}
                            className={`text-xs px-3 py-1.5 border rounded-lg focus:outline-none ${
                              darkMode ? "bg-[#0b0c10] border-neutral-800 text-white" : "bg-[#f8f9fa] border-neutral-300 text-neutral-800"
                            }`}
                          >
                            <option value="NYC">New York, NY (1.45x labor)</option>
                            <option value="SF">San Francisco, CA (1.35x labor)</option>
                            <option value="AUS">Austin, TX (1.00x labor)</option>
                          </select>
                        </div>

                        {/* Brand Premium Tier Selector */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono uppercase text-neutral-450">Material Grade</span>
                          <div className="flex border rounded-lg overflow-hidden border-neutral-800 bg-[#0b0c10]">
                            <button
                              onClick={() => {
                                setQualityTier("budget");
                                setSelectedHotspot(null);
                              }}
                              className={`text-[10px] px-2.5 py-1.5 font-semibold transition-colors uppercase ${
                                qualityTier === "budget" ? "bg-amber-500/20 text-amber-300 font-bold" : "text-neutral-400 hover:text-white"
                              }`}
                            >
                              Budget
                            </button>
                            <button
                              onClick={() => {
                                setQualityTier("premium");
                                setSelectedHotspot(null);
                              }}
                              className={`text-[10px] px-2.5 py-1.5 font-semibold transition-colors uppercase ${
                                qualityTier === "premium" ? "bg-amber-500 text-black font-bold" : "text-neutral-400 hover:text-white"
                              }`}
                            >
                              Premium
                            </button>
                            <button
                              onClick={() => {
                                setQualityTier("luxury");
                                setSelectedHotspot(null);
                              }}
                              className={`text-[10px] px-2.5 py-1.5 font-semibold transition-colors uppercase ${
                                qualityTier === "luxury" ? "bg-rose-500/20 text-rose-300 font-bold" : "text-neutral-400 hover:text-white"
                              }`}
                            >
                              Atelier Luxury
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Progress visual budgeting breakdown bar */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className={`p-3.5 rounded-xl border ${darkMode ? "bg-[#14161d] border-neutral-800/85" : "bg-[#f8f9fa] border-neutral-250"}`}>
                        <span className="text-[10px] font-mono uppercase text-neutral-400">Total Sourced Items</span>
                        <p className="text-xl font-mono text-white font-bold mt-1">${financialStats.products.toLocaleString()}</p>
                        <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full transition-all duration-500" 
                            style={{ width: `${(financialStats.products / financialStats.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className={`p-3.5 rounded-xl border ${darkMode ? "bg-[#14161d] border-neutral-800/85" : "bg-[#f8f9fa] border-neutral-250"}`}>
                        <span className="text-[10px] font-mono uppercase text-neutral-400">Surfaces & Finishing Cost</span>
                        <p className="text-xl font-mono text-white font-bold mt-1">${financialStats.materials.toLocaleString()}</p>
                        <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div 
                            className="bg-indigo-400 h-full transition-all duration-500" 
                            style={{ width: `${(financialStats.materials / financialStats.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className={`p-3.5 rounded-xl border ${darkMode ? "bg-[#14161d] border-neutral-800/85" : "bg-[#f8f9fa] border-neutral-250"}`}>
                        <span className="text-[10px] font-mono uppercase text-neutral-400">Contractor Labor Matrix</span>
                        <p className="text-xl font-mono text-white font-bold mt-1">${financialStats.labor.toLocaleString()}</p>
                        <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div 
                            className="bg-emerald-400 h-full transition-all duration-500" 
                            style={{ width: `${(financialStats.labor / financialStats.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                        <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">Consolidated Project Total</span>
                        <p className="text-2xl font-mono text-white font-extrabold mt-1">${financialStats.total.toLocaleString()}</p>
                        <p className="text-[10px] text-neutral-400/90 mt-1">Scaled accurately matching {locationCode} indices</p>
                      </div>
                    </div>

                    {/* Sourced Breakdown itemized Table */}
                    <div className="overflow-x-auto rounded-xl border border-neutral-800">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className={`border-b border-neutral-800 uppercase font-mono tracking-wider ${
                            darkMode ? "bg-neutral-900/90 text-neutral-400" : "bg-neutral-50 text-neutral-600"
                          }`}>
                            <th className="p-3">Category</th>
                            <th className="p-3">Item Sourced Name</th>
                            <th className="p-3">Qty</th>
                            <th className="p-3">Supplier Brand Grade</th>
                            <th className="p-3 text-right">Unit Rate</th>
                            <th className="p-3 text-right">Scaled Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/40">
                          {selectedOption.costing?.map((item, idx) => {
                            const unitCost = getCalculatedPrice(item.basePrice, item.category);
                            const finalRowPrice = unitCost * item.qty;
                            
                            return (
                              <tr key={idx} className="hover:bg-neutral-900/20 text-neutral-300">
                                <td className="p-3 font-mono">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.category === "Product" ? "bg-amber-500/10 text-amber-400" :
                                    item.category === "Material" ? "bg-indigo-500/10 text-indigo-400" :
                                    "bg-emerald-500/10 text-emerald-400"
                                  }`}>
                                    {item.category}
                                  </span>
                                </td>
                                <td className="p-3 font-medium text-white">{item.name}</td>
                                <td className="p-3 font-mono">{item.qty}</td>
                                <td className="p-3 text-neutral-400 italic">
                                  {item.category === "Labor" ? "Local Certified Trades" : getQualityBrandName(item.brand, item.category)}
                                </td>
                                <td className="p-3 text-right font-mono">${unitCost.toLocaleString()}</td>
                                <td className="p-3 text-right font-mono text-emerald-400 font-bold">${finalRowPrice.toLocaleString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Quality statement footer detail */}
                    <div className="mt-4 flex gap-2 items-center text-[11px] text-neutral-400">
                      <HelpCircle className="w-4 h-4 text-neutral-500" />
                      <span>Specifications represent estimations. Metropol factors represent local shipping adjustments based on current retail freight charts.</span>
                    </div>

                  </div>

                </div>

                {/* 3. Lateral Panels: Inspector, Pin Commenting Forms & Sourcing card overlays (lg:col-span-4) */}
                <div className="lg:col-span-4 space-y-6">

                  {/* Hotspot Sourcing Inspector (Detail Overlays) */}
                  {selectedHotspot ? (
                    <div className="p-5 rounded-2xl border border-amber-500/50 bg-gradient-to-b from-[#14161d] to-[#0c0d12] relative animate-fade-in shadow-xl shadow-amber-500/5">
                      
                      {/* Close trigger button */}
                      <button 
                        onClick={() => setSelectedHotspot(null)}
                        className="absolute top-4 right-4 text-neutral-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-amber-400 font-bold mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                        Interactive hot-spot inspector
                      </div>

                      <h4 className="font-serif font-bold text-lg text-white mb-2">{selectedHotspot.name}</h4>
                      <p className="text-xs text-neutral-300 leading-relaxed mb-4">{selectedHotspot.description}</p>

                      <div className="space-y-2.5 mb-5 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-neutral-800/80">
                          <span className="text-neutral-400">Metropolitan Code:</span>
                          <span className="font-mono text-neutral-200 uppercase font-semibold">{locationCode}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-neutral-800/80">
                          <span className="text-neutral-400">Supplier Authority Grade:</span>
                          <span className="text-amber-300 font-medium italic">
                            {getQualityBrandName(selectedHotspot.brand, "Product")}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-neutral-800/80">
                          <span className="text-neutral-400">Base manufacturing cost:</span>
                          <span className="font-mono text-neutral-300">${selectedHotspot.basePrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-[#3a3f50] pt-2">
                          <span className="text-white font-bold">Consolidated Retail price:</span>
                          <span className="font-mono text-emerald-400 font-extrabold text-base">
                            ${getCalculatedPrice(selectedHotspot.basePrice, "Product").toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <a
                        href={selectedHotspot.shopLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-center text-xs font-bold font-mono tracking-wide flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <span>Sourcing channel link</span>
                        <ExternalLink className="w-3.5 h-3.5 text-black" />
                      </a>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl border border-neutral-800 bg-[#14161d] text-center py-8">
                      <Info className="w-7 h-7 text-neutral-600 mx-auto mb-2.5" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Hover & Click hotspot markers</h4>
                      <p className="text-xs text-neutral-450 mt-1">Tap the pulsing indicator pins on the layout above to inspect granular manufacturer specs, merchant items, and real-time custom pricing schedules.</p>
                    </div>
                  )}

                  {/* CO-DESIGN FEEDBACK PANEL (Module 5 live comment engine) */}
                  <div className={`p-5 rounded-2xl border ${
                    darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-250"
                  }`}>
                    
                    {/* Active toggle bar */}
                    <div className="flex justify-between items-center pb-3 border-b border-neutral-850/80 mb-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-orange-400 animate-pulse" />
                        <h4 className="font-serif font-bold text-sm text-white">Co-Design Feedback Panel</h4>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-neutral-400 uppercase">CO-DESIGN</span>
                        <button
                          onClick={() => {
                            setCoDesignEnabled(!coDesignEnabled);
                            setPendingPinCoords(null);
                          }}
                          className={`w-8 h-4.5 rounded-full p-0.5 transition-colors relative ${
                            coDesignEnabled ? "bg-amber-500" : "bg-neutral-800"
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full bg-white transition-all transform ${
                            coDesignEnabled ? "translate-x-3.5" : "translate-x-0"
                          }`}></div>
                        </button>
                      </div>
                    </div>

                    {coDesignEnabled ? (
                      <div className="space-y-4">
                        
                        {/* Interactive prompt to click and place */}
                        {pendingPinCoords ? (
                          <form onSubmit={submitComment} className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 animate-fade-in relative space-y-3">
                            <button
                              type="button"
                              onClick={() => setPendingPinCoords(null)}
                              className="absolute top-2 right-2 text-neutral-400 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>

                            <div className="text-[10px] uppercase font-mono text-amber-300 font-bold flex items-center gap-1">
                              <span>Placement location:</span>
                              <span className="font-bold text-white px-1.5 py-0.5 rounded bg-neutral-900">
                                h: {pendingPinCoords.x}%, v: {pendingPinCoords.y}%
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-[8px] font-mono text-neutral-400 uppercase">Collaborator name:</label>
                              <input
                                type="text"
                                value={commentingUserName}
                                onChange={(e) => setCommentingUserName(e.target.value)}
                                className="w-full bg-[#0b0c10] border border-neutral-800 rounded p-1.5 text-xs text-white uppercase font-mono tracking-wider"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-[8px] font-mono text-neutral-400 uppercase">Comment text:</label>
                              <textarea
                                required
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="State feedback... e.g. Velvet drapery looks cozy, check lengths."
                                className="w-full bg-[#0b0c10] border border-neutral-800 rounded p-2 text-xs text-neutral-100 resize-none h-18 text-sans"
                              />
                            </div>

                            <button
                              type="submit"
                              className="w-full py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold font-mono text-[10px] uppercase flex items-center justify-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              <span>Saves comment coordinates</span>
                            </button>
                          </form>
                        ) : (
                          <div className="p-3 bg-neutral-950 rounded-xl text-center border border-neutral-900">
                            <p className="text-[11px] text-neutral-400">
                              <span className="font-bold text-amber-500">How to add comments:</span> Tap anywhere inside the staged image detail viewport above to drop a coordinates pin card instantly.
                            </p>
                          </div>
                        )}

                        {/* Scrolling list feed of comments */}
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                          {activeComments.length > 0 ? (
                            activeComments.map((c) => {
                              const isHovered = hoveredCommentId === c.id;
                              
                              return (
                                <div
                                  key={c.id}
                                  className={`p-3 rounded-xl border transition-all text-xs relative ${
                                    isHovered 
                                      ? "bg-[#1f212d] border-amber-500 shadow" 
                                      : "bg-[#0b0c10] border-neutral-850"
                                  }`}
                                  onMouseEnter={() => setHoveredCommentId(c.id)}
                                  onMouseLeave={() => setHoveredCommentId(null)}
                                >
                                  {/* User details header */}
                                  <div className="flex justify-between items-baseline mb-1">
                                    <span className="font-mono font-bold text-amber-400 text-[10px] tracking-wide uppercase line-clamp-1">{c.userName}</span>
                                    <span className="text-[9px] font-mono text-neutral-500">
                                      {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  
                                  <p className="text-neutral-300 leading-relaxed text-[11px]">{c.text}</p>
                                  
                                  <div className="flex gap-2.5 items-center mt-2.5 text-[9px] font-mono text-neutral-500">
                                    <span>GRID COORDS: ({c.x}%, {c.y}%)</span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-6 text-neutral-500 text-xs italic">
                              No Pins attached. Drop the first coordinate comment on the canvas.
                            </div>
                          )}
                        </div>

                      </div>
                    ) : (
                      <div className="text-center py-4 text-neutral-500 text-xs italic">
                        Real-time collaborative overlays currently locked. Toggle on above to sync comment feeds.
                      </div>
                    )}

                  </div>

                </div>

              </div>
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-neutral-800 rounded-3xl">
                <Sparkles className="w-10 h-10 text-neutral-600 mx-auto mb-4" />
                <p className="text-sm font-semibold text-neutral-400">Navigate to the AI Studio and select a design variant to calibrate costing formulas.</p>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: SAVED MOODBOARDS (Module 4) */}
        {activeTab === "saved" && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-neutral-850">
              <span className="text-[10px] font-mono bg-rose-500 text-white font-extrabold px-2 py-0.5 rounded tracking-widest">SAVED COLLECTIONS</span>
              <h2 className="text-2xl font-serif font-bold text-white mt-1.5">Your Sourced Moodboards</h2>
              <p className="text-xs text-neutral-450 mt-1">Curated spatial designs representing active procurement workflows.</p>
            </div>

            {savedDesigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedDesigns.map((opt) => (
                  <div
                    key={opt.id}
                    className={`rounded-xl border group transition-all overflow-hidden relative font-sans ${
                      darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-250 shadow-sm"
                    }`}
                  >
                    {/* Visual block */}
                    <div className="relative aspect-video overflow-hidden">
                      <img src={opt.image} alt={opt.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                      
                      {/* Trash/delete absolute action */}
                      <button
                        onClick={() => handleSaveDesign(opt)}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-rose-600 text-neutral-300 hover:text-white transition-colors"
                        title="Delete from saved"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* City code indicator badge */}
                      <div className="absolute bottom-3 left-3 text-[10px] font-mono font-bold text-amber-400">
                        METROPOL: {locationCode} INDEX
                      </div>
                    </div>

                    {/* Sourcing summary text */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h4 className="font-serif font-bold text-base text-white">{opt.name}</h4>
                        <p className="text-xs text-amber-300/90 font-medium italic mt-0.5">{opt.tagline}</p>
                      </div>

                      <div className="space-y-2 text-xs text-neutral-400 border-t border-neutral-800/60 pt-3">
                        <div className="flex justify-between font-mono">
                          <span>Sourced Furnishings Count:</span>
                          <span className="text-neutral-200">{opt.hotspots?.length || 3} items</span>
                        </div>
                        <div className="flex justify-between font-mono">
                          <span>Estimated Procurement:</span>
                          <span className="text-emerald-400 font-extrabold text-sm">
                            ${((opt.costing.reduce((sum, i) => sum + i.qty * i.basePrice, 0)) * getCityMultiplier()).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedOption(opt);
                            setActiveTab("active-workspace");
                          }}
                          className="flex-1 py-2 text-center bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition-colors"
                        >
                          Load active visualizer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 border-2 border-dashed border-neutral-850 rounded-2xl max-w-xl mx-auto mt-6">
                <FolderHeart className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                <h4 className="text-base font-bold text-white uppercase tracking-wider">No designs saved yet</h4>
                <p className="text-xs text-neutral-450 mt-1 max-w-sm mx-auto leading-relaxed">
                  Navigate to the AI Studio or Active Studio, review the customized generated variants, and select <Heart className="w-3 h-3 inline mx-0.5" /> to save options.
                </p>
                <button
                  onClick={() => setActiveTab("ai-studio")}
                  className="mt-6 py-2 px-4 bg-white hover:bg-neutral-100 text-slate-900 font-bold text-xs font-mono uppercase tracking-wider rounded-lg transition-colors"
                >
                  Go to Generation Canvas
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CURATOR PROFILE & PREFERENCES (Module 4 User stats and settings) */}
        {activeTab === "profile" && (
          <div className="max-w-xl mx-auto space-y-8">
            
            {/* Header */}
            <div className="pb-4 border-b border-neutral-850 text-center">
              <span className="text-[10px] font-mono bg-neutral-900 text-neutral-400 border border-neutral-800 font-extrabold px-2.5 py-1 rounded-full tracking-widest uppercase">DESIGNER CREDENTIALS</span>
              <h2 className="text-2xl font-serif font-bold text-white mt-3">Julianne V. Account</h2>
              <p className="text-xs text-neutral-400 mt-1 uppercase font-mono tracking-widest">Procurement Coordinator & bull; Area Sourcing</p>
            </div>

            {/* Profile Credentials Card */}
            <div className="p-6 rounded-2xl border border-neutral-800 bg-[#14161d] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-2xl"></div>
              
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center font-serif text-2xl font-bold text-black border border-amber-300">
                  JV
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-base font-bold text-white font-serif">Julianne Valentin</h3>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-mono font-bold uppercase uppercase text-[9px] tracking-widest">
                      PRO STATUS
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">julianne@visionspace-ai.studio</p>
                  <p className="text-xs text-neutral-450">Certified designer focusing on warm Japandi minimal spatial layouts.</p>
                </div>
              </div>

              {/* Statistical cards for the curator context */}
              <div className="grid grid-cols-3 gap-3.5 mt-6 pt-5 border-t border-neutral-850">
                <div className="text-center">
                  <span className="block text-[9px] font-mono text-neutral-450 uppercase tracking-widest">CO-PIN FEEDBACK</span>
                  <p className="text-lg font-mono text-white font-bold mt-0.5">28 Saved</p>
                </div>
                <div className="text-center">
                  <span className="block text-[9px] font-mono text-neutral-450 uppercase tracking-widest">CITY REGION</span>
                  <p className="text-lg font-mono text-white font-bold mt-0.5">{locationCode}</p>
                </div>
                <div className="text-center">
                  <span className="block text-[9px] font-mono text-neutral-450 uppercase tracking-widest">SAVED DESIGNS</span>
                  <p className="text-lg font-mono text-white font-bold mt-0.5">{savedDesigns.length} Saved</p>
                </div>
              </div>
            </div>

            {/* App Preferences Forms panel */}
            <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900 space-y-5">
              <h4 className="text-xs font-mono tracking-widest text-[#eaece8] uppercase font-bold border-b border-neutral-800 pb-2">Workspace System Variables</h4>
              
              <div className="space-y-4">
                
                {/* 1. Contrast Toggle */}
                <div className="flex justify-between items-center text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-white">Visual Contrast Dark Mode</p>
                    <p className="text-[10px] text-neutral-450">Toggles the global UI context canvas values</p>
                  </div>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors relative ${
                      darkMode ? "bg-amber-500" : "bg-neutral-800"
                    }`}
                  >
                    <div className={`w-4.5 h-4.5 rounded-full bg-white transition-all transform ${
                      darkMode ? "translate-x-4.5" : "translate-x-0"
                    }`}></div>
                  </button>
                </div>

                {/* 2. Measurements selector */}
                <div className="flex justify-between items-center text-xs border-t border-neutral-850/60 pt-4">
                  <div className="space-y-0.5">
                    <p className="font-bold text-white">Project Measurement Units</p>
                    <p className="text-[10px] text-neutral-455">Scales standard drywall dimensions representation</p>
                  </div>
                  <div className="flex border rounded overflow-hidden border-neutral-800 bg-[#0b0c10]">
                    <button
                      onClick={() => setUnit("ft")}
                      className={`text-[10px] px-3 py-1 font-mono uppercase font-bold ${
                        unit === "ft" ? "bg-amber-500 text-black" : "text-neutral-450 hover:text-white"
                      }`}
                    >
                      ft
                    </button>
                    <button
                      onClick={() => setUnit("m")}
                      className={`text-[10px] px-3 py-1 font-mono uppercase font-bold ${
                        unit === "m" ? "bg-amber-500 text-black" : "text-neutral-450 hover:text-white"
                      }`}
                    >
                      meters
                    </button>
                  </div>
                </div>

                {/* 3. Language Selector */}
                <div className="flex justify-between items-center text-xs border-t border-neutral-850/60 pt-4">
                  <div className="space-y-0.5">
                    <p className="font-bold text-white">Workspace Sourcing Language</p>
                    <p className="text-[10px] text-neutral-450">Modifies details listings in the inspector drawer</p>
                  </div>
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value as any)}
                    className="bg-[#0b0c10] border border-neutral-800 text-white rounded text-xs p-1 focus:outline-none uppercase font-mono tracking-wider font-semibold"
                  >
                    <option value="EN">English</option>
                    <option value="ES">Español</option>
                    <option value="FR">Français</option>
                  </select>
                </div>

                {/* 4. Sign Out button */}
                <div className="pt-4 border-t border-neutral-850/70 text-center">
                  <button
                    onClick={() => {
                      alert("Successfully signed out Julianne Valentin's staging session.");
                    }}
                    className="text-xs text-rose-400 font-bold hover:text-rose-350 tracking-wider uppercase font-mono flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sign out coordinator session</span>
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}

      </main>

      {/* Persistent global footer */}
      <footer className={`py-8 text-center text-xs border-t mt-12 ${
        darkMode ? "bg-[#14161d] border-neutral-850 text-neutral-450" : "bg-neutral-100 border-neutral-200 text-neutral-500"
      }`}>
        <p className="font-serif">Aura Interiors &bull; VisionSpace AI Platform</p>
        <p className="text-[10px] font-mono text-neutral-500 mt-2 uppercase tracking-wide">
          Developed under specifications &mdash; NYC AI Hackathon Sourcing Hubs
        </p>
      </footer>
    </div>
  );
}
