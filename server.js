const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Extract canonical URL from a webpage
async function getCanonicalUrl(url) {
  try {
    // Special handling for different URLs
    const isYahooFinance = url.includes('finance.yahoo.com');
    const isYahoo = url.includes('yahoo.com');
    
    // Use a custom HTTPS agent with keepAlive enabled
    const agent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false // Allow self-signed certificates
    });
    
    const config = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      timeout: 30000, // Extended timeout
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      decompress: true,
      httpsAgent: agent,
      maxRedirects: 10
    };
    
    // Add enhanced configs for Yahoo URLs
    if (isYahoo) {
      config.headers['Referer'] = 'https://www.google.com/';
      config.headers['Cache-Control'] = 'no-cache';
      config.headers['Pragma'] = 'no-cache';
      
      if (isYahooFinance) {
        config.timeout = 45000; // Even longer timeout for finance pages
      }
    }
    
    console.log(`Fetching canonical URL for: ${url}`);
    const response = await axios.get(url, config);
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
    // Provide more specific error messages for known issues
    if (url.includes('finance.yahoo.com') && error.message.includes('header')) {
      return { 
        success: false, 
        message: `Error processing Yahoo Finance URL: Header size too large. The server is having trouble with this specific Yahoo Finance URL.` 
      };
    }
    
    // Provide more context based on error type
    let errorMessage = `Error fetching URL: ${error.message}`;
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out. The page might be too large or the server is responding slowly.';
    } else if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorMessage = `Server responded with error: ${error.response.status} ${error.response.statusText}`;
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received from server. Check your internet connection.';
    }
    
    return { 
      success: false, 
      message: errorMessage
    };
  }
}

