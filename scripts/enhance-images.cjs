const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'storage', 'uploads', 'product-images');

async function processDirectory(dirName) {
  const boxDir = path.join(ROOT, dirName, 'box');
  const imgPath = path.join(boxDir, `${dirName}.jpeg`);
  
  if (!fs.existsSync(imgPath)) return false;

  try {
    const meta = await sharp(imgPath).metadata();
    // If already upscaled (width >= 300), skip
    if (meta.width && meta.width >= 300) {
      return false;
    }

    const buf = await fs.promises.readFile(imgPath);
    const enhanced = await sharp(buf)
      .resize(384, 384, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .sharpen({ sigma: 1.2, m1: 1.2, m2: 2.5 })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    await fs.promises.writeFile(imgPath, enhanced);
    return true;
  } catch (err) {
    console.error(`Error processing ${dirName}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('Starting high-fidelity image enhancement for all product packaging photos...');
  const dirs = fs.readdirSync(ROOT).filter(d => d.startsWith('med-'));
  const total = dirs.length;
  console.log(`Found ${total} product image directories.`);

  const startTime = Date.now();
  let completed = 0;
  let enhancedCount = 0;
  const concurrency = 60;

  for (let i = 0; i < total; i += concurrency) {
    const chunk = dirs.slice(i, i + concurrency);
    const results = await Promise.all(chunk.map(d => processDirectory(d)));
    completed += chunk.length;
    enhancedCount += results.filter(Boolean).length;

    if (completed % 1000 === 0 || completed === total) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (completed / elapsed).toFixed(1);
      const percent = ((completed / total) * 100).toFixed(1);
      console.log(`[Progress ${percent}%] Processed ${completed}/${total} (Enhanced: ${enhancedCount}) - Rate: ${rate} img/s`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n Image enhancement complete! Total: ${total}, Enhanced: ${enhancedCount} in ${totalTime}s.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
