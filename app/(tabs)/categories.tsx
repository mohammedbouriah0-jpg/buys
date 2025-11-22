import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  I18nManager,
} from "react-native";
import { Link } from "expo-router";
import { categoriesAPI } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/language-context";
import {
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Shirt,
  Home,
  Sparkles,
  Dumbbell,
  BookOpen,
  Baby,
  UtensilsCrossed,
  Car,
  Watch,
} from "lucide-react-native";

// Mapper les icônes en fonction du nom de la catégorie
const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();

  if (
    name.includes("électronique") ||
    name.includes("electronique") ||
    name.includes("tech")
  ) {
    return Smartphone;
  }
  if (
    name.includes("mode") ||
    name.includes("vêtement") ||
    name.includes("vetement") ||
    name.includes("habit")
  ) {
    return Shirt;
  }
  if (
    name.includes("maison") ||
    name.includes("jardin") ||
    name.includes("déco")
  ) {
    return Home;
  }
  if (
    name.includes("beauté") ||
    name.includes("santé") ||
    name.includes("cosmétique")
  ) {
    return Sparkles;
  }
  if (
    name.includes("sport") ||
    name.includes("loisir") ||
    name.includes("fitness")
  ) {
    return Dumbbell;
  }
  if (
    name.includes("livre") ||
    name.includes("média") ||
    name.includes("media") ||
    name.includes("culture")
  ) {
    return BookOpen;
  }
  if (
    name.includes("jouet") ||
    name.includes("enfant") ||
    name.includes("bébé") ||
    name.includes("bebe")
  ) {
    return Baby;
  }
  if (
    name.includes("alimentation") ||
    name.includes("nourriture") ||
    name.includes("food")
  ) {
    return UtensilsCrossed;
  }
  if (
    name.includes("auto") ||
    name.includes("voiture") ||
    name.includes("moto")
  ) {
    return Car;
  }
  if (
    name.includes("bijou") ||
    name.includes("accessoire") ||
    name.includes("montre")
  ) {
    return Watch;
  }

  // Icône par défaut
  return Smartphone;
};

interface Category {
  id: number;
  name: string;
  products_count: number;
}

// Traductions des catégories
const categoryTranslations: Record<string, Record<string, string>> = {
  'Alimentation': { ar: 'الأغذية', en: 'Food' },
  'Automobile': { ar: 'السيارات', en: 'Automotive' },
  'Beauté': { ar: 'الجمال', en: 'Beauty' },
  'Beauté & Santé': { ar: 'الجمال والصحة', en: 'Beauty & Health' },
  'Bijoux & Accessoires': { ar: 'المجوهرات والإكسسوارات', en: 'Jewelry & Accessories' },
  'Électronique': { ar: 'الإلكترونيات', en: 'Electronics' },
  'Mode': { ar: 'الموضة', en: 'Fashion' },
  'Mode & Vêtements': { ar: 'الموضة والملابس', en: 'Fashion & Clothing' },
  'Maison': { ar: 'المنزل', en: 'Home' },
  'Maison & Jardin': { ar: 'المنزل والحديقة', en: 'Home & Garden' },
  'Sport': { ar: 'الرياضة', en: 'Sport' },
  'Sport & Loisirs': { ar: 'الرياضة والترفيه', en: 'Sports & Leisure' },
  'Sports & Loisirs': { ar: 'الرياضة والترفيه', en: 'Sports & Leisure' },
  'Livres & Médias': { ar: 'الكتب والوسائط', en: 'Books & Media' },
  'Jouets & Enfants': { ar: 'الألعاب والأطفال', en: 'Toys & Kids' },
  'Vêtements': { ar: 'الملابس', en: 'Clothing' },
  'Vêtement': { ar: 'الملابس', en: 'Clothing' },
  'Vetements': { ar: 'الملابس', en: 'Clothing' },
  'Vetement': { ar: 'الملابس', en: 'Clothing' },
  'المنزل والحديقة': { ar: 'المنزل والحديقة', en: 'Home & Garden' },
};

const translateCategory = (categoryName: string, language: string): string => {
  if (language === 'fr') return categoryName;
  const translation = categoryTranslations[categoryName];
  if (translation && translation[language]) {
    return translation[language];
  }
  return categoryName;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, isRTL, language } = useLanguage();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await categoriesAPI.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (categories.length === 0 && !loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <Text style={[styles.title, isRTL && styles.textRTL]}>{t('categories')}</Text>
          <Text style={[styles.subtitle, isRTL && styles.textRTL]}>{t('exploreCategories')}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('noCategories')}</Text>
          <Text style={[styles.emptySubtext, isRTL && styles.textRTL]}>{t('noCategoriesSubtitle')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={[styles.title, isRTL && styles.textRTL]}>{t('allCategories')}</Text>
        <Text style={[styles.subtitle, isRTL && styles.textRTL]}>{t('exploreCategories')}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((category, index) => {
          const IconComponent = getCategoryIcon(category.name);
          const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;
          
          return (
            <Link key={category.id} href={`/categories/${category.id}`} asChild>
              <TouchableOpacity style={styles.categoryCard} activeOpacity={0.7}>
                <View style={[styles.cardContent, isRTL && styles.cardContentRTL]}>
                  <View style={[styles.leftContent, isRTL && styles.leftContentRTL]}>
                    <View
                      style={[
                        styles.iconWrapper,
                        { backgroundColor: getBackgroundColor(index) },
                      ]}
                    >
                      <IconComponent
                        size={26}
                        color={getIconColor(index)}
                        strokeWidth={2}
                      />
                    </View>
                    <View style={styles.textContent}>
                      <Text style={[styles.categoryName, isRTL && styles.textRTL]}>
                        {translateCategory(category.name, language)}
                      </Text>
                      <Text style={[styles.categoryCount, isRTL && styles.textRTL]}>
                        {category.products_count} {t('productsCount')}
                      </Text>
                    </View>
                  </View>
                  <ChevronIcon size={20} color="#c7c7cc" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            </Link>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Couleurs neutres et élégantes pour le fond
const getBackgroundColor = (index: number): string => {
  const colors = [
    "#f0f4ff", // Bleu très pâle
    "#fff0f6", // Rose très pâle
    "#f0fff4", // Vert très pâle
    "#fffbeb", // Jaune très pâle
    "#fef2f2", // Rouge très pâle
    "#faf5ff", // Violet très pâle
    "#ecfeff", // Cyan très pâle
    "#fff7ed", // Orange très pâle
    "#f5f3ff", // Indigo très pâle
    "#fef2f2", // Rose pâle
  ];
  return colors[index % colors.length];
};

// Couleurs des icônes (plus saturées)
const getIconColor = (index: number): string => {
  const colors = [
    "#3b82f6", // Bleu
    "#ec4899", // Rose
    "#10b981", // Vert
    "#f59e0b", // Jaune
    "#ef4444", // Rouge
    "#8b5cf6", // Violet
    "#06b6d4", // Cyan
    "#f97316", // Orange
    "#6366f1", // Indigo
    "#f43f5e", // Rose vif
  ];
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 28,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#000",
    marginBottom: 6,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 17,
    color: "#6b7280",
    fontWeight: "400",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  categoryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  textContent: {
    flex: 1,
    gap: 3,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    letterSpacing: -0.2,
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9ca3af",
  },
  // RTL Styles
  headerRTL: {
    alignItems: 'flex-end',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cardContentRTL: {
    flexDirection: 'row-reverse',
  },
  leftContentRTL: {
    flexDirection: 'row-reverse',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
