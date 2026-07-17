import {
  Zap, Wrench, Hammer, Snowflake, Paintbrush, Sparkles, Home, ChefHat, Car, Shield, Trees,
  Scissors, Flower, Palette, Shirt, GraduationCap, BookOpen, Music, Music2, Trophy, Dumbbell,
  Heart, Camera, Video, PenTool, Code, Smartphone, Laptop, PartyPopper, Disc3, LayoutGrid,
  Building2, Scale, Calculator, Briefcase, Package, Dog, Baby, Stethoscope, HeartHandshake,
  Flame, Layers,
  type LucideIcon,
} from "lucide-react";

const map: Record<string, LucideIcon> = {
  Zap, Wrench, Hammer, Snowflake, Paintbrush, Sparkles, Home, ChefHat, Car, Shield, Trees,
  Scissors, Flower, Palette, Shirt, GraduationCap, BookOpen, Music, Music2, Trophy, Dumbbell,
  Heart, Camera, Video, PenTool, Code, Smartphone, Laptop, PartyPopper, Disc3, LayoutGrid,
  Building2, Scale, Calculator, Briefcase, Package, Dog, Baby, Stethoscope, HeartHandshake,
  Flame, Brick: Layers,
};

export function getCategoryIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Wrench;
  return map[name] ?? Wrench;
}