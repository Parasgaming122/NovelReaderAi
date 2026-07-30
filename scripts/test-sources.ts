import { smartFetch } from '../src/lib/bypasser';
import * as cheerio from 'cheerio';

async function debugXBiqugeChapter() {
  // Get a book from search to find a chapter URL
  const searchRes = await smartFetch('https://www.xbiquge.info/search.php?q=斗破', {
    headers: { 'Referer': 'https://www.xbiquge.info/' },
    timeout: 20000,
  });
  if (!searchRes.success || !searchRes.body) return;
  
  const $s = cheerio.load(searchRes.body);
  const bookUrl = $s('dl dd h3 a').first().attr('href');
  if (!bookUrl) return;
  
  const fullBookUrl = `https://www.xbiquge.info${bookUrl}`;
  console.log(`Book: ${fullBookUrl}`);
  
  const bookRes = await smartFetch(fullBookUrl, { timeout: 20000 });
  if (!bookRes.success || !bookRes.body) return;
  
  const $b = cheerio.load(bookRes.body);
  // Get a chapter URL
  const chapterHref = $b('a[href$=".html"]').first().attr('href');
  if (!chapterHref) { console.log('No chapter link found'); return; }
  
  const chapterUrl = `https://www.xbiquge.info${chapterHref}`;
  console.log(`Chapter: ${chapterUrl}`);
  
  const chRes = await smartFetch(chapterUrl, { timeout: 20000 });
  console.log(`Response: success=${chRes.success}, status=${chRes.status}, length=${chRes.body?.length}`);
  
  if (!chRes.success || !chRes.body) {
    console.log('Fetch failed');
    return;
  }
  
  const $ = cheerio.load(chRes.body);
  console.log(`h1: ${$('h1').first().text()}`);
  console.log(`.bookname h1: ${$('.bookname h1').text()}`);
  console.log(`#content: ${$('#content').length}`);
  console.log(`.content: ${$('.content').length}`);
  console.log(`.text: ${$('.text').length}`);
  
  // Check what selectors exist
  console.log(`\nAll ids: ${$('[id]').map((_, el) => $(el).attr('id')).get().join(', ')}`);
  console.log(`\nAll classes (first 20): ${$('[class]').map((_, el) => $(el).attr('class')).get().slice(0, 20).join(', ')}`);
  
  // Show body snippet
  console.log(`\nBody snippet (500-2000):\n${chRes.body.substring(500, 2000)}`);
}

debugXBiqugeChapter().catch(console.error);
