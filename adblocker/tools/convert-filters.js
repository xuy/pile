#!/usr/bin/env node
/**
 * PileBlock Filter List Converter
 *
 * Converts Adblock Plus filter list syntax (EasyList, EasyPrivacy)
 * to Chrome declarativeNetRequest JSON rules.
 *
 * Usage:
 *   node convert-filters.js [--max-rules 10000]
 *
 * Downloads EasyList and EasyPrivacy, converts them, and writes
 * the output to ../rules/easylist.json and ../rules/easyprivacy.json
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const FILTER_LISTS = {
  easylist: 'https://easylist.to/easylist/easylist.txt',
  easyprivacy: 'https://easylist.to/easylist/easyprivacy.txt'
};

const MAX_RULES_PER_LIST = parseInt(process.argv.find(a => a.startsWith('--max-rules='))?.split('=')[1] || '15000');

// Resource type mapping: ABP option -> Chrome DNR type
const RESOURCE_TYPE_MAP = {
  'script': 'script',
  'image': 'image',
  'stylesheet': 'stylesheet',
  'font': 'font',
  'media': 'media',
  'object': 'object',
  'xmlhttprequest': 'xmlhttprequest',
  'sub_frame': 'sub_frame',
  'subdocument': 'sub_frame',
  'ping': 'ping',
  'websocket': 'websocket',
  'other': 'other',
  'main_frame': 'main_frame',
};

const ALL_RESOURCE_TYPES = [
  'main_frame', 'sub_frame', 'stylesheet', 'script', 'image',
  'font', 'object', 'xmlhttprequest', 'ping', 'media',
  'websocket', 'other'
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'PileBlock/1.0' } }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Parse a single ABP filter rule into a Chrome DNR rule, or null if unsupported.
 */
function parseFilter(line, ruleId) {
  line = line.trim();

  // Skip comments, empty lines, cosmetic filters, snippet filters
  if (!line || line.startsWith('!') || line.startsWith('[')) return null;
  if (line.includes('##') || line.includes('#@#') || line.includes('#?#')) return null;
  if (line.includes('#$#') || line.includes('#@$#')) return null;

  // Determine if this is an exception (allowlist) rule
  let isException = false;
  let filterText = line;

  if (filterText.startsWith('@@')) {
    isException = true;
    filterText = filterText.substring(2);
  }

  // Split filter and options
  let options = {};
  const dollarIndex = findOptionsSeparator(filterText);
  if (dollarIndex !== -1) {
    const optionsStr = filterText.substring(dollarIndex + 1);
    filterText = filterText.substring(0, dollarIndex);
    options = parseOptions(optionsStr);
    if (options === null) return null; // Unsupported option
  }

  // Convert the filter pattern to a URL filter
  const urlFilter = convertPattern(filterText);
  if (!urlFilter) return null;

  // Build the DNR rule
  const rule = {
    id: ruleId,
    priority: isException ? 2 : 1,
    action: {
      type: isException ? 'allow' : 'block'
    },
    condition: {}
  };

  // Set URL filter
  if (urlFilter === '*') {
    // Match everything - need at least a domain condition
    if (!options.domains && !options.resourceTypes) return null;
  } else {
    rule.condition.urlFilter = urlFilter;
  }

  // Resource types
  if (options.resourceTypes && options.resourceTypes.length > 0) {
    rule.condition.resourceTypes = options.resourceTypes;
  } else if (options.excludedResourceTypes && options.excludedResourceTypes.length > 0) {
    rule.condition.excludedResourceTypes = options.excludedResourceTypes;
  }

  // Domain conditions
  if (options.domains) {
    if (options.domains.include.length > 0) {
      rule.condition.initiatorDomains = options.domains.include;
    }
    if (options.domains.exclude.length > 0) {
      rule.condition.excludedInitiatorDomains = options.domains.exclude;
    }
  }

  // Third-party
  if (options.thirdParty === true) {
    rule.condition.domainType = 'thirdParty';
  } else if (options.thirdParty === false) {
    rule.condition.domainType = 'firstParty';
  }

  return rule;
}

/**
 * Find the $ that separates filter pattern from options.
 * Handles cases where $ appears in regex patterns.
 */
function findOptionsSeparator(filter) {
  // If it starts with /, it might be a regex
  if (filter.startsWith('/') && filter.lastIndexOf('/') > 0) {
    const lastSlash = filter.lastIndexOf('/');
    const afterSlash = filter.indexOf('$', lastSlash);
    return afterSlash;
  }
  return filter.lastIndexOf('$');
}

/**
 * Parse ABP filter options string into structured options.
 */
function parseOptions(optionsStr) {
  const result = {
    resourceTypes: [],
    excludedResourceTypes: [],
    thirdParty: undefined,
    domains: null
  };

  const parts = optionsStr.split(',');
  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    const isNegated = part.startsWith('~');
    const name = isNegated ? part.substring(1) : part;

    // Domain option
    if (name.startsWith('domain=')) {
      const domainStr = name.substring(7);
      result.domains = parseDomains(domainStr);
      continue;
    }

    // Third-party
    if (name === 'third-party' || name === '3p') {
      result.thirdParty = !isNegated;
      continue;
    }
    if (name === 'first-party' || name === '1p') {
      result.thirdParty = isNegated;
      continue;
    }

    // Unsupported options - skip the whole rule
    if (['csp', 'rewrite', 'redirect', 'removeparam', 'replace',
         'header', 'method', 'permissions', 'from', 'to'].includes(name)) {
      return null;
    }

    // Match-case (supported but we ignore since DNR is case-insensitive for urlFilter)
    if (name === 'match-case') continue;
    // Important - just affects priority
    if (name === 'important') continue;

    // Resource types
    const dnrType = RESOURCE_TYPE_MAP[name];
    if (dnrType) {
      if (isNegated) {
        result.excludedResourceTypes.push(dnrType);
      } else {
        result.resourceTypes.push(dnrType);
      }
      continue;
    }

    // popup -> we map to main_frame with some caveats
    if (name === 'popup') {
      if (!isNegated) {
        result.resourceTypes.push('main_frame');
      }
      continue;
    }

    // document type
    if (name === 'document') {
      if (!isNegated) {
        result.resourceTypes.push('main_frame', 'sub_frame');
      }
      continue;
    }
  }

  return result;
}