// Extract schema from a webpage
async function extractPageSchema(url) {
  try {
    // Special handling for different URLs
    const isYahooFinance = url.includes('finance.yahoo.com');
    const isYahoo = url.includes('yahoo.com');
    
    // Use a custom HTTPS agent with keepAlive enabled
    const agent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false // Allow self-signed certificates
    });
    
    const config = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      timeout: 30000, // Extended timeout
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      decompress: true,
      httpsAgent: agent,
      maxRedirects: 10
    };
    
    // Add enhanced configs for Yahoo URLs
    if (isYahoo) {
      config.headers['Referer'] = 'https://www.google.com/';
      config.headers['Cache-Control'] = 'no-cache';
      config.headers['Pragma'] = 'no-cache';
      
      if (isYahooFinance) {
        config.timeout = 45000; // Even longer timeout for finance pages
      }
    }
    
    console.log(`Extracting schema for: ${url}`);
    const response = await axios.get(url, config);
    const $ = cheerio.load(response.data);
    
    // Collect schema data
    const schema = {
      title: (function() {
        // Get only the first title element
        const titleElement = $('title').first();
        let pageTitle = titleElement.length ? titleElement.text().trim() : '';
        
        // Clean up common patterns
        if (pageTitle) {
          // Handle "Main Title | Site Name" pattern
          const titleParts = pageTitle.split(/\s+[|\-–—:]\s+/);
          if (titleParts.length > 1) {
            // Keep main title and site name if it's not too long
            pageTitle = titleParts[0].trim();
            if (titleParts[1].length < 30) {
              pageTitle += " | " + titleParts[1].trim();
            }
          }
          
          // Remove common extraneous text
          pageTitle = pageTitle.replace(/Search/g, '')
                               .replace(/Do Not Sell/g, '')
                               .replace(/\s{2,}/g, ' ')
                               .trim();
        }
        
        return pageTitle;
      })(),
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
      firstParagraph: $('article p, [role="main"] p, .content p, .main p, main p').first().text().trim() || $('p').first().text().trim(),
      articleText: $('article, [role="main"], .content, .main, main')
                    .find('p')
                    .map((i, el) => $(el).text().trim())
                    .get()
                    .join(' ')
                    .substring(0, 500) + '...',
      mainImageUrl: $('meta[property="og:image"]').attr('content') || 
                    $('article img, .content img, main img').first().attr('src') || '',
      publishedDate: (function() {
        // Standard meta tags
        let date = $('meta[property="article:published_time"]').attr('content') || 
                   $('meta[itemprop="datePublished"]').attr('content') || 
                   $('meta[name="publishdate"]').attr('content') || 
                   $('meta[name="pubdate"]').attr('content') || 
                   $('[itemprop="datePublished"]').attr('content') || 
                   $('time[datetime]').first().attr('datetime');
        
        // Check for dates in JSON-LD structured data (most reliable)
        if (!date) {
          $('script[type="application/ld+json"]').each(function() {
            try {
              const text = $(this).html();
              // Simple pattern matching rather than full JSON parsing
              const match = text.match(/"datePublished"\s*:\s*"([^"]+)"/);
              if (match && match[1]) {
                date = match[1];
                return false; // Break the loop
              }
            } catch (e) {}
          });
        }
        
        return date || '';
      })(),

      modifiedDate: (function() {
        // Standard meta tags
        let date = $('meta[property="article:modified_time"]').attr('content') || 
                   $('meta[itemprop="dateModified"]').attr('content') || 
                   $('meta[name="lastmod"]').attr('content') || 
                   $('meta[name="last-modified"]').attr('content') || 
                   $('[itemprop="dateModified"]').attr('content');
        
        // Check for dates in JSON-LD structured data (most reliable)
        if (!date) {
          $('script[type="application/ld+json"]').each(function() {
            try {
              const text = $(this).html();
              // Simple pattern matching rather than full JSON parsing
              const match = text.match(/"dateModified"\s*:\s*"([^"]+)"/);
              if (match && match[1]) {
                date = match[1];
                return false; // Break the loop
              }
            } catch (e) {}
          });
        }
        
        // Check for any Next.js data script (used by many modern sites)
        if (!date) {
          const nextDataScript = $('script#__NEXT_DATA__').html();
          if (nextDataScript) {
            const match = nextDataScript.match(/"dateModified"\s*:\s*"([^"]+)"/);
            if (match && match[1]) {
              date = match[1];
            }
          }
        }
        
        return date || '';
      })(),
    };
    
    // Extract JSON-LD structured data
    if ($('script[type="application/ld+json"]').length > 0) {
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const jsonData = JSON.parse($(el).html());
          schema.jsonLdData.push(jsonData);
          
          // Process @graph structure if present
          if (jsonData['@graph'] && Array.isArray(jsonData['@graph'])) {
            jsonData['@graph'].forEach((item) => {
              schema.jsonLdData.push(item);
            });
          }
        } catch (e) {
          console.log(`Error parsing JSON-LD: ${e.message}`);
        }
      });
    }
    
    // Try to extract schema properties from JSON-LD data
    let schemaProperties = {
      type: '',
      mainEntityOfPage: '',
      headline: '',
      datePublished: '',
      dateModified: '',
      description: '',
      authors: [],
      image: ''
    };

    schema.jsonLdData.forEach(item => {
      // Handle array format (CNN style)
      if (Array.isArray(item)) {
        item.forEach(subItem => {
          extractProperties(subItem);
        });
      } else {
        // Handle object format (Yahoo style)
        extractProperties(item);
      }
    });

    // Helper function to extract only the properties you want
    function extractProperties(item) {
      // Check for article types
      if (item['@type'] === 'Article' || 
          item['@type'] === 'NewsArticle' || 
          (Array.isArray(item['@type']) && 
           (item['@type'].includes('Article') || item['@type'].includes('NewsArticle')))) {
        
        // Extract only the specific properties you want
        schemaProperties.type = item['@type'] || schemaProperties.type;
        schemaProperties.mainEntityOfPage = item.mainEntityOfPage || schemaProperties.mainEntityOfPage;
        schemaProperties.headline = item.headline || schemaProperties.headline;
        schemaProperties.datePublished = item.datePublished || schemaProperties.datePublished;
        schemaProperties.dateModified = item.dateModified || schemaProperties.dateModified;
        schemaProperties.description = item.description || schemaProperties.description;
        
        // Handle image (could be string or object)
        if (item.image) {
          if (typeof item.image === 'string') {
            schemaProperties.image = item.image;
          } else if (item.image.url) {
            schemaProperties.image = item.image.url;
          }
        }
        
        // Handle authors
        if (item.author) {
          if (Array.isArray(item.author)) {
            // Process array of authors
            item.author.forEach(author => {
              const authorName = typeof author === 'string' ? author : author.name;
              if (authorName && !schemaProperties.authors.includes(authorName)) {
                schemaProperties.authors.push(authorName);
              }
            });
          } else {
            // Process single author
            const authorName = typeof item.author === 'string' ? item.author : item.author.name;
            if (authorName && !schemaProperties.authors.includes(authorName)) {
              schemaProperties.authors.push(authorName);
            }
          }
        }
      }
    }

    schema.schemaProperties = schemaProperties;
    
    return { success: true, schema };
  } catch (error) {
    console.error(`Error extracting schema from URL ${url}: ${error.message}`);
    
    // Provide more specific error messages for known issues
    if (url.includes('finance.yahoo.com') && error.message.includes('header')) {
      return { 
        success: false, 
        message: `Error processing Yahoo Finance URL: Header size too large. The server is having trouble with this specific Yahoo Finance URL.` 
      };
    }
    
    // Provide more context based on error type
    let errorMessage = `Error extracting schema from URL: ${error.message}`;
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out. The page might be too large or the server is responding slowly.';
    } else if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorMessage = `Server responded with error: ${error.response.status} ${error.response.statusText}`;
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received from server. Check your internet connection.';
    }
    
    return { 
      success: false, 
      message: errorMessage
    };
  }
}

