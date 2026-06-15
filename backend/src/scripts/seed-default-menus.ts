/**
 * Idempotent default-menu seeder.
 *
 * Gives every RESTAURANT / CAFE / CAFE_LOUNGE venue that currently has NO menu
 * items a sensible default carte, so the public "Carte" tab is never empty.
 * Venues that already have a menu are left untouched — safe to run on every
 * deploy.
 *
 * Local:  npm run seed:menus
 * Deploy: docker compose exec -T backend node dist/scripts/seed-default-menus.js
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { MenuItem, type MenuCategory } from '../models/MenuItem';
import { Venue } from '../models/Venue';

type Line = { category: MenuCategory; name: string; description: string; price: number; isPopular?: boolean };

const RESTAURANT_MENU: Line[] = [
  // Entrées
  { category: 'entree', name: 'Brik à l\'œuf', description: 'Feuille de malsouka croustillante, œuf coulant, thon, persil et câpres.', price: 6, isPopular: true },
  { category: 'entree', name: 'Salade tunisienne', description: 'Tomates, concombre, poivrons, oignon, thon, œuf et olives.', price: 9 },
  { category: 'entree', name: 'Chorba frik', description: 'Soupe d\'agneau au blé concassé, coriandre et citron.', price: 8 },
  { category: 'entree', name: 'Ojja merguez', description: 'Œufs pochés, merguez, tomates, poivrons et harissa.', price: 12, isPopular: true },
  // Plats
  { category: 'plat', name: 'Couscous royal', description: 'Semoule fine, agneau, poulet, merguez et légumes mijotés.', price: 28, isPopular: true },
  { category: 'plat', name: 'Poisson grillé du jour', description: 'Pêche du marché grillée, chermoula, légumes de saison.', price: 34, isPopular: true },
  { category: 'plat', name: 'Escalope milanaise', description: 'Escalope panée, spaghetti sauce tomate, parmesan.', price: 22 },
  { category: 'plat', name: 'Pâtes fruits de mer', description: 'Linguine, crevettes, calamars, coques, tomates cerises.', price: 26 },
  { category: 'plat', name: 'Entrecôte grillée', description: 'Viande maturée, sauce au poivre, frites maison.', price: 38 },
  // Desserts
  { category: 'dessert', name: 'Tiramisu maison', description: 'Mascarpone, café espresso, cacao amer.', price: 10, isPopular: true },
  { category: 'dessert', name: 'Assiette de pâtisseries orientales', description: 'Baklava, cornes de gazelle, makroudh.', price: 9 },
  { category: 'dessert', name: 'Crème brûlée', description: 'Vanille de Madagascar, caramel craquant.', price: 9 },
  // Boissons
  { category: 'boisson', name: 'Eau minérale 50cl', description: 'Plate ou gazeuse.', price: 3 },
  { category: 'boisson', name: 'Citronnade fraîche', description: 'Citrons pressés, menthe, sirop maison.', price: 6 },
  { category: 'boisson', name: 'Café express', description: 'Arabica torréfié artisanalement.', price: 4 },
];

const CAFE_MENU: Line[] = [
  // Boissons
  { category: 'boisson', name: 'Espresso', description: 'Café serré, corsé et intense.', price: 3.5, isPopular: true },
  { category: 'boisson', name: 'Cappuccino', description: 'Espresso, lait vapeur et mousse onctueuse.', price: 5.5, isPopular: true },
  { category: 'boisson', name: 'Café crème', description: 'Espresso allongé, mousse de lait.', price: 5 },
  { category: 'boisson', name: 'Thé à la menthe', description: 'Thé vert, menthe fraîche, sucre de canne.', price: 4 },
  { category: 'boisson', name: 'Chocolat chaud', description: 'Chocolat fondu, lait entier, chantilly.', price: 7 },
  { category: 'boisson', name: 'Jus d\'orange frais', description: 'Pressé à la minute, 100% naturel.', price: 6.5 },
  { category: 'boisson', name: 'Smoothie mangue passion', description: 'Mangue fraîche, fruit de la passion, yaourt.', price: 9 },
  // Entrées / snacks
  { category: 'entree', name: 'Avocado toast', description: 'Pain au levain grillé, avocat, œuf poché, sésame.', price: 14, isPopular: true },
  { category: 'entree', name: 'Granola bowl', description: 'Granola maison, fruits de saison, miel, lait de coco.', price: 12 },
  // Plats légers
  { category: 'plat', name: 'Club sandwich', description: 'Poulet grillé, bacon, salade, tomate, frites.', price: 18, isPopular: true },
  { category: 'plat', name: 'Salade César', description: 'Romaine, parmesan, croûtons, poulet grillé, sauce césar.', price: 16 },
  // Desserts
  { category: 'dessert', name: 'Cheesecake fruits rouges', description: 'Base biscuitée, cream cheese, coulis fraise-framboise.', price: 10, isPopular: true },
  { category: 'dessert', name: 'Crêpe Nutella banane', description: 'Crêpe fine, Nutella, banane, chantilly.', price: 8 },
  { category: 'dessert', name: 'Brownie chocolat noisettes', description: 'Fondant, éclats de noisettes, glace vanille.', price: 11 },
];

async function run() {
  await connectDatabase();
  try {
    const venues = await Venue.find({ type: { $in: ['RESTAURANT', 'CAFE', 'CAFE_LOUNGE'] } })
      .select('_id name type')
      .lean();

    let seededVenues = 0;
    let seededItems = 0;
    for (const v of venues) {
      const existing = await MenuItem.countDocuments({ venueId: (v as any)._id });
      if (existing > 0) continue; // never overwrite an existing menu
      const menu = (v as any).type === 'RESTAURANT' ? RESTAURANT_MENU : CAFE_MENU;
      const payload = menu.map((m) => ({
        venueId: (v as any)._id,
        category: m.category,
        name: m.name,
        description: m.description,
        price: m.price,
        isPopular: m.isPopular ?? false,
        isAvailable: true,
      }));
      await MenuItem.insertMany(payload);
      seededVenues += 1;
      seededItems += payload.length;
      console.log(`✅ ${(v as any).name} (${(v as any).type}) — ${payload.length} articles`);
    }

    if (seededVenues === 0) {
      console.log('ℹ️  All restaurants/cafés already have a menu — nothing to seed.');
    } else {
      console.log(`🍽️  Seeded ${seededItems} items across ${seededVenues} venue(s) without a menu.`);
    }
  } finally {
    await mongoose.connection.close();
  }
}

run().catch((err) => {
  console.error('❌ Default-menu seed failed:', err);
  mongoose.connection.close().finally(() => process.exit(1));
});
