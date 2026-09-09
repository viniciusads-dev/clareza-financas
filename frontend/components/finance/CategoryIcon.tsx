"use client";
import { Briefcase, Car, Clapperboard, GraduationCap, Heart, House, Repeat, Shapes, ShoppingBag, Utensils } from "lucide-react";

const icons: Record<string, typeof Shapes> = {
  Alimentação: Utensils,
  Moradia: House,
  Transporte: Car,
  Saúde: Heart,
  Educação: GraduationCap,
  Lazer: Clapperboard,
  Compras: ShoppingBag,
  Assinaturas: Repeat,
  Salário: Briefcase,
  Freelance: Briefcase,
};
export default function CategoryIcon({
  category,
  color,
}: {
  category: string;
  color: string;
}) {
  const Icon = icons[category] ?? Shapes;
  return (
    <span className="category-icon" style={{ background: `${color}17`, color }}>
      <Icon size={18} />
    </span>
  );
}
