import { createImage, uploadImage } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

function generateSvgImage(width: number, height: number, bgColor: string, label: string): File {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${bgColor}"/>
  <rect x="10%" y="10%" width="80%" height="80%" rx="20" fill="rgba(255,255,255,0.15)"/>
  <circle cx="50%" cy="40%" r="15%" fill="rgba(255,255,255,0.25)"/>
  <rect x="25%" y="55%" width="50%" height="20%" rx="8" fill="rgba(255,255,255,0.2)"/>
  <rect x="35%" y="65%" width="30%" height="8%" rx="4" fill="rgba(255,255,255,0.15)"/>
  <text x="50%" y="88%" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.8)" text-anchor="middle" font-weight="bold">${label}</text>
</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const filename = `${label.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}.svg`;
  return new File([blob], filename, { type: 'image/svg+xml' });
}

const seedImages = [
  {
    title: 'Mountain Sunset',
    description: 'A breathtaking view of the mountains at sunset with vibrant orange and purple skies.',
    bgColor: '#7c3aed',
    label: 'Mountain Sunset',
    width: 800,
    height: 600,
  },
  {
    title: 'Ocean Waves',
    description: 'Gentle waves crashing on a sandy beach during a golden summer afternoon.',
    bgColor: '#0891b2',
    label: 'Ocean Waves',
    width: 800,
    height: 600,
  },
  {
    title: 'Forest Path',
    description: 'A winding path through a lush green forest with sunlight filtering through the canopy.',
    bgColor: '#059669',
    label: 'Forest Path',
    width: 800,
    height: 600,
  },
  {
    title: 'City Lights',
    description: 'The vibrant city skyline illuminated at night with colorful neon reflections.',
    bgColor: '#dc2626',
    label: 'City Lights',
    width: 800,
    height: 600,
  },
];

async function main() {
  console.log('Seeding database...');

  for (const seed of seedImages) {
    const id = uuidv4();
    const file = generateSvgImage(seed.width, seed.height, seed.bgColor, seed.label);
    const filename = `${id}.svg`;

    // Upload file
    const { url } = await uploadImage(file, filename);

    // Create DB record
    await createImage({
      id,
      title: seed.title,
      description: seed.description,
      filename,
      original_name: `${seed.label.toLowerCase().replace(/\s+/g, '-')}.svg`,
      mime_type: 'image/svg+xml',
      size: file.size,
    });

    console.log(`✓ Created: ${seed.title} (url: ${url})`);
  }

  console.log('Done! 4 sample images created.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});