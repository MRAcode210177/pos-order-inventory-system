export interface CategoryGroup {
  id: string;
  name: string;
  subcategories: string[];
}

export const CATEGORY_TREE: CategoryGroup[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    subcategories: [
      'Audio & Headphones',
      'Mobile Accessories',
      'Wearable Technology',
      'Computer Peripherals',
      'Smart Home',
      'Photography & Video',
    ],
  },
  {
    id: 'apparel',
    name: 'Apparel & Accessories',
    subcategories: [
      'Tops & Outerwear',
      'Bottoms',
      'Footwear',
      'Accessories',
      'Headwear',
      'Dresses & One-Pieces',
    ],
  },
  {
    id: 'home',
    name: 'Home & Living',
    subcategories: [
      'Kitchen & Dining',
      'Cookware & Tools',
      'Bed & Bath',
      'Home Fragrance & Decor',
      'Lighting',
    ],
  },
  {
    id: 'beauty',
    name: 'Health & Beauty',
    subcategories: [
      'Skincare',
      'Cosmetics',
      'Men\'s Grooming',
      'Bath & Body',
      'Hair Care',
      'Sun Care',
    ],
  },
  {
    id: 'food',
    name: 'Food',
    subcategories: [
      'Bakery',
      'Beverages',
      'Merchandise',
      'Food Items',
    ],
  },
];

/**
 * Get all subcategories across all category groups
 */
export function getAllSubcategories(): string[] {
  return CATEGORY_TREE.flatMap((group) => group.subcategories);
}

/**
 * Find the parent Main Category name for a given subcategory string
 */
export function getParentCategory(subcategoryName: string): string | null {
  if (!subcategoryName) return null;
  const nameLower = subcategoryName.toLowerCase().trim();
  
  for (const group of CATEGORY_TREE) {
    if (group.name.toLowerCase() === nameLower) return group.name;
    if (group.subcategories.some((sub) => sub.toLowerCase() === nameLower)) {
      return group.name;
    }
  }
  return null;
}

/**
 * Get subcategories for a given parent category name
 */
export function getSubcategoriesForParent(parentName: string): string[] {
  const group = CATEGORY_TREE.find(
    (g) => g.name.toLowerCase() === parentName.toLowerCase()
  );
  return group ? group.subcategories : [];
}

/**
 * Check if a product's category matches a selected filter
 */
export function matchesCategoryFilter(
  productCategory: string | undefined,
  selectedCategory: string
): boolean {
  if (!selectedCategory || selectedCategory === 'All') return true;
  if (!productCategory) return false;

  const prodLower = productCategory.toLowerCase().trim();
  const selLower = selectedCategory.toLowerCase().trim();

  // 1. Exact match (either subcategory or main category)
  if (prodLower === selLower) return true;

  // 2. Check if selected category is a Main Category group (e.g. 'Electronics' or 'Food')
  const group = CATEGORY_TREE.find((g) => g.name.toLowerCase() === selLower);
  if (group) {
    return (
      prodLower === group.name.toLowerCase() ||
      group.subcategories.some((sub) => sub.toLowerCase() === prodLower)
    );
  }

  // 3. Fallback partial match
  return prodLower.includes(selLower);
}
