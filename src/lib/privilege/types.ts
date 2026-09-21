export type PrivilegeProduct = {
  id: string;
  catalogId: string;
  name: string;
  variant: string;
  colors: string[];
  images: string[];
  price: number;
  originalPrice: number;
  gsm: string;
  tag: string;
  tagType?: "stock" | "drop";
  badge?: string;
  image: string;
  sizes: string[];
  defaultSize: string;
  defaultColor: string;
};

export type PrivilegeTestimonial = {
  id: string;
  initials: string;
  name: string;
  location: string;
  rating: number;
  paragraphs: string[];
  orderedItem: string;
};

export type ValuePillar = {
  index: string;
  category: string;
  title: string;
  description: string;
  iconName: "texture" | "straighten" | "inventory";
};
