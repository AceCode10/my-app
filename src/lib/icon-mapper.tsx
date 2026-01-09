import { 
  Calculator, 
  Beaker, 
  Atom, 
  Microscope, 
  BookOpen, 
  Book, 
  Languages, 
  Landmark, 
  Globe, 
  Scale, 
  TrendingUp, 
  Briefcase, 
  Cpu, 
  Palette, 
  Music,
  type LucideIcon 
} from 'lucide-react';

// Map icon names from database to Lucide icon components
const iconMap: Record<string, LucideIcon> = {
  'calculator': Calculator,
  'flask': Beaker,
  'atom': Atom,
  'microscope': Microscope,
  'book-open': BookOpen,
  'book': Book,
  'languages': Languages,
  'landmark': Landmark,
  'globe': Globe,
  'scale': Scale,
  'trending-up': TrendingUp,
  'briefcase': Briefcase,
  'cpu': Cpu,
  'palette': Palette,
  'music': Music,
};

export function getIconComponent(iconName?: string): LucideIcon {
  if (!iconName) return BookOpen;
  return iconMap[iconName.toLowerCase()] || BookOpen;
}