/**
 * Parse domain option value like "example.com|~sub.example.com"
 */
function parseDomains(domainStr) {
  const include = [];
  const exclude = [];
  const parts = domainStr.split('|');

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('~')) {
      exclude.push(part.substring(1));
    } else {
      include.push(part);
    }
  }

  if (include.length === 0 && exclude.length === 0) return null;
  return { include, exclude };
}

/**
 * Convert ABP filter pattern to Chrome DNR urlFilter syntax.
 */
function convertPattern(pattern) {
  if (!pattern) return '*';

  // Regex filters - limited support
  if (pattern.startsWith('/') && pattern.endsWith('/')) {
    // DNR supports regexFilter but with limits. Skip complex ones.
    const regex = pattern.slice(1, -1);
    if (regex.length > 200) return null; // Too complex
    // Return as regex - will be handled separately
    return null; // Skip regex for now, focus on simple patterns
  }

  let result = pattern;

  // ABP uses || to mean "match domain anchor" -> DNR equivalent
  if (result.startsWith('||')) {
    result = '||' + result.substring(2);
    // This is actually already DNR syntax!
  }

  // ABP uses | at start/end for exact boundary
  // | at start = match start of URL
  if (result.startsWith('|') && !result.startsWith('||')) {
    result = '|' + result.substring(1);
  }
  // | at end = match end of URL
  if (result.endsWith('|')) {
    result = result.slice(0, -1) + '|';
  }

  // ABP ^ means separator character - DNR supports this natively as ^
  // ABP * means wildcard - DNR supports this as *

  // Validate: DNR urlFilter must be ASCII and reasonable length
  if (result.length > 500) return null;

  // Clean up
  if (result === '' || result === '*') return '*';

  return result;
}

/**
 * Score a rule by how impactful it is (for prioritizing within the rule limit).
 * Higher score = more likely to block common ads.
 */
function scoreRule(line) {
  let score = 0;
  const adDomains = [
    'doubleclick', 'googlesyndication', 'googleadservices', 'google-analytics',
    'facebook.*tracking', 'amazon-adsystem', 'adnxs', 'adsrvr', 'rubiconproject',
    'pubmatic', 'openx', 'criteo', 'outbrain', 'taboola', 'zergnet',
    'scorecardresearch', 'quantserve', 'moatads', 'chartbeat',
    'advertising', 'tracker', 'analytics', 'pixel', 'beacon',
    'ad.', 'ads.', 'adserver', 'adservice', 'pagead',
    'prebid', 'bidswitch', 'adsystem'
  ];

  for (const domain of adDomains) {
    if (line.includes(domain)) {
      score += 10;
      break;
    }
  }

  // Prefer domain-anchored rules (||) - they're more precise
  if (line.startsWith('||')) score += 5;

  // Prefer third-party rules
  if (line.includes('third-party') || line.includes('3p')) score += 3;

  // Exception rules are important to prevent breakage
  if (line.startsWith('@@')) score += 4;

  // Prefer shorter, more general rules
  if (line.length < 50) score += 2;
  if (line.length < 30) score += 2;

  return score;
}

async function convertList(name, url) {
  console.log(`Downloading ${name} from ${url}...`);
  const content = await fetch(url);
  const lines = content.split('\n');
  console.log(`  ${lines.length} lines downloaded`);

  // Score and sort lines by impact
  const scoredLines = lines
    .filter(l => l.trim() && !l.startsWith('!') && !l.startsWith('['))
    .map(l => ({ line: l, score: scoreRule(l) }))
    .sort((a, b) => b.score - a.score);

  const rules = [];
  let ruleId = 1;
  let skipped = 0;

  for (const { line } of scoredLines) {
    if (rules.length >= MAX_RULES_PER_LIST) break;

    const rule = parseFilter(line, ruleId);
    if (rule) {
      rules.push(rule);
      ruleId++;
    } else {
      skipped++;
    }
  }

  console.log(`  Converted ${rules.length} rules (skipped ${skipped} unsupported)`);
  return rules;
}

async function main() {
  const rulesDir = path.join(__dirname, '..', 'rules');
  if (!fs.existsSync(rulesDir)) {
    fs.mkdirSync(rulesDir, { recursive: true });
  }

  for (const [name, url] of Object.entries(FILTER_LISTS)) {
    try {
      const rules = await convertList(name, url);
      const outPath = path.join(rulesDir, `${name}.json`);
      fs.writeFileSync(outPath, JSON.stringify(rules, null, 2));
      console.log(`  Written to ${outPath}`);
    } catch (err) {
      console.error(`Error processing ${name}:`, err.message);
      // Write empty ruleset so extension still loads
      const outPath = path.join(rulesDir, `${name}.json`);
      fs.writeFileSync(outPath, '[]');
    }
  }

  console.log('Done!');
}

main();
