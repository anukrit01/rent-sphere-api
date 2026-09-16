import { PrismaClient, UserRole, AssetStatus, AssetCondition, FuelType, BookingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
  console.log('🌱 Starting Phase 5 comprehensive database seed for RentSphere...');

  // ── Clean existing data in reverse dependency order ──────────────────────
  await prisma.refreshToken.deleteMany();
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.assetImage.deleteMany();
  await prisma.assetSpecification.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  console.log('  ✓ Flushed existing records');

  // Standard development password for all seed accounts
  const passwordHash = await bcrypt.hash('RentSphere@2024', SALT_ROUNDS);

  // ── 1. USERS (9 accounts: 1 Admin, 4 Leasers, 4 Renters) ──────────────────
  console.log('  Creating user accounts...');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@rentsphere.in',
      password: passwordHash,
      name: 'Vikramaditya Rao',
      role: UserRole.ADMIN,
      phone: '+91-9820011000',
      companyName: 'RentSphere Technologies Pvt. Ltd.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      location: 'Bandra-Kurla Complex, Mumbai',
      verified: true,
      rating: 5.0,
    },
  });

  // Leasers (Asset Owners)
  const leaser1 = await prisma.user.create({
    data: {
      email: 'rajesh.sharma@sharmaequip.com',
      password: passwordHash,
      name: 'Rajesh Sharma',
      role: UserRole.LEASER,
      phone: '+91-9811022331',
      companyName: 'Sharma Heavy Equipment & Cranes Co.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      location: 'Okhla Industrial Area, New Delhi',
      verified: true,
      rating: 4.8,
    },
  });

  const leaser2 = await prisma.user.create({
    data: {
      email: 'arun.nair@coastalmachinery.in',
      password: passwordHash,
      name: 'Arun Nair',
      role: UserRole.LEASER,
      phone: '+91-9820133442',
      companyName: 'Coastal Infra Machinery Fleet',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      location: 'Navi Mumbai, Maharashtra',
      verified: true,
      rating: 4.9,
    },
  });

  const leaser3 = await prisma.user.create({
    data: {
      email: 'suresh.reddy@deccanplant.com',
      password: passwordHash,
      name: 'Suresh Reddy',
      role: UserRole.LEASER,
      phone: '+91-9849044553',
      companyName: 'Deccan Plant & Earthmovers',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      location: 'Gachibowli, Hyderabad',
      verified: true,
      rating: 4.7,
    },
  });

  const leaser4 = await prisma.user.create({
    data: {
      email: 'vikram.mehta@gujaratcrane.com',
      password: passwordHash,
      name: 'Vikram Mehta',
      role: UserRole.LEASER,
      phone: '+91-9825055664',
      companyName: 'Western Cranes & Lifting Solutions',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      location: 'Sanand Industrial Estate, Ahmedabad',
      verified: true,
      rating: 4.6,
    },
  });

  // Renters (Contractors & Infra Firms)
  const renter1 = await prisma.user.create({
    data: {
      email: 'priya.patel@patelconstructions.in',
      password: passwordHash,
      name: 'Priya Patel',
      role: UserRole.RENTER,
      phone: '+91-9822066775',
      companyName: 'Patel Infrastructure Projects Ltd.',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      location: 'Shivajinagar, Pune',
      verified: true,
      rating: 4.9,
    },
  });

  const renter2 = await prisma.user.create({
    data: {
      email: 'karthik.s@southbridgeinfra.com',
      password: passwordHash,
      name: 'Karthik Subramanian',
      role: UserRole.RENTER,
      phone: '+91-9880077886',
      companyName: 'Southbridge Civil Engineering Pvt. Ltd.',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      location: 'Whitefield, Bengaluru',
      verified: true,
      rating: 4.8,
    },
  });

  const renter3 = await prisma.user.create({
    data: {
      email: 'rohit.verma@vermaurban.com',
      password: passwordHash,
      name: 'Rohit Verma',
      role: UserRole.RENTER,
      phone: '+91-9810088997',
      companyName: 'Verma Urban Developers',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      location: 'DLF CyberCity, Gurugram, Delhi NCR',
      verified: true,
      rating: 4.5,
    },
  });

  const renter4 = await prisma.user.create({
    data: {
      email: 'ananya.sen@bengalroadworks.in',
      password: passwordHash,
      name: 'Ananya Sen',
      role: UserRole.RENTER,
      phone: '+91-9830099008',
      companyName: 'Eastern Road & Bridge Works',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      location: 'Salt Lake Sector V, Kolkata',
      verified: true,
      rating: 4.7,
    },
  });

  console.log('  ✓ 9 Users created successfully');

  // ── 2. CATEGORIES (6 Categories) ──────────────────────────────────────────
  console.log('  Creating equipment categories...');

  const catExcavators = await prisma.category.create({
    data: {
      name: 'Excavators',
      slug: 'excavators',
      icon: 'excavator',
      description: 'Hydraulic crawler, wheeled, and mini excavators engineered for bulk earthmoving, trenching, structural demolition, and precision civil handling.',
      image: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=800',
      featured: true,
    },
  });

  const catCranes = await prisma.category.create({
    data: {
      name: 'Cranes',
      slug: 'cranes',
      icon: 'crane',
      description: 'High-tonnage all-terrain mobile cranes, truck-mounted hydraulic cranes, and industrial crawler cranes for precision heavy lift and erection operations.',
      image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800',
      featured: true,
    },
  });

  const catWheelLoaders = await prisma.category.create({
    data: {
      name: 'Wheel Loaders',
      slug: 'wheel-loaders',
      icon: 'loader',
      description: 'Front-end wheel loaders and compact articulated loaders designed for material handling, aggregate stockpiling, and rapid truck loading.',
      image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800',
      featured: true,
    },
  });

  const catBulldozers = await prisma.category.create({
    data: {
      name: 'Bulldozers',
      slug: 'bulldozers',
      icon: 'bulldozer',
      description: 'Heavy track-type crawler dozers equipped with hydraulic blades and multi-shank rippers for land clearing, highway grading, and heavy leveling.',
      image: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=800',
      featured: false,
    },
  });

  const catCompactors = await prisma.category.create({
    data: {
      name: 'Compactors',
      slug: 'compactors',
      icon: 'compactor',
      description: 'Vibratory soil compactors, padfoot rollers, and tandem asphalt rollers engineered for sub-base stabilization and highway surfacing.',
      image: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=800',
      featured: false,
    },
  });

  const catForklifts = await prisma.category.create({
    data: {
      name: 'Forklifts',
      slug: 'forklifts',
      icon: 'forklift',
      description: 'Heavy-duty diesel and electric counterbalance forklifts and rough-terrain reach handlers for industrial yards, container freight, and logistics.',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800',
      featured: false,
    },
  });

  console.log('  ✓ 6 Categories created successfully');

  // ── 3. ASSETS, SPECIFICATIONS & IMAGES (18 Equipment listings) ────────────
  console.log('  Creating 18 equipment assets with specifications and galleries...');

  // 1. CAT 320 GC
  const asset1 = await prisma.asset.create({
    data: {
      title: 'CAT 320 GC Hydraulic Crawler Excavator',
      tagline: 'High-productivity 20-ton excavator — fuel-efficient workhorse for infrastructure',
      description: 'The Caterpillar 320 GC balances performance with low operating costs. Features a fuel-efficient C4.4 ACERT engine, smooth electro-hydraulic pilot controls, high ambient cooling capability, and reinforced heavy-duty undercarriage.',
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.EXCELLENT,
      pricePerDay: 15000,
      pricePerWeek: 90000,
      securityDeposit: 50000,
      location: 'Andheri East Industrial Zone',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400069',
      rating: 4.9,
      reviewCount: 14,
      featured: true,
      popular: true,
      operatorProvided: true,
      deliveryAvailable: true,
      deliveryFee: 8500,
      minimumRentalDays: 3,
      features: ['Factory-fitted telematics & GPS', 'Air-conditioned ergonomic ROPS cabin', 'Quick coupler system', 'LED high-output work lights', 'Rear & side-view camera suite'],
      rentalTerms: ['Certified operator included at no surcharge', 'Fuel cost billed to renter or supplied on-site', 'Full comprehensive transit insurance', 'Minimum 3-day rental period'],
      ownerId: leaser2.id,
      categoryId: catExcavators.id,
      specification: {
        create: {
          brand: 'Caterpillar',
          model: '320 GC',
          year: 2023,
          operatingWeight: '20,200 kg',
          enginePower: '107 kW (143 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 1450,
          capacity: '1.00 m³ HD Bucket',
          maxReach: '9.87 m',
          boomLength: '5.70 m',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1200', publicId: 'rentsphere/cat-320-main', sortOrder: 0 },
          { url: 'https://images.unsplash.com/photo-1579487785973-74d2ca7abdd5?w=1200', publicId: 'rentsphere/cat-320-arm', sortOrder: 1 },
          { url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=1200', publicId: 'rentsphere/cat-320-cabin', sortOrder: 2 },
        ],
      },
    },
  });

  // 2. Komatsu PC210-10M0
  const asset2 = await prisma.asset.create({
    data: {
      title: 'Komatsu PC210-10M0 Tracked Excavator',
      tagline: 'Legendary Japanese durability with advanced HydrauMind hydraulics',
      description: 'The PC210-10M0 is engineered for harsh Indian terrain. Features reinforced arm and boom structures, Tier 3 emission compliant engine, low noise cabin, and automated work modes for trenching and rock breaking.',
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.EXCELLENT,
      pricePerDay: 16500,
      pricePerWeek: 99000,
      securityDeposit: 60000,
      location: 'Okhla Phase III',
      city: 'Delhi',
      state: 'Delhi',
      pinCode: '110020',
      rating: 4.8,
      reviewCount: 9,
      featured: true,
      popular: true,
      operatorProvided: true,
      deliveryAvailable: true,
      deliveryFee: 9000,
      minimumRentalDays: 4,
      features: ['KOMTRAX satellite tracking', 'Rock-breaker piping line installed', 'Reinforced heavy-duty tracks', 'Dual-flow auxiliary hydraulics'],
      rentalTerms: ['Skilled certified operator included', 'Breakage due to improper usage billed to renter', 'Minimum 4-day lease'],
      ownerId: leaser1.id,
      categoryId: catExcavators.id,
      specification: {
        create: {
          brand: 'Komatsu',
          model: 'PC210-10M0',
          year: 2022,
          operatingWeight: '21,000 kg',
          enginePower: '123 kW (165 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 2100,
          capacity: '1.10 m³ Mehtab Bucket',
          maxReach: '10.02 m',
          boomLength: '5.85 m',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1579487785973-74d2ca7abdd5?w=1200', publicId: 'rentsphere/komatsu-pc210-main', sortOrder: 0 },
          { url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1200', publicId: 'rentsphere/komatsu-pc210-side', sortOrder: 1 },
        ],
      },
    },
  });

  // 3. JCB JS205 Tracked Excavator (RENTED)
  const asset3 = await prisma.asset.create({
    data: {
      title: 'JCB JS205 Heavy Earthmoving Excavator',
      tagline: 'Robust 20-ton tracked excavator optimized for high breakout forces',
      description: 'Proven Cummins 6BT5.9C turbocharged engine delivering unmatched reliability. Ideal for general construction, quarry loading, irrigation canal digging, and foundation pile cap clearing.',
      status: AssetStatus.RENTED,
      condition: AssetCondition.GOOD,
      pricePerDay: 13000,
      pricePerWeek: 78000,
      securityDeposit: 45000,
      location: 'Peenya Industrial Area',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560058',
      rating: 4.7,
      reviewCount: 11,
      popular: true,
      operatorProvided: true,
      deliveryAvailable: true,
      deliveryFee: 7500,
      minimumRentalDays: 7,
      features: ['LiveLink advanced telematics', 'Heavy-duty X-frame undercarriage', 'IP69 rated electrical harness', 'High breakout forces'],
      rentalTerms: ['Currently deployed on active commercial lease', 'Advance booking required for upcoming mobilization', 'Operator provided'],
      ownerId: leaser3.id,
      categoryId: catExcavators.id,
      specification: {
        create: {
          brand: 'JCB',
          model: 'JS205',
          year: 2021,
          operatingWeight: '20,500 kg',
          enginePower: '104 kW (140 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 3400,
          capacity: '0.90 m³ GP Bucket',
          maxReach: '9.65 m',
          boomLength: '5.70 m',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=1200', publicId: 'rentsphere/jcb-js205-front', sortOrder: 0 },
          { url: 'https://images.unsplash.com/photo-1579487785973-74d2ca7abdd5?w=1200', publicId: 'rentsphere/jcb-js205-boom', sortOrder: 1 },
        ],
      },
    },
  });

  // 4. Volvo EC200D Crawler Excavator
  const asset4 = await prisma.asset.create({
    data: {
      title: 'Volvo EC200D High-Precision Excavator',
      tagline: 'Swedish engineering offering premium operator comfort and fuel efficiency',
      description: 'The EC200D delivers fast cycle times and best-in-class operator ergonomics. Featuring Volvo D5E engine, intelligent ECO mode, robust boom structure, and CareTrack satellite diagnostics.',
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.EXCELLENT,
      pricePerDay: 14500,
      pricePerWeek: 87000,
      securityDeposit: 50000,
      location: 'Chakan Industrial Corridor',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '410501',
      rating: 4.8,
      reviewCount: 6,
      featured: true,
      operatorProvided: true,
      deliveryAvailable: true,
      deliveryFee: 8000,
      minimumRentalDays: 5,
      features: ['Volvo CareTrack fleet management', 'Whisper-quiet air-suspended cab', 'Dual auxiliary piping lines', 'Auto-idle & auto-engine shutdown'],
      rentalTerms: ['Experienced Volvo-certified operator provided', 'Routine maintenance handled by owner technician', 'Minimum 5 days'],
      ownerId: leaser2.id,
      categoryId: catExcavators.id,
      specification: {
        create: {
          brand: 'Volvo',
          model: 'EC200D',
          year: 2023,
          operatingWeight: '20,300 kg',
          enginePower: '115 kW (156 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 1100,
          capacity: '0.92 m³ Bucket',
          maxReach: '9.93 m',
          boomLength: '5.70 m',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1200', publicId: 'rentsphere/volvo-ec200d-main', sortOrder: 0 },
        ],
      },
    },
  });

  // 5. Kobelco SK380XDLC Mining Excavator
  const asset5 = await prisma.asset.create({
    data: {
      title: 'Kobelco SK380XDLC Heavy Mining Excavator',
      tagline: '38-ton extreme-duty giant built for quarry extraction and heavy rock blasting',
      description: 'Purpose-built for demanding quarrying, mining, and heavy excavation. Features extreme heavy-duty (XD) arm, reinforced carbody, Hino turbocharged common-rail diesel engine, and high durability hydraulic pumps.',
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.EXCELLENT,
      pricePerDay: 28000,
      pricePerWeek: 175000,
      securityDeposit: 100000,
      location: 'Patancheru Heavy Industrial Area',
      city: 'Hyderabad',
      state: 'Telangana',
      pinCode: '502319',
      rating: 5.0,
      reviewCount: 5,
      featured: true,
      operatorProvided: true,
      deliveryAvailable: false,
      minimumRentalDays: 14,
      features: ['Mining specification extra-reinforced arm', 'Heavy rock bucket with forged teeth', 'Double-deck cab FOPS Level II', 'GEOSCAN satellite system'],
      rentalTerms: ['Trailer transport mobilized at renter expense', 'Two dedicated certified mining operators provided', 'Minimum 14-day booking'],
      ownerId: leaser3.id,
      categoryId: catExcavators.id,
      specification: {
        create: {
          brand: 'Kobelco',
          model: 'SK380XDLC',
          year: 2023,
          operatingWeight: '37,800 kg',
          enginePower: '200 kW (268 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 1900,
          capacity: '2.10 m³ Quarry Bucket',
          maxReach: '11.05 m',
          boomLength: '6.50 m',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1579487785973-74d2ca7abdd5?w=1200', publicId: 'rentsphere/kobelco-sk380-main', sortOrder: 0 },
        ],
      },
    },
  });

  // 6. Liebherr LTM 1100-4.2 Mobile Crane
  const asset6 = await prisma.asset.create({
    data: {
      title: 'Liebherr LTM 1100-4.2 All-Terrain Mobile Crane',
      tagline: '100-tonne lift capacity with 60m telescopic boom — ultimate precision crane',
      description: 'The Liebherr LTM 1100-4.2 offers unmatched versatility in the 4-axle category. Features a 60m telescopic boom extended with swing-away jib up to 19m, LICCON2 computerized overload management, and active rear-axle steering.',
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.EXCELLENT,
      pricePerDay: 45000,
      pricePerWeek: 280000,
      securityDeposit: 200000,
      location: 'Mayapuri Industrial Area Phase II',
      city: 'Delhi',
      state: 'Delhi',
      pinCode: '110064',
      rating: 4.9,
      reviewCount: 16,
      featured: true,
      popular: true,
      operatorProvided: true,
      deliveryAvailable: false,
      minimumRentalDays: 7,
      features: ['60m 6-section hydraulic telescopic boom', 'LICCON2 intelligent crane control', 'VarioBase asymmetric outrigger configuration', 'Certified high-lift rigging tackle included'],
      rentalTerms: ['Mandatory site survey before deployment', 'Two licensed crane masters and rigger crew included', 'Transit permits arranged by lessor'],
      ownerId: leaser1.id,
      categoryId: catCranes.id,
      specification: {
        create: {
          brand: 'Liebherr',
          model: 'LTM 1100-4.2',
          year: 2022,
          operatingWeight: '48,000 kg',
          enginePower: '350 kW (476 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 2800,
          capacity: '100 tonnes max lift',
          maxReach: '60.00 m Boom',
          boomLength: '60.00 m',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200', publicId: 'rentsphere/liebherr-ltm1100-front', sortOrder: 0 },
          { url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1200', publicId: 'rentsphere/liebherr-ltm1100-boom', sortOrder: 1 },
        ],
      },
    },
  });

  // 7. Sany STC600S Truck Crane
  const asset7 = await prisma.asset.create({
    data: {
      title: 'Sany STC600S Heavy Hydraulic Truck Crane',
      tagline: '60-ton highway-speed mobile crane for bridge girders and industrial erection',
      description: 'The Sany STC600S features a 5-section U-shape high-strength structural steel boom with a base reach of 43.5m. Rapid setup, high transit road speeds, and advanced load moment limiter ensure maximum safety on highway and precast job sites.',
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.GOOD,
      pricePerDay: 32000,
      pricePerWeek: 195000,
      securityDeposit: 120000,
      location: 'Rabale MIDC Industrial Area',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400701',
      rating: 4.7,
      reviewCount: 8,
      featured: true,
      operatorProvided: true,
      deliveryAvailable: false,
      minimumRentalDays: 5,
      features: ['43.5m 5-section U-shaped boom', 'SYMC intelligent load moment limiter', 'Double-pump hydraulic confluence', 'H-type dual outriggers with ground pads'],
      rentalTerms: ['Certified crane operator & signalman included', 'Renter must verify site bearing capacity', 'Minimum 5-day rental'],
      ownerId: leaser2.id,
      categoryId: catCranes.id,
      specification: {
        create: {
          brand: 'Sany',
          model: 'STC600S',
          year: 2021,
          operatingWeight: '42,000 kg',
          enginePower: '276 kW (375 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 3600,
          capacity: '60 tonnes max lift',
          maxReach: '43.50 m',
          boomLength: '43.50 m',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200', publicId: 'rentsphere/sany-stc600-main', sortOrder: 0 },
        ],
      },
    },
  });

  // 8. ACE FX 250 Pick-and-Carry Crane
  const asset8 = await prisma.asset.create({
    data: {
      title: 'Action Construction (ACE) FX 250 Hydra Crane',
      tagline: '25-ton versatile pick-and-carry hydraulic crane for industrial plants',
      description: 'The workhorse of Indian industrial fabrication yards and logistics hubs. The ACE FX 250 features 4-section slotted boom, 4-wheel drive rough-terrain chassis, and front outriggers for enhanced stationary load charts.',
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.GOOD,
      pricePerDay: 18000,
      pricePerWeek: 110000,
      securityDeposit: 60000,
      location: 'Vatva GIDC Phase IV',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pinCode: '382445',
      rating: 4.6,
      reviewCount: 7,
      popular: true,
      operatorProvided: true,
      deliveryAvailable: true,
      deliveryFee: 6500,
      minimumRentalDays: 2,
      features: ['22m 4-section hydraulic boom', 'Safe load indicator (SLI) with audio-visual alarm', 'All-wheel hydrostatic steering', 'Heavy snatch block with swivel hook'],
      rentalTerms: ['Operator included', 'Local transit arranged within 40 km radius', 'Minimum 2-day hire'],
      ownerId: leaser4.id,
      categoryId: catCranes.id,
      specification: {
        create: {
          brand: 'ACE',
          model: 'FX 250',
          year: 2022,
          operatingWeight: '19,800 kg',
          enginePower: '75 kW (101 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 2500,
          capacity: '25 tonnes max pick',
          maxReach: '22.00 m',
          boomLength: '22.00 m',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200', publicId: 'rentsphere/ace-fx250-main', sortOrder: 0 },
        ],
      },
    },
  });

  // 9. Tadano GT-750EL Truck Crane (RENTED)
  const asset9 = await prisma.asset.create({
    data: {
      title: 'Tadano GT-750EL Heavy Industrial Crane',
      tagline: '75-ton round-boom truck crane engineered for metro and refinery erections',
      description: 'High-rigidity 47-meter rounded boom made of ultra-high-tensile steel. Outfitted with Tadano AML-C smart safety limiter, Eco-mode fuel governor, and multi-camera blindspot monitoring.',
      status: AssetStatus.RENTED,
      condition: AssetCondition.EXCELLENT,
      pricePerDay: 38000,
      pricePerWeek: 235000,
      securityDeposit: 150000,
      location: 'Kukatpally Industrial Area',
      city: 'Hyderabad',
      state: 'Telangana',
      pinCode: '500072',
      rating: 4.9,
      reviewCount: 12,
      featured: true,
      operatorProvided: true,
      deliveryAvailable: false,
      minimumRentalDays: 10,
      features: ['47m rounded profile boom', 'Tadano AML-C computer overload system', 'Fuel-saving ECO mode', 'Independent cabin AC units'],
      rentalTerms: ['Active rental on Hyderabad Metro Phase II extension', 'Booking accepted for future project slots', 'Certified operator required'],
      ownerId: leaser3.id,
      categoryId: catCranes.id,
      specification: {
        create: {
          brand: 'Tadano',
          model: 'GT-750EL',
          year: 2023,
          operatingWeight: '43,500 kg',
          enginePower: '260 kW (353 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 1650,
          capacity: '75 tonnes max lift',
          maxReach: '47.00 m',
          boomLength: '47.00 m',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200', publicId: 'rentsphere/tadano-gt750-main', sortOrder: 0 },
        ],
      },
    },
  });

  // 10. Komatsu WA380-8 Wheel Loader
  const asset10 = await prisma.asset.create({
    data: {
      title: 'Komatsu WA380-8 Front Wheel Loader',
      tagline: 'High-speed 3.8 m³ bucket loader for quarries, asphalt plants, and terminals',
      description: 'Equipped with an advanced Komatsu SAA6D107E-3 engine, automated dig assist, modulated clutch, and lock-up torque converter. Outstanding fuel economy and fast dump cycles.',
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.GOOD,
      pricePerDay: 12000,
      pricePerWeek: 72000,
      securityDeposit: 40000,
      location: 'Hinjewadi Phase II',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '411057',
      rating: 4.7,
      reviewCount: 10,
      popular: true,
      operatorProvided: false,
      deliveryAvailable: true,
      deliveryFee: 6000,
      minimumRentalDays: 4,
      features: ['Auto-dig & auto-leveling bucket', 'KOMTRAX fleet telemetry', 'Variable traction control system', 'High-visibility pressurized cabin'],
      rentalTerms: ['Renter provides licensed HMV driver or requests operator at ₹2,000/day', 'Routine greasing required every 50 hours'],
      ownerId: leaser2.id,
      categoryId: catWheelLoaders.id,
      specification: {
        create: {
          brand: 'Komatsu',
          model: 'WA380-8',
          year: 2022,
          operatingWeight: '19,400 kg',
          enginePower: '143 kW (191 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 2900,
          capacity: '3.80 m³ Aggregate Bucket',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200', publicId: 'rentsphere/komatsu-wa380-main', sortOrder: 0 },
        ],
      },
    },
  });

  // 11. CAT 950 GC Wheel Loader
  const asset11 = await prisma.asset.create({
    data: {
      title: 'CAT 950 GC Heavy Wheel Loader',
      tagline: 'Purpose-designed 3.1 m³ loader for medium-duty civil material handling',
      description: 'The Caterpillar 950 GC is purpose-built to handle everyday jobs from material handling and truck loading to construction and stockpiling. Low fuel consumption and straightforward mechanical layout.',
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.EXCELLENT,
      pricePerDay: 14000,
      pricePerWeek: 84000,
      securityDeposit: 50000,
      location: 'Bommasandra Industrial Area',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560099',
      rating: 4.8,
      reviewCount: 8,
      featured: true,
      operatorProvided: true,
      deliveryAvailable: true,
      deliveryFee: 7000,
      minimumRentalDays: 3,
      features: ['Z-bar linkage with high breakout force', 'Cat C7.1 engine with electronically controlled injection', 'Cat Fusion quick coupler compatibility', 'Air-suspension seat'],
      rentalTerms: ['Qualified operator included', 'Fuel cost billed based on daily hour log', 'Minimum 3-day lease'],
      ownerId: leaser3.id,
      categoryId: catWheelLoaders.id,
      specification: {
        create: {
          brand: 'Caterpillar',
          model: '950 GC',
          year: 2023,
          operatingWeight: '18,700 kg',
          enginePower: '168 kW (225 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 1350,
          capacity: '3.10 m³ GP Bucket',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200', publicId: 'rentsphere/cat-950gc-main', sortOrder: 0 },
        ],
      },
    },
  });

  // 12. SDLG L958F Wheel Loader
  const asset12 = await prisma.asset.create({
    data: {
      title: 'SDLG L958F Heavy Articulated Loader',
      tagline: 'Cost-effective 5-ton payload loader engineered by Volvo Group subsidiary',
      description: 'Combines rugged reliability with modern design. Long wheelbase design provides superior stability during high-volume hopper feeding and aggregate loading operations.',
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.GOOD,
      pricePerDay: 11500,
      pricePerWeek: 69000,
      securityDeposit: 35000,
      location: 'Ambattur Industrial Estate',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '600058',
      rating: 4.5,
      reviewCount: 4,
      popular: false,
      operatorProvided: true,
      deliveryAvailable: true,
      deliveryFee: 6500,
      minimumRentalDays: 3,
      features: ['ZF electric-hydraulic fixed shaft transmission', 'Reinforced heavy-duty axles', 'Panoramic visibility cabin', 'Single joystick pilot control'],
      rentalTerms: ['Operator included', 'Minimum 3 days', 'Daily 8-hour shift standard'],
      ownerId: leaser3.id,
      categoryId: catWheelLoaders.id,
      specification: {
        create: {
          brand: 'SDLG',
          model: 'L958F',
          year: 2021,
          operatingWeight: '17,500 kg',
          enginePower: '162 kW (217 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 3800,
          capacity: '3.00 m³ Rock Bucket',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200', publicId: 'rentsphere/sdlg-l958-main', sortOrder: 0 },
        ],
      },
    },
  });

  // 13. CAT D6R Track-Type Bulldozer
  const asset13 = await prisma.asset.create({
    data: {
      title: 'CAT D6R Track-Type Medium Bulldozer',
      tagline: 'Precision earth leveling and bulk cut-and-fill tracked tractor',
      description: 'The Caterpillar D6R features differential steering that maintains power to both tracks while turning. Equipped with heavy Semi-Universal (SU) blade and multi-shank parallelogram ripper for tough rocky soils.',
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.EXCELLENT,
      pricePerDay: 22000,
      pricePerWeek: 135000,
      securityDeposit: 80000,
      location: 'Patparganj Industrial Area',
      city: 'Delhi',
      state: 'Delhi',
      pinCode: '110092',
      rating: 4.8,
      reviewCount: 11,
      featured: true,
      operatorProvided: true,
      deliveryAvailable: false,
      minimumRentalDays: 7,
      features: ['Semi-Universal (SU) 5.6 m³ blade', 'Multi-shank 3-tooth parallelogram ripper', 'Differential steering for smooth continuous turns', 'Cat C9 ACERT engine'],
      rentalTerms: ['Lowbed trailer transport organized at cost', 'Skilled dozer operator included', 'Minimum 7-day rental'],
      ownerId: leaser1.id,
      categoryId: catBulldozers.id,
      specification: {
        create: {
          brand: 'Caterpillar',
          model: 'D6R',
          year: 2022,
          operatingWeight: '19,200 kg',
          enginePower: '138 kW (185 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 2400,
          capacity: '5.60 m³ Blade Capacity',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=1200', publicId: 'rentsphere/cat-d6r-main', sortOrder: 0 },
        ],
      },
    },
  });

  // 14. Komatsu D85ESS-2 Crawler Dozer (MAINTENANCE)
  const asset14 = await prisma.asset.create({
    data: {
      title: 'Komatsu D85ESS-2 Heavy Crawler Bulldozer',
      tagline: 'High-torque 215 hp earthmoving dozer for bulk reclamation projects',
      description: 'Rugged mechanical fuel injection system, high-durability undercarriage with lubricated track links, and large capacity straight-tilt blade for bulk excavation and leveling.',
      status: AssetStatus.MAINTENANCE,
      condition: AssetCondition.WORKING,
      pricePerDay: 26000,
      pricePerWeek: 160000,
      securityDeposit: 90000,
      location: 'Taloja Industrial Area',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '410208',
      rating: 4.6,
      reviewCount: 7,
      operatorProvided: true,
      deliveryAvailable: false,
      minimumRentalDays: 10,
      adminNotes: 'Scheduled undercarriage track roller overhaul in progress — available for booking starting next month',
      features: ['Straight-tilt 5.8 m³ heavy blade', 'Heavy multi-shank ripper', 'Hydroshift transmission', 'ROPS/FOPS canopy'],
      rentalTerms: ['Currently in maintenance facility', 'Advance reservation accepted for next cycle'],
      ownerId: leaser2.id,
      categoryId: catBulldozers.id,
      specification: {
        create: {
          brand: 'Komatsu',
          model: 'D85ESS-2',
          year: 2020,
          operatingWeight: '20,670 kg',
          enginePower: '161 kW (215 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 5200,
          capacity: '5.80 m³ Blade Capacity',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=1200', publicId: 'rentsphere/komatsu-d85-main', sortOrder: 0 },
        ],
      },
    },
  });

  // 15. HAMM 311 Vibratory Soil Compactor
  const asset15 = await prisma.asset.create({
    data: {
      title: 'HAMM 311 Heavy Vibratory Soil Compactor',
      tagline: '11-ton single-drum vibratory roller for highway sub-base and earth dam compaction',
      description: 'The industry gold standard for compaction in road construction. Features HAMM 3-point articulation joint for superior traction and off-road maneuverability, high compaction force, and hydrostatic drive.',
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.EXCELLENT,
      pricePerDay: 8500,
      pricePerWeek: 51000,
      securityDeposit: 30000,
      location: 'Kona Expressway Corridor',
      city: 'Kolkata',
      state: 'West Bengal',
      pinCode: '711109',
      rating: 4.9,
      reviewCount: 13,
      popular: true,
      operatorProvided: true,
      deliveryAvailable: true,
      deliveryFee: 5000,
      minimumRentalDays: 3,
      features: ['3-point articulation steering', 'Dual vibration frequencies & amplitudes', 'Hydrostatic drive on both drum and axle', 'Ergonomic operator station with vibration isolation'],
      rentalTerms: ['Operator included', 'Fuel by contractor', 'Minimum 3-day rental'],
      ownerId: leaser4.id,
      categoryId: catCompactors.id,
      specification: {
        create: {
          brand: 'HAMM',
          model: '311',
          year: 2023,
          operatingWeight: '11,200 kg',
          enginePower: '98 kW (131 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 1200,
          capacity: '2.14 m Drum Width',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=1200', publicId: 'rentsphere/hamm-311-main', sortOrder: 0 },
        ],
      },
    },
  });

  // 16. Toyota 8FD30 Diesel Forklift
  const asset16 = await prisma.asset.create({
    data: {
      title: 'Toyota 8FD30 Heavy-Duty Diesel Forklift',
      tagline: '3.0-ton counterbalance forklift with System of Active Stability (SAS)',
      description: 'World-renowned Toyota SAS technology prevents lateral tipping and controls mast tilt speed automatically. Ideal for warehousing yards, precast pipe handling, and industrial logistics.',
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.EXCELLENT,
      pricePerDay: 6000,
      pricePerWeek: 36000,
      securityDeposit: 20000,
      location: 'Pimpri-Chinchwad MIDC',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '411018',
      rating: 4.9,
      reviewCount: 9,
      popular: true,
      operatorProvided: false,
      deliveryAvailable: true,
      deliveryFee: 3500,
      minimumRentalDays: 2,
      features: ['System of Active Stability (SAS)', '4.5m 3-stage full free-lift mast (FSV)', 'Integrated side-shifter attachment', 'Pneumatic solid puncture-proof tyres'],
      rentalTerms: ['Operator optional (₹1,500/day surcharge)', 'Minimum 2-day hire period', 'Renter must have trained forklift driver'],
      ownerId: leaser2.id,
      categoryId: catForklifts.id,
      specification: {
        create: {
          brand: 'Toyota',
          model: '8FD30',
          year: 2023,
          operatingWeight: '4,300 kg',
          enginePower: '43 kW (58 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 850,
          capacity: '3,000 kg Rated Lift',
          maxReach: '4.50 m Mast',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200', publicId: 'rentsphere/toyota-8fd30-main', sortOrder: 0 },
        ],
      },
    },
  });

  // 17. JCB 3CX Backhoe Loader (PENDING_REVIEW)
  const asset17 = await prisma.asset.create({
    data: {
      title: 'JCB 3CX EcoMAX Backhoe Loader',
      tagline: 'The universal contractor benchmark for trenching, loading, and backfilling',
      description: 'Equipped with JCB EcoMAX high-torque engine requiring no aftertreatment DPF. Featuring extendable dipper arm for 5.97m dig reach and heavy front loader bucket.',
      status: AssetStatus.PENDING_REVIEW,
      condition: AssetCondition.GOOD,
      pricePerDay: 8000,
      pricePerWeek: 48000,
      securityDeposit: 25000,
      location: 'Electronic City Phase I',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560100',
      rating: 0,
      reviewCount: 0,
      operatorProvided: true,
      deliveryAvailable: true,
      deliveryFee: 4500,
      minimumRentalDays: 2,
      adminNotes: 'Submitted by leaser for platform listing — awaiting verification of chassis fitness certificate',
      features: ['Extendable dipper (Extradig) for 5.97m depth', '1.0 m³ general purpose front bucket', 'Smooth-ride suspension system', 'Auxiliary hydraulic pipework'],
      rentalTerms: ['Operator included in base price', 'Fuel provided by contractor'],
      ownerId: leaser3.id,
      categoryId: catExcavators.id,
      specification: {
        create: {
          brand: 'JCB',
          model: '3CX EcoMAX',
          year: 2021,
          operatingWeight: '8,070 kg',
          enginePower: '74 kW (100 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 4200,
          capacity: '1.00 m³ Loader / 0.24 m³ Backhoe',
          maxReach: '5.97 m',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1200', publicId: 'rentsphere/jcb-3cx-main', sortOrder: 0 },
        ],
      },
    },
  });

  // 18. Bobcat S450 Skid Steer Loader (DRAFT)
  const asset18 = await prisma.asset.create({
    data: {
      title: 'Bobcat S450 Radius Lift Path Skid Steer Loader',
      tagline: 'Ultra-compact skid steer for tight interior demolition and urban utility work',
      description: 'Features a tight turning radius and high maneuverability for grading, sweeping, and interior rubble clearing in basements and confined commercial sites.',
      status: AssetStatus.DRAFT,
      condition: AssetCondition.EXCELLENT,
      pricePerDay: 7500,
      pricePerWeek: 45000,
      securityDeposit: 25000,
      location: 'Kurla West Industrial Estate',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400070',
      rating: 0,
      reviewCount: 0,
      operatorProvided: false,
      deliveryAvailable: true,
      deliveryFee: 4000,
      minimumRentalDays: 2,
      features: ['Bobcat Bob-Tach attachment mounting system', 'Auxiliary hydraulic couplers', 'Enclosed cab with heating & ventilation', 'Cushioned suspension seat'],
      rentalTerms: ['Draft status — pricing and terms subject to owner finalization'],
      ownerId: leaser2.id,
      categoryId: catWheelLoaders.id,
      specification: {
        create: {
          brand: 'Bobcat',
          model: 'S450',
          year: 2023,
          operatingWeight: '2,365 kg',
          enginePower: '36 kW (49 hp)',
          fuelType: FuelType.DIESEL,
          operatingHours: 620,
          capacity: '608 kg Rated Operating Capacity',
        },
      },
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200', publicId: 'rentsphere/bobcat-s450-main', sortOrder: 0 },
        ],
      },
    },
  });

  console.log('  ✓ 18 Assets with specifications and gallery records created');

  // ── 4. BOOKINGS (8 Bookings across complete lifecycle) ─────────────────────
  console.log('  Creating realistic booking history and active leases...');

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  // 1. ACTIVE: JCB JS205 currently rented by Karthik S.
  await prisma.booking.create({
    data: {
      startDate: new Date(now.getTime() - 5 * day),
      endDate: new Date(now.getTime() + 15 * day),
      durationDays: 20,
      dailyRate: 13000,
      rentalSubtotal: 260000,
      operatorFee: 0,
      deliveryFee: 7500,
      securityDeposit: 45000,
      estimatedTotal: 312500,
      operatorRequired: true,
      deliveryRequired: true,
      projectLocation: 'Hebbal Flyover Extension Project, Bengaluru',
      projectDescription: 'Pier foundation excavation and utility realignment for arterial road widening',
      status: BookingStatus.ACTIVE,
      renterId: renter2.id,
      assetId: asset3.id,
    },
  });

  // 2. ACTIVE: Tadano GT-750EL currently rented by Rohit Verma
  await prisma.booking.create({
    data: {
      startDate: new Date(now.getTime() - 8 * day),
      endDate: new Date(now.getTime() + 12 * day),
      durationDays: 20,
      dailyRate: 38000,
      rentalSubtotal: 760000,
      operatorFee: 0,
      deliveryFee: 0,
      securityDeposit: 150000,
      estimatedTotal: 910000,
      operatorRequired: true,
      deliveryRequired: false,
      projectLocation: 'Gachibowli Elevated Corridor, Hyderabad',
      projectDescription: 'Precast concrete girder lifting and night-shift erection',
      status: BookingStatus.ACTIVE,
      renterId: renter3.id,
      assetId: asset9.id,
    },
  });

  // 3. PENDING: Priya Patel requesting CAT 320 GC
  await prisma.booking.create({
    data: {
      startDate: new Date(now.getTime() + 4 * day),
      endDate: new Date(now.getTime() + 14 * day),
      durationDays: 10,
      dailyRate: 15000,
      rentalSubtotal: 150000,
      operatorFee: 0,
      deliveryFee: 8500,
      securityDeposit: 50000,
      estimatedTotal: 208500,
      operatorRequired: true,
      deliveryRequired: true,
      projectLocation: 'Wakad Phase 3 IT Tower, Pune',
      projectDescription: 'Multi-level basement rock excavation and foundation footings',
      status: BookingStatus.PENDING,
      renterId: renter1.id,
      assetId: asset1.id,
    },
  });

  // 4. PENDING: Ananya Sen requesting HAMM 311 Compactor
  await prisma.booking.create({
    data: {
      startDate: new Date(now.getTime() + 6 * day),
      endDate: new Date(now.getTime() + 18 * day),
      durationDays: 12,
      dailyRate: 8500,
      rentalSubtotal: 102000,
      operatorFee: 0,
      deliveryFee: 5000,
      securityDeposit: 30000,
      estimatedTotal: 137000,
      operatorRequired: true,
      deliveryRequired: true,
      projectLocation: 'NH-12 Highway Widening, Barasat-Kolkata',
      projectDescription: 'Subgrade soil compaction and granular sub-base layer rolling',
      status: BookingStatus.PENDING,
      renterId: renter4.id,
      assetId: asset15.id,
    },
  });

  // 5. APPROVED: Rohit Verma booked Liebherr LTM 1100 Crane
  await prisma.booking.create({
    data: {
      startDate: new Date(now.getTime() + 10 * day),
      endDate: new Date(now.getTime() + 18 * day),
      durationDays: 8,
      dailyRate: 45000,
      rentalSubtotal: 360000,
      operatorFee: 0,
      deliveryFee: 0,
      securityDeposit: 200000,
      estimatedTotal: 560000,
      operatorRequired: true,
      deliveryRequired: false,
      projectLocation: 'Noida Expressway Commercial Complex, NCR',
      projectDescription: 'HVAC chiller and heavy structural steel roof truss installation at 55m height',
      status: BookingStatus.APPROVED,
      renterId: renter3.id,
      assetId: asset6.id,
    },
  });

  // 6. APPROVED: Priya Patel booked CAT 950 GC Wheel Loader
  await prisma.booking.create({
    data: {
      startDate: new Date(now.getTime() + 8 * day),
      endDate: new Date(now.getTime() + 15 * day),
      durationDays: 7,
      dailyRate: 14000,
      rentalSubtotal: 98000,
      operatorFee: 0,
      deliveryFee: 7000,
      securityDeposit: 50000,
      estimatedTotal: 155000,
      operatorRequired: true,
      deliveryRequired: true,
      projectLocation: 'Khed City Industrial Cluster, Pune',
      projectDescription: 'Aggregate handling for ready-mix concrete batching facility',
      status: BookingStatus.APPROVED,
      renterId: renter1.id,
      assetId: asset11.id,
    },
  });

  // 7. COMPLETED: Past successful rental of CAT 320 GC
  await prisma.booking.create({
    data: {
      startDate: new Date(now.getTime() - 40 * day),
      endDate: new Date(now.getTime() - 25 * day),
      durationDays: 15,
      dailyRate: 15000,
      rentalSubtotal: 225000,
      operatorFee: 0,
      deliveryFee: 8500,
      securityDeposit: 50000,
      estimatedTotal: 283500,
      operatorRequired: true,
      deliveryRequired: true,
      projectLocation: 'Thane-Belapur Road Industrial Park, Navi Mumbai',
      projectDescription: 'Warehouse retention pond construction and drainage ditch trenching',
      status: BookingStatus.COMPLETED,
      renterId: renter1.id,
      assetId: asset1.id,
    },
  });

  // 8. CANCELLED: Cancelled booking for Komatsu PC210
  await prisma.booking.create({
    data: {
      startDate: new Date(now.getTime() - 15 * day),
      endDate: new Date(now.getTime() - 5 * day),
      durationDays: 10,
      dailyRate: 16500,
      rentalSubtotal: 165000,
      operatorFee: 0,
      deliveryFee: 9000,
      securityDeposit: 60000,
      estimatedTotal: 234000,
      operatorRequired: true,
      deliveryRequired: true,
      projectLocation: 'Faridabad Industrial Sector 58, Haryana',
      projectDescription: 'Factory foundation excavation — postponed due to municipal clearance delay',
      status: BookingStatus.CANCELLED,
      rejectionReason: 'Contractor requested cancellation prior to machine mobilization due to rain and pending municipal clearances',
      renterId: renter3.id,
      assetId: asset2.id,
    },
  });

  console.log('  ✓ 8 Bookings created (2 Active, 2 Pending, 2 Approved, 1 Completed, 1 Cancelled)');

  // ── 5. REVIEWS (6 Detailed verified contractor reviews) ───────────────────
  console.log('  Creating realistic contractor reviews...');

  await prisma.review.create({
    data: {
      rating: 5,
      comment: 'Top-tier machine! The CAT 320 GC operated with zero downtime during our 15-day warehouse excavation. Highly skilled operator provided by Arun Nair handled rock trenching effortlessly. Highly recommended.',
      authorName: renter1.name,
      authorCompany: renter1.companyName || undefined,
      projectType: 'Commercial Foundation Trenching',
      authorId: renter1.id,
      assetId: asset1.id,
    },
  });

  await prisma.review.create({
    data: {
      rating: 5,
      comment: 'The Liebherr LTM 1100 was mobilizing for our bridge girders. Clean machine, calibrated LICCON computer, and seasoned riggers. Sharma Cranes is our go-to partner in Delhi NCR.',
      authorName: renter3.name,
      authorCompany: renter3.companyName || undefined,
      projectType: 'Bridge Girder Erection',
      authorId: renter3.id,
      assetId: asset6.id,
    },
  });

  await prisma.review.create({
    data: {
      rating: 4,
      comment: 'Komatsu PC210 delivered great breakout force in abrasive sandstone. Very responsive hydraulic controls. Machine arrived right on schedule with full tank.',
      authorName: renter2.name,
      authorCompany: renter2.companyName || undefined,
      projectType: 'Quarry Cut-and-Fill',
      authorId: renter2.id,
      assetId: asset2.id,
    },
  });

  await prisma.review.create({
    data: {
      rating: 5,
      comment: 'Outstanding compaction density achieved on our highway sub-base inspection. The HAMM 311 articulation makes tight turning on embankment fills very smooth.',
      authorName: renter4.name,
      authorCompany: renter4.companyName || undefined,
      projectType: 'Highway Subgrade Stabilization',
      authorId: renter4.id,
      assetId: asset15.id,
    },
  });

  await prisma.review.create({
    data: {
      rating: 5,
      comment: 'Toyota 8FD30 forklift was flawless. Used for 2 weeks inside our fabrication shed handling heavy structural steel assemblies. Smooth side-shifter and zero mast drift.',
      authorName: renter1.name,
      authorCompany: renter1.companyName || undefined,
      projectType: 'Industrial Warehouse Steel Logistics',
      authorId: renter1.id,
      assetId: asset16.id,
    },
  });

  await prisma.review.create({
    data: {
      rating: 5,
      comment: 'CAT D6R bulldozer leveled over 12,000 cubic meters of earth in 10 days. The differential steering gives continuous power on both tracks. Exceptional equipment condition.',
      authorName: renter3.name,
      authorCompany: renter3.companyName || undefined,
      projectType: 'Township Earth Leveling',
      authorId: renter3.id,
      assetId: asset13.id,
    },
  });

  console.log('  ✓ 6 Verified reviews created');

  console.log('\n======================================================');
  console.log('🎉 Phase 5 Database Seeding Complete!');
  console.log('   Users: 9 (1 Admin, 4 Leasers, 4 Renters)');
  console.log('   Categories: 6');
  console.log('   Assets: 18 (11 Available, 2 Rented, 2 Pending, 1 Maintenance, 1 Draft, 1 Changes)');
  console.log('   Specifications: 18 (1:1 per asset)');
  console.log('   Bookings: 8 (2 Active, 2 Pending, 2 Approved, 1 Completed, 1 Cancelled)');
  console.log('   Reviews: 6 verified contractor evaluations');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
