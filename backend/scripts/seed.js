/**
 * MongoDB Initialization Script
 * Runs automatically when the MongoDB container starts (via docker-compose)
 * Seeds the database with initial categories, tags, and test data
 */

// This script runs in MongoDB directly via mongosh
// Accessed as: mongodb://admin:changeme@mongodb:27017/mareservation?authSource=admin

db = db.getSiblingDB('mareservation');

// Create indexes
print('Creating indexes...');
db.users.createIndex({ email: 1 }, { unique: true });
db.venues.createIndex({ ownerId: 1 });
db.venues.createIndex({ slug: 1 }, { unique: true });
db.tables.createIndex({ venueId: 1 });
db.reservations.createIndex({ userId: 1 });
db.reservations.createIndex({ venueId: 1 });
db.reservations.createIndex({ status: 1 });
db.reservations.createIndex({ startAt: 1, endAt: 1 });

// Seed categories
print('Seeding categories...');
db.categories.deleteMany({});
const categories = [
  { name: 'Café', slug: 'cafe', icon: 'Coffee', color: '#8B6914' },
  { name: 'Restaurant', slug: 'restaurant', icon: 'UtensilsCrossed', color: '#D97706' },
  { name: 'Hôtel', slug: 'hotel', icon: 'Building2', color: '#3B82F6' },
  { name: 'Cinéma', slug: 'cinema', icon: 'Film', color: '#EC4899' },
  { name: 'Coworking', slug: 'coworking', icon: 'Laptop', color: '#10B981' },
  { name: 'Événement', slug: 'event', icon: 'Calendar', color: '#F59E0B' },
];
db.categories.insertMany(categories);
print(`✓ Seeded ${categories.length} categories`);

// Seed tags
print('Seeding tags...');
db.tags.deleteMany({});
const tags = [
  { name: 'WiFi', slug: 'wifi', category: 'amenities' },
  { name: 'Climatisé', slug: 'air-conditioning', category: 'amenities' },
  { name: 'Parking', slug: 'parking', category: 'amenities' },
  { name: 'Vue panoramique', slug: 'view', category: 'amenities' },
  { name: 'Musique live', slug: 'live-music', category: 'amenities' },
  { name: 'Terrasse', slug: 'terrace', category: 'amenities' },
  { name: 'Pet-friendly', slug: 'pet-friendly', category: 'amenities' },
];
db.tags.insertMany(tags);
print(`✓ Seeded ${tags.length} tags`);

// Seed admin user
print('Seeding admin user...');
db.users.deleteMany({ email: 'admin@mareservation.tn' });
db.users.insertOne({
  email: 'admin@mareservation.tn',
  firstName: 'Admin',
  lastName: 'User',
  fullName: 'Admin User',
  passwordHash: '$2a$10$YEyPQ2tflNHv0UvB8Pf5De8VvtXRxVjnWWxEa/sxNqN2dNcB3G7S6', // bcrypt hash of 'admin123'
  role: 'ADMIN',
  status: 'ACTIVE',
  emailVerified: true,
  verifiedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  isDeleted: false,
});
print('✓ Seeded admin user (email: admin@mareservation.tn, password: admin123)');

// Seed default settings
print('Seeding app settings...');
db.appsettings.deleteMany({});
db.appsettings.insertOne({
  key: 'PLATFORM_CONFIG',
  value: {
    platformName: 'Ma Reservation',
    platformVersion: '1.0.0',
    maxImageUploadSizeMB: 50,
    maxVideoUploadSizeMB: 500,
    supportEmail: 'support@mareservation.tn',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
});
print('✓ Seeded app settings');

print('\n✅ Database seeding complete!');
