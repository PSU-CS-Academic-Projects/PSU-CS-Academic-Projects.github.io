const https = require('https');
const fs = require('fs');
const path = require('path');

const ORG = 'PSU-CS-Academic-Projects';
const headers = {
  'User-Agent': 'NodeJS',
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
};

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
  // Find the ### Members section
  const membersMatch = readmeContent.match(/###\s*Members\s*\n([\s\S]*?)(?=\n##|\n---|$(?![\r\n]))/i);
  if (!membersMatch) return [];

  const membersBlock = membersMatch[1];
  const members = membersBlock
    .split('\n')
    .filter(line => line.trim().startsWith('*') || line.trim().startsWith('-'))
    .map(line => line.replace(/^[\*\-]\s*/, '').trim())
    .filter(name => name.length > 0);

  return members;
}

async function run() {
  console.log(`Fetching public repos for ${ORG}...`);
  try {
    const repos = await fetchAllPages(`/orgs/${ORG}/repos?sort=updated&type=public`);
    console.log(`Found ${repos.length} repos. Fetching READMEs...`);

    for (const repo of repos) {
      console.log(`  Parsing ${repo.name}...`);
      try {
        const readmeData = await fetchJSON(`https://api.github.com/repos/${ORG}/${repo.name}/readme`);
        if (readmeData && readmeData.download_url) {
          const readmeContent = await fetchText(readmeData.download_url);
          repo.members = parseMembers(readmeContent);
        } else {
          repo.members = [];
        }
      } catch (e) {
        console.warn(`  Failed to get README for ${repo.name}: ${e.message}`);
        repo.members = [];
      }
    }

    // Fetch GitHub contributors for the "Top Contributors" section
    console.log('Fetching GitHub contributors...');
    let githubContributors = [];
    try {
      const members = await fetchAllPages(`/orgs/${ORG}/public_members`);
      if (members.length > 0) {
        githubContributors = members.map(m => ({ login: m.login, avatar_url: m.avatar_url, html_url: m.html_url }));
      } else {
        throw new Error('No public members found, falling back to repo contributors');
      }
    } catch (e) {
      console.warn('  Failed to fetch org members, falling back to top contributors.');
      const topRepos = repos.slice().sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 8);
      const contributorMap = new Map();
      for (const repo of topRepos) {
        try {
          const contributors = await fetchAllPages(`/repos/${ORG}/${repo.name}/contributors`);
          for (const c of contributors) {
            if (c.type === 'User' && !contributorMap.has(c.login)) {
              contributorMap.set(c.login, { login: c.login, avatar_url: c.avatar_url, html_url: c.html_url });
            }
          }
        } catch (err) {
          // ignore
        }
      }
      githubContributors = Array.from(contributorMap.values());
    }

    const fallbackData = { repos, github_contributors: githubContributors };
    fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(fallbackData, null, 2));
    console.log('Successfully wrote data.json');
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
