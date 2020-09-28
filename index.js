const puppeteer = require('puppeteer');
const fs = require('fs');

function findNewTargets(candidates, existingTargets, visited) {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set#Implementing_basic_set_operations
  function union(setA, setB) {
    let _union = new Set(setA)
    for (let elem of setB) {
        _union.add(elem);
    }
    return _union;
  }
  function difference(setA, setB) {
    let _difference = new Set(setA)
    for (let elem of setB) {
        _difference.delete(elem)
    }
    return _difference
  }
  const potentialTargets = union(new Set(candidates), new Set(existingTargets));
  const realTargets = difference(potentialTargets, new Set(visited));
  return Array.from(realTargets);
}

async function getLinks(page) {
  try {
    let targets = new Set();
    const links = await page.$$('a');
    for (let i = 0; i < links.length; i++) { 
      const link = links[i];
      const href = await link.getProperty('href');
      const value = await href.jsonValue();
      if (value.includes('https://developer.chrome.com')) {
        const url = new URL(value);
        let pathname = url.pathname.replace(/\.html$/, '');
        pathname = pathname.replace(/index$/, '');
        targets.add(`${url.origin}${pathname}`);
      }
    };
    return Array.from(targets);
  } catch (error) {
    console.error('getLinks() failed:', error)
    return [];
  }
}

async function getTitle(page) {
  try {
    const node = await page.$('head title');
    const textContent = await node.getProperty('textContent');
    let value = await textContent.jsonValue();
    value = value.replace(' - Google Chrome', '');
    value = value.replace(/\n/g, '');
    value = value.replace(/\r/g, '');
    value = value.replace(/  +/g, ' ');
    return value;
  } catch (error) {
    console.error('getTitle() failed:', error);
    return 'ERROR';
  }
}

async function start() {
  let output = 'Title,URL\n';
  let targets = ['https://developer.chrome.com/home'];
  let visited = [];
  let errors = [];
  const browser = await puppeteer.launch({
    headless: false
  });
  const page = await browser.newPage();
  // Keep crawling until we no longer find any new pages.
  while (targets.length > 0) {
    const target = targets.pop();
    try {
      await page.goto(target, {
        waitUntil: 'networkidle2'
      });
    } catch (error) {
      console.error('TIMEOUT?', error);
      errors.push(target);
      continue;
    }
    visited.push(target);
    // Collect all links on the target page.
    const links = await getLinks(page);
    const title = await getTitle(page);
    // Compare the newfound links to the links we already know about.
    targets = findNewTargets(links, targets, visited);
    // Print to file! We don't need to sort because Google Sheets can do it for us.
    output += `${title},${target}\n`;
    fs.writeFileSync('report.csv', output);
  }
  await browser.close();
}

start();