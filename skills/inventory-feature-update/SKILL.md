---
name: Inventory Feature Update
description: Instructions for updating inventory management features (Types, Hooks, Table, Cards) in the Next.js + Supabase application.
---

# Inventory Feature Update Guide

This skill outlines the standard procedure for adding or modifying features in the inventory management system, specifically focusing on data display improvements.

## 1. Type Definitions
- **Location**: `src/types/index.ts`
- **Action**: Define shared types here to avoid circular dependencies and ensure consistency.
- **Example**:
  ```typescript
  export type WorkInProgress = {
      id: string;
      productId: string;
      quantity: number;
      // ...other fields
  };
  ```

## 2. Data Fetching Hooks
- **Location**: `src/hooks/` (e.g., `use-work-in-progress.ts`, `use-supabase-data.ts`)
- **Action**: 
  - Fetch data from API.
  - process/aggregate data if necessary (e.g., `calculateWIPByProduct` returning `Map`).
  - RETURN typed data structures.

## 3. Page Component Integration
- **Location**: `src/app/(dashboard)/inventory/bags/page.tsx`
- **Action**:
  - Call the hook.
  - Create `Map` or data structures for efficient lookup.
  - Pass data to presentation components (`BagsInventoryTable`, `BagsInventoryCards`).

## 4. UI Components Update
### Table View
- **Location**: `src/components/inventory/bags-inventory-table.tsx`
- **Action**:
  - Update `Props` interface to accept new data types.
  - Update `TableHeader` if columns need reordering or adding.
  - Update `TableBody` cells (`TableCell`) to render detailed data.
  - **Click Handlers**: Ensure standard interaction (e.g., opening dialogs) is maintained.

### Card View
- **Location**: `src/components/inventory/bags-inventory-cards.tsx`
- **Action**:
  - Update `Props` interface.
  - Render summary or key details in the card layout.
  - Maintain responsive design and visual hierarchy.

## 5. Verification
- Verify strictly typed props.
- Check "List" and "Grid" (Card) views.
- Ensure click handlers work in both views.
