import { motion, type Easing } from "framer-motion";
import {
  Package,
  Boxes,
  Lock,
  Grid3X3,
  FileText,
  ExternalLink,
  Code2,
  MessageSquare,
} from "lucide-react";

interface HomeViewProps {
  onNavigate: (tab: string) => void;
}

/* ── Tool card data ─────────────────────────────────────────────── */
const tools = [
  {
    id: "scs",
    icon: Package,
    label: "SCS",
    description: "Official extractor and packer",
  },
  {
    id: "pix",
    icon: Boxes,
    label: "PIX",
    description: "Extractor and converter",
  },
  {
    id: "sxc",
    icon: Lock,
    label: "SXC",
    description: "Advanced extractor, finder and packer",
  },
  {
    id: "tobj",
    icon: Grid3X3,
    label: "TOBJ",
    description: "Full TOBJ editor",
  },
  {
    id: "def",
    icon: FileText,
    label: "DEF",
    description: "Accessory def creator",
  },
];

/* ── Link card data ─────────────────────────────────────────────── */
const links = [
  {
    icon: MessageSquare,
    label: "SCS Forum",
    description: "Forum topic and all information about SCS Hub",
    url: "",
  },
  {
    icon: Code2,
    label: "GitHub",
    description: "Repository with source code and details",
    url: "https://github.com/Laakdal/quicksave-qui/",
  },

];

/* ── Fade-up stagger variants ──────────────────────────────────── */
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as Easing } },
};

/* ── Component ─────────────────────────────────────────────────── */
export function HomeView({ onNavigate }: HomeViewProps) {
  return (
    <div className="w-full h-full overflow-y-auto">
      {/* ── Hero Banner ──────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ minHeight: 300 }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        {/* Gradient fill */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, transparent 100%)",
          }}
        />

        {/* Accent glow blob */}
        <div
          className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full opacity-10 blur-[120px]"
          style={{ backgroundColor: "rgb(var(--accent))" }}
        />

        <div className="relative z-10 px-10 pt-10 pb-4">
          <motion.h1
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-[42px] font-semibold tracking-tight drop-shadow-lg"
            style={{ color: "var(--text-primary)" }}
          >
            Project Quicksave
          </motion.h1>

          {/* ── Link cards ── */}
          <motion.div
            className="flex gap-4 mt-6 overflow-x-auto pb-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <motion.a
                  key={link.label}
                  variants={itemVariants}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative flex flex-col justify-between w-[200px] min-w-[200px] h-[210px] rounded-xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1"
                  style={{
                    backgroundColor: "rgb(var(--panel-dark))",
                    border: "1px solid var(--border-subtle)",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                  }}
                >
                  <div>
                    <Icon
                      size={44}
                      strokeWidth={1.2}
                      className="mb-4 transition-colors"
                      style={{ color: "var(--text-primary)" }}
                    />
                    <p
                      className="text-base font-semibold mb-1"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {link.label}
                    </p>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {link.description}
                    </p>
                  </div>
                  <ExternalLink
                    size={14}
                    className="absolute bottom-5 right-5 opacity-40 group-hover:opacity-80 transition-opacity"
                    style={{ color: "var(--text-secondary)" }}
                  />
                </motion.a>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* ── Tools Section ────────────────────────────────────────── */}
      <div className="px-10 pt-6 pb-10">
        <p
          className="text-2xl font-semibold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Tools
        </p>

        <motion.div
          className="flex flex-wrap gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <motion.button
                key={tool.id}
                variants={itemVariants}
                onClick={() => onNavigate(tool.id)}
                className="group flex items-center gap-5 w-[360px] h-[90px] rounded-xl px-5 cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  backgroundColor: "rgb(var(--panel-dark))",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                  style={{ backgroundColor: "rgba(var(--accent), 0.08)" }}
                >
                  <Icon
                    size={24}
                    strokeWidth={1.4}
                    style={{ color: "rgb(var(--accent))" }}
                  />
                </div>
                <div className="text-left">
                  <p
                    className="text-base font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {tool.label}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {tool.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
