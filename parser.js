const https = require('https');
const fs = require('fs');
const path = require('path');

const ORG = 'PSU-CS-Academic-Projects';
const headers = {
  'User-Agent': 'NodeJS',
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
};

if (process.env.GITHUB_TOKEN) {
  headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            return;
          }
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          resolve(''); // Return empty string if no README
        } else {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function fetchAllPages(endpoint) {
  const results = [];
  let page = 1;
  while (true) {
    const url = `https://api.github.com${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=100&page=${page}`;
    const data = await fetchJSON(url);
    if (!Array.isArray(data) || data.length === 0) break;
    results.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return results;
}

// Extract members from README markdown
function parseMembers(readmeContent) {
  if (!readmeContent) return [];
  // Find the ### Members or ### Contributors section, allowing for emojis or extra words like "### 👥 Contributors"
  const membersMatch = readmeContent.match(/(?:^|\n)[#\s*]*(?:👥\s*)?(?:Members|Contributors)[*:\s]*\n([\s\S]*?)(?=\n#{1,6}[ \t]+|\n\*\*[A-Za-z]|\n---|$(?![\r\n]))/i);
  if (!membersMatch) return [];

  const membersBlock = membersMatch[1];
  const members = membersBlock
    .split('\n')
    .filter(line => line.trim().startsWith('*') || line.trim().startsWith('-'))
    .map(line => line.replace(/^[\*\-]\s*/, '').trim())
    .filter(name => name.length > 0);

  return members;
}

// Extract Video Demonstration link from README markdown
function parseVideoDemo(readmeContent) {
  if (!readmeContent) return null;
  const match = readmeContent.match(/(?:^|\n)[#\s*]*(?:Video Demonstration|Video Demo)[*:\s]*\n([\s\S]*?)(?=\n#{1,6}[ \t]+|\n\*\*[A-Za-z]|\n---|$(?![\r\n]))/i);
  if (!match) return null;
  
  const block = match[1];
  const urlMatch = block.match(/https?:\/\/[^\s\)]+/);
  return urlMatch ? urlMatch[0] : null;
}

// Extract screenshots from README markdown
function parseScreenshots(readmeContent, repoName, defaultBranch) {
  if (!readmeContent) return [];
  const match = readmeContent.match(/(?:^|\n)[#\s*]*(?:Screenshots)[*:\s]*\n([\s\S]*?)(?=\n#{1,6}[ \t]+|\n\*\*[A-Za-z]|\n---|$(?![\r\n]))/i);
  if (!match) return [];
  
  const block = match[1];
  const screenshots = [];
  
  const processUrl = (url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const cleanUrl = url.replace(/^\/+/, '');
    return `https://raw.githubusercontent.com/${ORG}/${repoName}/${defaultBranch || 'main'}/${cleanUrl}`;
  };

  const mdRegex = /!\[.*?\]\((.*?)\)/g;
  let mdMatch;
  while ((mdMatch = mdRegex.exec(block)) !== null) {
    screenshots.push(processUrl(mdMatch[1]));
  }
  
  const htmlRegex = /<img.*?src=["'](.*?)["']/gi;
  let htmlMatch;
  while ((htmlMatch = htmlRegex.exec(block)) !== null) {
    screenshots.push(processUrl(htmlMatch[1]));
  }
  
  return screenshots;
}

async function run() {
  console.log(`Fetching public repos for ${ORG}...`);
  try {
    let repos = await fetchAllPages(`/orgs/${ORG}/repos?sort=updated&type=public`);
    
    // Deduplicate by repo id and filter out forks
    const seen = new Set();
    repos = repos.filter(r => {
      if (r.fork) return false;
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    console.log(`Found ${repos.length} unique repos. Fetching READMEs...`);

    for (const repo of repos) {
      console.log(`  Parsing ${repo.name}...`);
      try {
        const readmeData = await fetchJSON(`https://api.github.com/repos/${ORG}/${repo.name}/readme`);
        if (readmeData && readmeData.download_url) {
          const readmeContent = await fetchText(readmeData.download_url);
          repo.members = parseMembers(readmeContent);
          repo.video_demo = parseVideoDemo(readmeContent);
          repo.screenshots = parseScreenshots(readmeContent, repo.name, repo.default_branch);
        } else {
          repo.members = [];
          repo.video_demo = null;
          repo.screenshots = [];
        }
      } catch (e) {
        console.warn(`  Failed to get README for ${repo.name}: ${e.message}`);
        repo.members = [];
        repo.video_demo = null;
        repo.screenshots = [];
      }
    }

    const fallbackData = { repos };
    fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(fallbackData, null, 2));
    console.log('Successfully wrote data.json');
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
