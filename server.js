const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Extract canonical URL from a webpage
async function getCanonicalUrl(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const canonicalLink = $('link[rel="canonical"]').attr('href');
    
    if (!canonicalLink) {
      return { success: false, message: 'No canonical URL found' };
    }
    
    // Make sure we have a full URL
    let fullCanonicalUrl = canonicalLink;
    if (canonicalLink.startsWith('/')) {
      const baseUrl = new URL(url);
      fullCanonicalUrl = `${baseUrl.protocol}//${baseUrl.host}${canonicalLink}`;
    } else if (!canonicalLink.startsWith('http')) {
      const baseUrl = new URL(url);
      fullCanonicalUrl = `${baseUrl.protocol}//${baseUrl.host}/${canonicalLink}`;
    }
    
    // Check if canonical URL is from a different domain
    const originalDomain = new URL(url).hostname;
    const canonicalDomain = new URL(fullCanonicalUrl).hostname;
    
    if (originalDomain === canonicalDomain) {
      return { 
        success: true, 
        canonicalUrl: fullCanonicalUrl,
        differentDomain: false,
        message: 'Canonical URL is on the same domain' 
      };
    }
    
    return { 
      success: true, 
      canonicalUrl: fullCanonicalUrl,
      differentDomain: true 
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Error fetching URL: ${error.message}` 
    };
  }
}

// Extract schema from a webpage
async function extractPageSchema(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    
    // Collect schema data
    const schema = {
      title: $('title').text().trim(),
      description: $('meta[name="description"]').attr('content') || '',
      h1Tags: $('h1').length,
      h2Tags: $('h2').length,
      metaTags: $('meta').length,
      links: $('a').length,
      images: $('img').length,
      paragraphs: $('p').length,
      scripts: $('script').length,
      jsonLdData: [],
      
      // Add detailed content extraction
      h1Content: $('h1').first().text().trim(),
      h2Contents: (url.includes('yahoo.com') ? 
                 $('article').find('h2') : 
                 $('article, [role="main"], .content, .main, main').find('h2'))
                 .filter(function() {
                   const parentClasses = $(this).parents().map(function() {
                     return $(this).attr('class') || '';
                   }).get().join(' ').toLowerCase();
                   
                   // Filter out h2s that appear in common containers
                   return !parentClasses.match(/sidebar|related|recommended|recirculation|footer|widget|more-from|also-read|subnav|navigation/);
                 })
                 .map((i, el) => $(el).text().trim())
                 .get()
                 .slice(0, 3),
      metaKeywords: $('meta[name="keywords"]').attr('content') || '',
      firstParagraph: $('article p, [role="main"] p, .content p, .main p, main p').first().text().trim() || $('p').first().text().trim(),
      articleText: $('article, [role="main"], .content, .main, main')
                    .find('p')
                    .map((i, el) => $(el).text().trim())
                    .get()
                    .join(' ')
                    .substring(0, 500) + '...',
      mainImageUrl: $('meta[property="og:image"]').attr('content') || 
                    $('article img, .content img, main img').first().attr('src') || '',
      publishedDate: $('meta[property="article:published_time"]').attr('content') || 
                     $('meta[itemprop="datePublished"]').attr('content') || 
                     $('[itemprop="datePublished"]').attr('content') || 
                     $('time[datetime]').first().attr('datetime') || '',
               
      modifiedDate: $('meta[property="article:modified_time"]').attr('content') || 
                    $('meta[itemprop="dateModified"]').attr('content') || 
                    $('[itemprop="dateModified"]').attr('content') || ''
    };
    
    // Extract JSON-LD structured data
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        schema.jsonLdData.push(JSON.parse($(el).html()));
      } catch (e) {
        // Skip invalid JSON
      }
    });
    
    // Extract specific schema properties from jsonLdData
    let schemaProperties = {
      headline: '',
      authors: [],
      datePublished: '',
      publisher: '',
      image: '',
      articleBody: ''
    };

    // Try to extract schema properties from JSON-LD data
    schema.jsonLdData.forEach(item => {
      if (item['@type'] === 'Article' || item['@type'] === 'NewsArticle' || 
          (Array.isArray(item['@type']) && 
          (item['@type'].includes('Article') || item['@type'].includes('NewsArticle')))) {
        
        schemaProperties.headline = item.headline || schemaProperties.headline;
        schemaProperties.datePublished = item.datePublished || schemaProperties.datePublished;
        schemaProperties.publisher = item.publisher?.name || 
                                    (typeof item.publisher === 'string' ? item.publisher : '') || 
                                    schemaProperties.publisher;
        schemaProperties.image = item.image?.url || 
                                (typeof item.image === 'string' ? item.image : '') || 
                                schemaProperties.image;
        schemaProperties.articleBody = item.articleBody || schemaProperties.articleBody;
        
        // Handle authors
        if (item.author) {
          if (Array.isArray(item.author)) {
            const authorNames = item.author.map(a => a.name || (typeof a === 'string' ? a : '')).filter(Boolean);
            schemaProperties.authors = [...schemaProperties.authors, ...authorNames];
          } else {
            const authorName = item.author.name || (typeof item.author === 'string' ? item.author : '');
            if (authorName) {
              schemaProperties.authors.push(authorName);
            }
          }
        }
      }
    });

    schema.schemaProperties = schemaProperties;
    
    return { success: true, schema };
  } catch (error) {
    return { 
      success: false, 
      message: `Error extracting schema from URL: ${error.message}` 
    };
  }
}

// Calculate fidelity score between original and canonical schemas
function calculateFidelityScore(originalSchema, canonicalSchema) {
  let totalPoints = 0;
  let earnedPoints = 0;
  
  // Compare title (3 points)
  totalPoints += 3;
  if (originalSchema.title === canonicalSchema.title) {
    earnedPoints += 3;
  } else if (originalSchema.title && canonicalSchema.title) {
    // Clean titles by removing site names
    const cleanTitle = (title) => {
      return title.replace(/(\s[-|:]\s.*$)|(\s[-|:]\s.*$)/g, '').trim();
    };
    
    const cleanTitle1 = cleanTitle(originalSchema.title);
    const cleanTitle2 = cleanTitle(canonicalSchema.title);
    
    if (cleanTitle1 === cleanTitle2) {
      earnedPoints += 3;
    } else if (cleanTitle1.includes(cleanTitle2) || cleanTitle2.includes(cleanTitle1)) {
      earnedPoints += 1.5;
    }
  }
  
  // Compare description (3 points)
  totalPoints += 3;
  if (originalSchema.description === canonicalSchema.description) {
    earnedPoints += 3;
  } else if (originalSchema.description && canonicalSchema.description) {
    // Normalize text
    const normalize = (text) => {
      return text.toLowerCase().replace(/\s+/g, ' ').trim();
    };
    
    const normalizedDesc1 = normalize(originalSchema.description);
    const normalizedDesc2 = normalize(canonicalSchema.description);
    
    if (normalizedDesc1 === normalizedDesc2) {
      earnedPoints += 3;
    } else if (normalizedDesc1.includes(normalizedDesc2) || normalizedDesc2.includes(normalizedDesc1)) {
      earnedPoints += 1.5;
    } else {
      // Calculate word overlap
      const words1 = normalizedDesc1.split(' ');
      const words2 = normalizedDesc2.split(' ');
      
      const uniqueWords1 = new Set(words1);
      const uniqueWords2 = new Set(words2);
      
      let sharedWords = 0;
      uniqueWords1.forEach(word => {
        if (uniqueWords2.has(word)) sharedWords++;
      });
      
      const totalUniqueWords = new Set([...uniqueWords1, ...uniqueWords2]).size;
      const overlapScore = sharedWords / totalUniqueWords;
      
      if (overlapScore > 0.5) {
        earnedPoints += overlapScore * 3;
      }
    }
  }
  
  // Compare heading structure (2 points)
  totalPoints += 2;
  const h1Difference = Math.abs(originalSchema.h1Tags - canonicalSchema.h1Tags);
  const h2Difference = Math.abs(originalSchema.h2Tags - canonicalSchema.h2Tags);
  if (h1Difference === 0 && h2Difference === 0) {
    earnedPoints += 2;
  } else if (h1Difference <= 1 && h2Difference <= 2) {
    earnedPoints += 1;
  }
  
  // Compare content volume (2 points)
  totalPoints += 2;
  const paragraphDifference = Math.abs(originalSchema.paragraphs - canonicalSchema.paragraphs);
  const paragraphRatio = Math.min(originalSchema.paragraphs, canonicalSchema.paragraphs) / 
                         Math.max(originalSchema.paragraphs, canonicalSchema.paragraphs);
  if (paragraphDifference === 0) {
    earnedPoints += 2;
  } else if (paragraphRatio > 0.8) {
    earnedPoints += 1;
  }
  
  // Compare dates (3 points) - prioritize schema dates
  totalPoints += 3;
  
  // First check schema dates (these are most important)
  if (originalSchema.schemaProperties?.datePublished && canonicalSchema.schemaProperties?.datePublished) {
    const schemaOrigDate = new Date(originalSchema.schemaProperties.datePublished);
    const schemaCanonDate = new Date(canonicalSchema.schemaProperties.datePublished);
    
    if (!isNaN(schemaOrigDate) && !isNaN(schemaCanonDate)) {
      if (schemaOrigDate.toISOString() === schemaCanonDate.toISOString()) {
        earnedPoints += 3; // Exact schema date match
      } else if (schemaOrigDate.toDateString() === schemaCanonDate.toDateString()) {
        earnedPoints += 2; // Same day
      } else {
        const diffTime = Math.abs(schemaOrigDate - schemaCanonDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          earnedPoints += 1; // 1 day difference
        }
      }
    }
  } 
  // Fallback to meta dates if schema dates aren't available
  else if (originalSchema.publishedDate && canonicalSchema.publishedDate) {
    const originalDate = new Date(originalSchema.publishedDate);
    const canonicalDate = new Date(canonicalSchema.publishedDate);
    
    // Check if dates are valid
    if (!isNaN(originalDate) && !isNaN(canonicalDate)) {
      // Check if dates are the same date (ignoring time)
      if (originalDate.toDateString() === canonicalDate.toDateString()) {
        earnedPoints += 2;
      } else {
        // Check if dates are within 1 day of each other
        const diffTime = Math.abs(originalDate - canonicalDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          earnedPoints += 1;
        }
      }
    }
  }
  
  // Compare JSON-LD data (5 points)
  totalPoints += 5;
  if (originalSchema.jsonLdData.length > 0 && canonicalSchema.jsonLdData.length > 0) {
    // Basic check - do both have structured data?
    earnedPoints += 2;
    
    // Try to match types of structured data
    const originalTypes = new Set(originalSchema.jsonLdData.map(item => {
      if (Array.isArray(item['@type'])) return item['@type'];
      return [item['@type']];
    }).flat());
    
    const canonicalTypes = new Set(canonicalSchema.jsonLdData.map(item => {
      if (Array.isArray(item['@type'])) return item['@type'];
      return [item['@type']];
    }).flat());
    
    let matchedTypes = 0;
    originalTypes.forEach(type => {
      if (canonicalTypes.has(type)) matchedTypes++;
    });
    
    if (matchedTypes > 0) {
      earnedPoints += Math.min(3, matchedTypes);
    }
  }
  
  // Calculate final score as percentage
  const rawScore = earnedPoints / totalPoints;
  const finalScore = Math.round(rawScore * 100);
  
  return {
    score: finalScore,
    details: {
      totalPoints,
      earnedPoints,
      comparisons: {
        title: originalSchema.title === canonicalSchema.title,
        description: originalSchema.description === canonicalSchema.description,
        headings: h1Difference === 0 && h2Difference === 0,
        contentVolume: paragraphRatio
      }
    }
  };
}

// API endpoint to check URL fidelity
app.post('/api/check-fidelity', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ success: false, message: 'URL is required' });
  }
  
  try {
    // Validate URL format
    new URL(url);
    
    // Step 1: Get canonical URL
    const canonicalResult = await getCanonicalUrl(url);
    
    if (!canonicalResult.success) {
      return res.json({ success: false, message: canonicalResult.message });
    }
    
    // If canonical is same domain, return early with a message
    if (!canonicalResult.differentDomain) {
      return res.json({ 
        success: true, 
        canonicalUrl: canonicalResult.canonicalUrl,
        message: canonicalResult.message,
        sameDomain: true
      });
    }
    
    // Step 2: Extract schema from both URLs
    const originalSchemaResult = await extractPageSchema(url);
    const canonicalSchemaResult = await extractPageSchema(canonicalResult.canonicalUrl);
    
    if (!originalSchemaResult.success) {
      return res.json({ success: false, message: originalSchemaResult.message });
    }
    
    if (!canonicalSchemaResult.success) {
      return res.json({ success: false, message: canonicalSchemaResult.message });
    }
    
    // Step 3: Calculate fidelity score
    const fidelityResult = calculateFidelityScore(
      originalSchemaResult.schema, 
      canonicalSchemaResult.schema
    );
    
    // Return complete result
    return res.json({
      success: true,
      originalUrl: url,
      canonicalUrl: canonicalResult.canonicalUrl,
      fidelityScore: fidelityResult.score,
      fidelityDetails: fidelityResult.details,
      originalSchema: originalSchemaResult.schema,
      canonicalSchema: canonicalSchemaResult.schema
    });
    
  } catch (error) {
    if (error.code === 'ERR_INVALID_URL') {
      return res.status(400).json({ success: false, message: 'Invalid URL format' });
    }
    return res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});