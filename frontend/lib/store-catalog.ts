/**
 * Mirror of backend/src/store/store-catalog.ts — keep in sync.
 */
export type StoreCatalogItem = {
  vendorCode: string;
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  salesPerUnit: number;
  vendorPayablePerUnit: number;
  cogsPerUnit: number;
  patronagePerUnit: number;
};

export const STORE_CATALOG: StoreCatalogItem[] = [
  {
    vendorCode: "B2C-DEMO",
    sku: "RICE-5KG",
    name: "Premium Rice 5kg",
    category: "Groceries",
    unitPrice: 350,
    salesPerUnit: 50,
    vendorPayablePerUnit: 300,
    cogsPerUnit: 300,
    patronagePerUnit: 5,
  },
  {
    vendorCode: "B2C-DEMO",
    sku: "OIL-1L",
    name: "Cooking Oil 1L",
    category: "Groceries",
    unitPrice: 120,
    salesPerUnit: 20,
    vendorPayablePerUnit: 100,
    cogsPerUnit: 100,
    patronagePerUnit: 2,
  },
  {
    vendorCode: "B2C-DEMO",
    sku: "SUGAR-1KG",
    name: "Brown Sugar 1kg",
    category: "Groceries",
    unitPrice: 85,
    salesPerUnit: 12,
    vendorPayablePerUnit: 73,
    cogsPerUnit: 73,
    patronagePerUnit: 1.5,
  },
  {
    vendorCode: "B2C-DEMO",
    sku: "NOODLES-5PK",
    name: "Instant Noodles (5-pack)",
    category: "Groceries",
    unitPrice: 65,
    salesPerUnit: 10,
    vendorPayablePerUnit: 55,
    cogsPerUnit: 55,
    patronagePerUnit: 1,
  },
  {
    vendorCode: "B2C-DEMO",
    sku: "MILK-1L",
    name: "Fresh Milk 1L",
    category: "Dairy",
    unitPrice: 95,
    salesPerUnit: 15,
    vendorPayablePerUnit: 80,
    cogsPerUnit: 80,
    patronagePerUnit: 1.5,
  },
  {
    vendorCode: "B2C-DEMO",
    sku: "SOAP-BAR",
    name: "Coop Bath Soap",
    category: "Household",
    unitPrice: 45,
    salesPerUnit: 8,
    vendorPayablePerUnit: 37,
    cogsPerUnit: 37,
    patronagePerUnit: 0.5,
  },
];

export const DEMO_CART_SKUS = [
  { sku: "RICE-5KG", quantity: 1 },
  { sku: "OIL-1L", quantity: 1 },
] as const;

export function findCatalogItem(sku: string): StoreCatalogItem | undefined {
  const key = sku.trim().toUpperCase();
  return STORE_CATALOG.find((item) => item.sku.toUpperCase() === key);
}

export function catalogForApi() {
  return STORE_CATALOG.map(
    ({ vendorCode, sku, name, category, unitPrice, patronagePerUnit }) => ({
      vendorCode,
      sku,
      name,
      category,
      unitPrice,
      patronagePerUnit,
      currency: "PHP",
    }),
  );
}