// Calculate fidelity score between original and canonical schemas
function calculateFidelityScore(originalSchema, canonicalSchema) {
  let totalPoints = 0;
  let earnedPoints = 0;
  
  // Compare title (3 points)
  totalPoints += 3;
  let titleMatch = false;
  
  if (originalSchema.title === canonicalSchema.title) {
    earnedPoints += 3;
    titleMatch = true;
  } else if (originalSchema.title && canonicalSchema.title) {
    // Clean titles by removing site names
    const cleanTitle = (title) => {
      // Common patterns: " - Site Name", " | Site Name", ": Site Name"
      return title.replace(/(\s[-|:]\s.*$)|(\s[-|:]\s.*$)/g, '').trim();
    };
    
    const cleanTitle1 = cleanTitle(originalSchema.title);
    const cleanTitle2 = cleanTitle(canonicalSchema.title);
    
    // Calculate similarity score for cleaned titles
    const calculateSimilarity = (str1, str2) => {
      if (!str1 || !str2) return 0;
      
      // Convert to lowercase and split into words
      const words1 = str1.toLowerCase().split(/\s+/);
      const words2 = str2.toLowerCase().split(/\s+/);
      
      // Count matching words
      let matchingWords = 0;
      for (const word of words1) {
        if (word.length > 2 && words2.includes(word)) {
          matchingWords++;
        }
      }
      
      // Calculate similarity as a percentage
      const totalUniqueWords = new Set([...words1, ...words2]).size;
      return matchingWords / Math.min(words1.length, words2.length);
    };
    
    const similarity = calculateSimilarity(cleanTitle1, cleanTitle2);
    
    if (cleanTitle1 === cleanTitle2) {
      earnedPoints += 3;
      titleMatch = true; // Consider matching titles (excluding site names) as a full match
    } else if (similarity >= 0.7) {
      // High similarity (70% or more matching words)
      earnedPoints += 2;
      titleMatch = true;
    } else if (similarity >= 0.5) {
      // Moderate similarity (50-70% matching words)
      earnedPoints += 1.5;
      titleMatch = 'partial';
    } else if (cleanTitle1.includes(cleanTitle2) || cleanTitle2.includes(cleanTitle1)) {
      // One title contains the other but low word similarity
      earnedPoints += 1;
      titleMatch = 'partial';
    } else {
      // Low similarity
      titleMatch = false;
    }
  }
  
  // Also consider H1 headline in title comparison
  if (originalSchema.h1Content && canonicalSchema.h1Content) {
    const normalize = (text) => {
      return text.toLowerCase().replace(/\s+/g, ' ').trim();
    };
    
    const normalizedH1Original = normalize(originalSchema.h1Content);
    const normalizedH1Canonical = normalize(canonicalSchema.h1Content);
    
    // Calculate H1 similarity
    const calculateSimilarity = (str1, str2) => {
      if (!str1 || !str2) return 0;
      
      // Convert to lowercase and split into words
      const words1 = str1.toLowerCase().split(/\s+/);
      const words2 = str2.toLowerCase().split(/\s+/);
      
      // Count matching words
      let matchingWords = 0;
      for (const word of words1) {
        if (word.length > 2 && words2.includes(word)) {
          matchingWords++;
        }
      }
      
      // Calculate similarity as a percentage
      return matchingWords / Math.min(words1.length, words2.length);
    };
    
    const h1Similarity = calculateSimilarity(normalizedH1Original, normalizedH1Canonical);
    
    if (normalizedH1Original === normalizedH1Canonical) {
      // If H1s match exactly
      if (titleMatch === false) {
        earnedPoints += 1.5; // Add some points for matching H1
        titleMatch = 'partial'; // Only consider it a partial match even if H1s match exactly
      }
    } else if (h1Similarity >= 0.7) {
      // If H1s have high similarity
      if (titleMatch === false) {
        earnedPoints += 1; // Add points for similar H1
        titleMatch = 'partial';
      }
    } else if (normalizedH1Original.includes(normalizedH1Canonical) || 
               normalizedH1Canonical.includes(normalizedH1Original)) {
      // If H1s have significant overlap
      if (titleMatch === false) {
        earnedPoints += 0.75; // Add fewer points for partial H1 match
        titleMatch = 'partial';
      }
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
  let dateMatch = false;
  let publishedDateMatch = false;
  let modifiedDateMatch = false;
  
  // Check published dates from schema
  if (originalSchema.schemaProperties?.datePublished && canonicalSchema.schemaProperties?.datePublished) {
    const schemaOrigDate = new Date(originalSchema.schemaProperties.datePublished);
    const schemaCanonDate = new Date(canonicalSchema.schemaProperties.datePublished);
    
    if (!isNaN(schemaOrigDate) && !isNaN(schemaCanonDate)) {
      if (schemaOrigDate.toISOString() === schemaCanonDate.toISOString()) {
        earnedPoints += 2; // Exact schema date match
        publishedDateMatch = true;
      } else if (schemaOrigDate.toDateString() === schemaCanonDate.toDateString()) {
        earnedPoints += 1.5; // Same day
        publishedDateMatch = 'partial';
      } else {
        const diffTime = Math.abs(schemaOrigDate - schemaCanonDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          earnedPoints += 0.75; // 1 day difference
          publishedDateMatch = 'partial';
        }
      }
    }
  } 
  // Fallback to meta published dates if schema dates aren't available
  else if (originalSchema.publishedDate && canonicalSchema.publishedDate) {
    const originalDate = new Date(originalSchema.publishedDate);
    const canonicalDate = new Date(canonicalSchema.publishedDate);
    
    // Check if dates are valid
    if (!isNaN(originalDate) && !isNaN(canonicalDate)) {
      // Check if dates are the same date (ignoring time)
      if (originalDate.toDateString() === canonicalDate.toDateString()) {
        earnedPoints += 1.5;
        publishedDateMatch = true;
      } else {
        // Check if dates are within 1 day of each other
        const diffTime = Math.abs(originalDate - canonicalDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          earnedPoints += 0.75;
          publishedDateMatch = 'partial';
        }
      }
    }
  }
  
  // Check modified dates from schema
  if (originalSchema.schemaProperties?.dateModified && canonicalSchema.schemaProperties?.dateModified) {
    const schemaOrigModDate = new Date(originalSchema.schemaProperties.dateModified);
    const schemaCanonModDate = new Date(canonicalSchema.schemaProperties.dateModified);
    
    if (!isNaN(schemaOrigModDate) && !isNaN(schemaCanonModDate)) {
      if (schemaOrigModDate.toISOString() === schemaCanonModDate.toISOString()) {
        earnedPoints += 1; // Exact modified date match
        modifiedDateMatch = true;
      } else if (schemaOrigModDate.toDateString() === schemaCanonModDate.toDateString()) {
        earnedPoints += 0.5; // Same day
        modifiedDateMatch = 'partial';
      }
    }
  }
  // Check meta modified dates
  else if (originalSchema.modifiedDate && canonicalSchema.modifiedDate) {
    const originalModDate = new Date(originalSchema.modifiedDate);
    const canonicalModDate = new Date(canonicalSchema.modifiedDate);
    
    if (!isNaN(originalModDate) && !isNaN(canonicalModDate)) {
      if (originalModDate.toDateString() === canonicalModDate.toDateString()) {
        earnedPoints += 0.5;
        modifiedDateMatch = 'partial';
      }
    }
  }
  
  // Determine overall date match status
  if (publishedDateMatch === true && modifiedDateMatch === true) {
    // Both dates match exactly
    dateMatch = true;
    console.log("Date Match: Both dates match exactly");
  } else if (publishedDateMatch === true || modifiedDateMatch === true) {
    // At least one date matches exactly
    dateMatch = true;
    console.log("Date Match: At least one date matches exactly", { publishedDateMatch, modifiedDateMatch });
  } else if (publishedDateMatch === 'partial' || modifiedDateMatch === 'partial') {
    // At least one date partially matches
    dateMatch = 'partial';
    console.log("Date Match: Partial match", { publishedDateMatch, modifiedDateMatch });
  } else {
    console.log("Date Match: No match", { publishedDateMatch, modifiedDateMatch });
  }
  
  // Cap the total earned points for dates at 3
  earnedPoints = Math.min(earnedPoints, 3);
  
  // Compare authors (2 points)
  totalPoints += 2;
  let authorMatch = false;
  
  // Check schema authors
  if (originalSchema.schemaProperties?.authors && canonicalSchema.schemaProperties?.authors) {
    const originalAuthors = originalSchema.schemaProperties.authors;
    const canonicalAuthors = canonicalSchema.schemaProperties.authors;
    
    if (originalAuthors.length > 0 && canonicalAuthors.length > 0) {
      // Check for exact author match
      if (originalAuthors.length === canonicalAuthors.length) {
        const allMatch = originalAuthors.every(author => 
          canonicalAuthors.some(canonAuthor => 
            canonAuthor.toLowerCase() === author.toLowerCase()));
        
        if (allMatch) {
          earnedPoints += 2;
          authorMatch = true;
        } else {
          // Check for partial match (at least one author matches)
          const someMatch = originalAuthors.some(author => 
            canonicalAuthors.some(canonAuthor => 
              canonAuthor.toLowerCase() === author.toLowerCase()));
          
          if (someMatch) {
            earnedPoints += 1;
            authorMatch = 'partial';
          } else {
            // Check for similar author names (partial string matches)
            const similarMatch = originalAuthors.some(author => 
              canonicalAuthors.some(canonAuthor => {
                // Check if author names share significant parts
                const authorWords = author.toLowerCase().split(/\s+/);
                const canonAuthorWords = canonAuthor.toLowerCase().split(/\s+/);
                
                // Check for any word overlap in names
                return authorWords.some(word => 
                  word.length > 2 && canonAuthorWords.some(canonWord => 
                    canonWord.includes(word) || word.includes(canonWord)
                  )
                );
              })
            );
            
            if (similarMatch) {
              earnedPoints += 0.5;
              authorMatch = 'partial';
            }
          }
        }
      } else {
        // Different number of authors, check for any overlap
        const someMatch = originalAuthors.some(author => 
          canonicalAuthors.some(canonAuthor => 
            canonAuthor.toLowerCase() === author.toLowerCase()));
        
        if (someMatch) {
          earnedPoints += 1;
          authorMatch = 'partial';
        } else {
          // Check for similar author names (partial string matches)
          const similarMatch = originalAuthors.some(author => 
            canonicalAuthors.some(canonAuthor => {
              // Check if author names share significant parts
              const authorWords = author.toLowerCase().split(/\s+/);
              const canonAuthorWords = canonAuthor.toLowerCase().split(/\s+/);
              
              // Check for any word overlap in names
              return authorWords.some(word => 
                word.length > 2 && canonAuthorWords.some(canonWord => 
                  canonWord.includes(word) || word.includes(canonWord)
                )
              );
            })
          );
          
          if (similarMatch) {
            earnedPoints += 0.5;
            authorMatch = 'partial';
          }
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
        title: titleMatch,
        description: originalSchema.description === canonicalSchema.description,
        date: dateMatch,
        author: authorMatch,
        contentVolume: paragraphRatio
      }
    }
  };
}

// URL validation function
function validateUrl(url) {
  if (!url) {
    return { valid: false, message: 'URL is required' };
  }
  
  // Trim whitespace
  url = url.trim();
  
  // Require http:// or https:// protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { valid: false, message: 'URL must start with http:// or https://' };
  }
  
  try {
    // Validate URL format
    const parsedUrl = new URL(url);
    
    // Check for valid hostname
    if (!parsedUrl.hostname || parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
      return { valid: false, message: 'Invalid hostname in URL' };
    }
    
    // Check for minimum TLD length
    const parts = parsedUrl.hostname.split('.');
    if (parts.length < 2 || parts[parts.length - 1].length < 2) {
      return { valid: false, message: 'Invalid domain in URL' };
    }
    
    return { valid: true, url: url };
  } catch (error) {
    return { valid: false, message: 'Invalid URL format' };
  }
}

// API endpoint to check URL fidelity
app.post('/api/check-fidelity', async (req, res) => {
  const { url } = req.body;
  
  // Validate URL
  const validation = validateUrl(url);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: validation.message });
  }
  
  try {
    // URL is validated and sanitized
    const validatedUrl = validation.url;
    
    // Step 1: Get canonical URL
    const canonicalResult = await getCanonicalUrl(validatedUrl);
    
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
    
    // Log before sending response
    console.log("Sending schema data:");
    console.log("Original schema properties:", originalSchemaResult.schema.schemaProperties);
    console.log("Canonical schema properties:", canonicalSchemaResult.schema.schemaProperties);
    
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
    // Since we've already validated the URL format, this is likely a different error
    console.error('Error processing URL:', error);
    return res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

// Special handler for Yahoo Finance URLs
app.post('/api/check-finance-url', async (req, res) => {
  const { url } = req.body;
  
  // Validate URL is from Yahoo Finance
  if (!url.includes('finance.yahoo.com')) {
    return res.status(400).json({ 
      success: false, 
      message: 'This endpoint is specifically for Yahoo Finance URLs' 
    });
  }
  
  // Validate URL format
  const validation = validateUrl(url);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: validation.message });
  }
  
  try {
    console.log('Processing Yahoo Finance URL:', url);
    
    // Due to Yahoo Finance's header issues, we'll just extract a probable canonical URL
    // based on URL patterns instead of fetching the actual page
    
    // Extract the article ID from the URL
    const urlParts = url.split('-');
    const articleId = urlParts[urlParts.length - 1].replace('.html', '');
    
    if (!articleId || articleId.length < 5) {
      return res.json({ 
        success: false, 
        message: 'Could not extract article ID from Yahoo Finance URL' 
      });
    }
    
    // Try to derive the business insider canonical URL
    const businessInsiderUrl = `https://www.businessinsider.com/article/${articleId}`;
    
    // Return a simple success with best-guess canonical URL
    return res.json({
      success: true,
      message: 'Yahoo Finance URL processed (without fetching the page)',
      originalUrl: url,
      canonicalUrl: businessInsiderUrl,
      note: 'This is a best-guess canonical URL based on pattern matching, not actual page content'
    });
  } catch (error) {
    console.error('Error processing Yahoo Finance URL:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Error processing Yahoo Finance URL: ${error.message}` 
    });
  }
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});