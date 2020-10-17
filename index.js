const puppeteer = require('puppeteer');
const fs = require('fs');
const config = require('./config.json');

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
      if (isInvalidFileType(value)) continue;
      if (value.includes(config.entrypoint)) {
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

// async function getTitle(page) {
//   try {
//     const node = await page.$('head title');
//     const textContent = await node.getProperty('textContent');
//     let value = await textContent.jsonValue();
//     value = value.replace(' - Google Chrome', '');
//     value = value.replace(/\n/g, '');
//     value = value.replace(/\r/g, '');
//     value = value.replace(/  +/g, ' ');
//     return value;
//   } catch (error) {
//     console.error('getTitle() failed:', error);
//     return 'ERROR';
//   }
// }

function isInvalidFileType(target) {
  const types = [
    '.jpg',
    '.png',
    '.zip',
    '.json',
    '.js',
    '.css',
    '.pdf',
    '.gif',
    '.md',
    '.ogg',
    '.txt',
    '.ai',
    'jpeg'
  ];
  const check = types.filter(type => target.toLowerCase().endsWith(type));
  return check.length !== 0;
}

async function categorize(page) {
  for (let i = 0; i < config.categories.length; i++) {
    const category = config.categories[i];
    const result = await page.$(category.selector);
    if (result) return category.id;
  }
  return 'unknown';
}

function buildReport(data) {
  let count = 0;
  let links = '';
  for (name in data) {
    if (name === 'incomplete' && data.incomplete.length === 0) continue;
    links += `${name}:\n\n${data[name].join('\n')}\n\n`;
    if (name !== 'incomplete') count += data[name].length;
  }
  const report = `Metadata:\n\nIncomplete: ${data.incomplete.length}\nCrawled: ${count}\n\n${links}`
  return report;
}

async function start() {
  let targets = [config.entrypoint];
  let visited = [];
  let data = {
    errors: [],
    incomplete: 0,
    unknown: []
  };
  config.categories.forEach(category => data[category.id] = []);
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
      data.errors.push(target);
      continue;
    }
    visited.push(target);
    const category = await categorize(page);
    data[category].push(target);
    // Collect all links on the target page.
    const links = await getLinks(page);
    // const title = await getTitle(page);
    // Compare the newfound links to the links we already know about.
    targets = findNewTargets(links, targets, visited);
    data.incomplete = targets;
    const output = buildReport(data);
    fs.writeFileSync('report.txt', output);
    console.info(`Visited: ${target}\nRemaining targets: ${targets.length}\n`);
  }
  await browser.close();
}

start();

  // Do not navigate to non-HTML pages.
  // https://stackoverflow.com/a/53490807/1669860
  // https://pptr.dev/#?product=Puppeteer&version=v5.3.1&show=api-pagesetrequestinterceptionvalue
  // https://pptr.dev/#?product=Puppeteer&version=v5.3.1&show=api-event-request
  // https://pptr.dev/#?product=Puppeteer&version=v5.3.1&show=api-class-httprequest
  // page.setRequestInterception(true);
  // page.on('request', request => {
  //   if (request.resourceType() !== 'document') {
  //     request.abort();
  //   } else {
  //     request.continue();
  //   }
  // });