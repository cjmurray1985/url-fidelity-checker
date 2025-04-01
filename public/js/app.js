// Dark mode is now hardcoded in HTML, no need for theme detection
document.addEventListener('DOMContentLoaded', () => {
  // Apply theme transition class to smooth color changes
  document.body.classList.add('theme-transition');
  document.querySelector('html').classList.add('theme-transition');
  
  // DOM Elements
  const urlForm = document.getElementById('url-form');
  const urlInput = document.getElementById('url-input');
  const checkButton = document.getElementById('check-button');
  const loadingSection = document.getElementById('loading');
  const resultsSection = document.getElementById('results-section');
  const errorSection = document.getElementById('error-section');
  const errorMessage = document.getElementById('error-message');
  
  // Results elements
  const fidelityScore = document.getElementById('fidelity-score');
  const originalUrl = document.getElementById('original-url');
  const canonicalUrl = document.getElementById('canonical-url');
  const titleMatch = document.getElementById('title-match');
  const descriptionMatch = document.getElementById('description-match');
  const headingsMatch = document.getElementById('headings-match');
  const contentMatch = document.getElementById('content-match');
  const originalStats = document.getElementById('original-stats');
  const canonicalStats = document.getElementById('canonical-stats');
  const contentComparisonTable = document.getElementById('content-comparison-table');
  const dateMatch = document.getElementById('date-match');
  const authorMatch = document.getElementById('author-match');
  
  // Keyboard shortcut helper
  const keyboardShortcuts = [
    { key: '/', description: 'Focus the URL input' },
    { key: 'Enter', description: 'Check URL (when input is focused)' },
    { key: 'Escape', description: 'Clear results and focus URL input' },
    { key: 'r', description: 'Scroll to results section (when available)' }
  ];
  
  // Add smooth fade-in effect to the body when loaded
  document.body.style.opacity = 0;
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.8s ease';
    document.body.style.opacity = 1;
  }, 100);
  
  // Add simple animation to the glow element
  const glowElement = document.querySelector('.glow');
  if (glowElement) {
    const pulseAnimation = () => {
      glowElement.animate([
        { opacity: 0.3, width: '300px' },
        { opacity: 0.6, width: '350px' },
        { opacity: 0.3, width: '300px' }
      ], {
        duration: 3000,
        iterations: Infinity
      });
    };
    
    pulseAnimation();
  }
  
  // Keyboard shortcuts implementation
  document.addEventListener('keydown', (e) => {
    // Skip if user is typing in input field (except for Escape)
    if (e.target.tagName === 'INPUT' && e.target.type === 'text' && e.key !== 'Escape') {
      return;
    }
    
    // Skip if modifier keys are pressed (except for slash which often uses shift)
    if ((e.ctrlKey || e.metaKey || (e.altKey && e.key !== '/')) && e.key !== 'Escape') {
      return;
    }
    
    switch (e.key) {
      case '/':
        // Focus the URL input
        e.preventDefault();
        urlInput.focus();
        break;
      case 'Escape':
        // Clear results and focus URL input
        resetUI();
        urlInput.focus();
        break;
      case 'r':
        // Scroll to results section if visible
        if (!resultsSection.classList.contains('hidden')) {
          window.scrollTo({
            top: resultsSection.offsetTop - 50,
            behavior: 'smooth'
          });
        } else if (!errorSection.classList.contains('hidden')) {
          window.scrollTo({
            top: errorSection.offsetTop - 50,
            behavior: 'smooth'
          });
        }
        break;
    }
  });
  
  // Form submission
  urlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset UI
    resetUI();
    
    // Focus effect when submitting
    urlInput.blur();
    
    // Validate input first
    const url = urlInput.value.trim();
    
    // Check if URL is empty
    if (!url) {
      showError('URL is required');
      return;
    }
    
    // Check if URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      showError('Please enter a valid URL including http:// or https://');
      return;
    }
    
    // Full URL validation
    if (!isValidURL(url)) {
      showError('Please enter a valid website URL (e.g., https://example.com)');
      return;
    }
    
    // Show loading with fade effect
    fadeIn(loadingSection);
    
    try {
      // Determine which API endpoint to use based on URL
      const isYahooFinance = url.includes('finance.yahoo.com');
      const apiEndpoint = isYahooFinance ? '/api/check-finance-url' : '/api/check-fidelity';
      
      console.log(`Using endpoint ${apiEndpoint} for URL: ${url}`);
      
      // Call the API
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      
      // Hide loading
      fadeOut(loadingSection);
      
      if (!data.success) {
        // Show error
        showError(data.message);
        return;
      }
      
      // Special handling for Yahoo Finance URLs that use the simplified endpoint
      if (url.includes('finance.yahoo.com') && !data.fidelityScore) {
        // Just show the canonical URL for Yahoo Finance
        showFinanceResult(data);
        return;
      }
      
      // Handle same domain canonical
      if (data.sameDomain) {
        showError(data.message, false);
        return;
      }
      
      // Slight delay before showing results for smooth transition
      setTimeout(() => {
        // Display results
        displayResults(data);
      }, 300);
      
    } catch (error) {
      // Hide loading
      fadeOut(loadingSection);
      
      // Show error
      showError(error.message);
    }
  });
  
  // Validate URL function
  function isValidURL(url) {
    // Check if URL is empty or just whitespace
    if (!url || url.trim() === '') {
      return false;
    }
    
    // Ensure URL has http:// or https:// protocol
    if (!url.trim().startsWith('http://') && !url.trim().startsWith('https://')) {
      return false;
    }
    
    try {
      // Parse the URL
      const parsedUrl = new URL(url);
      
      // Validate hostname (reject localhost and IP addresses)
      if (!parsedUrl.hostname || 
          parsedUrl.hostname === 'localhost' || 
          parsedUrl.hostname === '127.0.0.1' ||
          /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsedUrl.hostname)) {
        return false;
      }
      
      // Ensure domain has at least one dot and a valid TLD (at least 2 chars)
      const parts = parsedUrl.hostname.split('.');
      if (parts.length < 2 || parts[parts.length - 1].length < 2) {
        return false;
      }
      
      return true;
    } catch (e) {
      return false;
    }
  }
  
  // Reset UI function
  function resetUI() {
    resultsSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    originalStats.innerHTML = '';
    canonicalStats.innerHTML = '';
    if (contentComparisonTable) {
      contentComparisonTable.querySelector('tbody').innerHTML = '';
    }
  }
  
  // Fade in effect
  function fadeIn(element) {
    element.style.opacity = 0;
    element.classList.remove('hidden');
    element.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      element.style.opacity = 1;
    }, 10);
  }
  
  // Fade out effect
  function fadeOut(element) {
    element.style.transition = 'opacity 0.5s ease';
    element.style.opacity = 0;
    setTimeout(() => {
      element.classList.add('hidden');
    }, 500);
  }
  
  // Show error function
  function showError(message, isError = true) {
    errorSection.classList.remove('hidden');
    errorMessage.textContent = message;
    
    if (!isError) {
      errorSection.querySelector('.error-card').style.background = 'rgba(52, 152, 219, 0.15)';
      errorSection.querySelector('.error-card').style.borderLeftColor = '#3498db';
      errorSection.querySelector('h2').style.color = '#3498db';
    }
    
    // Add scroll effect to error message if needed
    window.scrollTo({
      top: errorSection.offsetTop - 50,
      behavior: 'smooth'
    });
    
    // Add fade in effect
    fadeIn(errorSection);
    
    // Focus on the error card for screen readers
    setTimeout(() => {
      errorSection.querySelector('.error-card').focus();
    }, 100);
  }
  
  // Helper function to compare texts with word overlap
  function compareTexts(text1, text2, ogText1, ogText2) {
    // Handle null/undefined values
    if (!text1 && !text2) return { match: true, score: 1, message: "Both missing" };
    
    // If original has text but canonical doesn't, consider it a match (per requirement #2)
    if (text1 && !text2) return { match: true, score: 1, message: "Canonical text missing (ignored)" };
    
    // Only case we consider a mismatch is if canonical has text but original doesn't
    if (!text1 && text2) return { match: false, score: 0, message: "Original text missing" };
    
    // Clean and normalize texts
    const cleanText = (text) => {
      if (!text) return '';
      return text.toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    const clean1 = cleanText(text1);
    const clean2 = cleanText(text2);
    
    // Also clean OG texts if available
    const cleanOg1 = ogText1 ? cleanText(ogText1) : null;
    const cleanOg2 = ogText2 ? cleanText(ogText2) : null;
    
    // Check for exact matches between any combination of texts and OG texts
    if (clean1 === clean2) {
      return { match: true, score: 1, message: "Exact match" };
    }
    
    // Check if OG texts match each other
    if (cleanOg1 && cleanOg2 && cleanOg1 === cleanOg2) {
      return { match: true, score: 1, message: "OG texts match exactly" };
    }
    
    // Check if text matches OG text of the other page
    if (clean1 && cleanOg2 && clean1 === cleanOg2) {
      return { match: true, score: 1, message: "Text matches OG text exactly" };
    }
    
    if (clean2 && cleanOg1 && clean2 === cleanOg1) {
      return { match: true, score: 1, message: "Text matches OG text exactly" };
    }
    
    // Calculate word-based similarity
    const calculateWordSimilarity = (str1, str2) => {
      if (!str1 || !str2) return 0;
      
      const words1 = str1.split(' ').filter(w => w.length > 2);
      const words2 = str2.split(' ').filter(w => w.length > 2);
      
      if (words1.length === 0 || words2.length === 0) return 0;
      
      // Count words that appear in both texts
      const matchingWords = words1.filter(word => words2.includes(word));
      const uniqueWords = [...new Set([...words1, ...words2])];
      
      return matchingWords.length / uniqueWords.length;
    };
    
    // Calculate similarity between all combinations of texts
    const similarities = [
      { type: "Main texts", similarity: calculateWordSimilarity(clean1, clean2) },
    ];
    
    // Add OG text similarities if available
    if (cleanOg1 && cleanOg2) {
      similarities.push({ type: "OG texts", similarity: calculateWordSimilarity(cleanOg1, cleanOg2) });
    }
    if (clean1 && cleanOg2) {
      similarities.push({ type: "Text to OG", similarity: calculateWordSimilarity(clean1, cleanOg2) });
    }
    if (clean2 && cleanOg1) {
      similarities.push({ type: "OG to Text", similarity: calculateWordSimilarity(clean2, cleanOg1) });
    }
    
    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Use the highest similarity score
    const bestMatch = similarities[0];
    
    if (bestMatch.similarity >= 0.8) {
      return { 
        match: true, 
        score: bestMatch.similarity, 
        message: `${bestMatch.type}: High similarity (${Math.round(bestMatch.similarity * 100)}%)` 
      };
    } else if (bestMatch.similarity >= 0.5) {
      return { 
        match: 'partial', 
        score: bestMatch.similarity, 
        message: `${bestMatch.type}: Moderate similarity (${Math.round(bestMatch.similarity * 100)}%)` 
      };
    } else {
      return { 
        match: false, 
        score: bestMatch.similarity, 
        message: `${bestMatch.type}: Low similarity (${Math.round(bestMatch.similarity * 100)}%)` 
      };
    }
  }
  
  // Helper function to compare titles with site name awareness and OG Title integration
  function compareTitles(title1, title2, ogTitle1, ogTitle2) {
    // Handle null/undefined values
    if (!title1 && !title2) return { match: true, score: 1, message: "Both titles missing" };
    
    // If original has title but canonical doesn't, consider it a match (per requirement #2)
    if (title1 && !title2) return { match: true, score: 1, message: "Canonical title missing (ignored)" };
    
    // Only case we consider a mismatch is if canonical has title but original doesn't
    if (!title1 && title2) return { match: false, score: 0, message: "Original title missing" };
    
    // Clean titles - remove common separators and site names
    const cleanTitle = (title) => {
      if (!title) return '';
      
      // Common patterns: " - Site Name", " | Site Name", ": Site Name"
      let cleaned = title.replace(/(\s[-|:]\s.*$)|(\s[-|:]\s.*$)/g, '').trim();
      
      // Additional site name patterns to remove
      const sitePatterns = [
        /\s*[-|]\s*[^-|]*\.(com|org|net|io|co|gov)$/i,
        /\s*[-|]\s*[A-Za-z0-9 ]+(News|Times|Post|Herald|Journal|Chronicle|Gazette|Tribune|Daily|Yahoo|CNN|BBC|NBC|CBS|Fox|Reuters|Bloomberg)$/i,
        /\s*[-|]\s*Yahoo\s*$/i,
        /\s*[-|]\s*Yahoo Finance\s*$/i,
        /\s*[-|]\s*Yahoo News\s*$/i,
        /\s*[-|]\s*Yahoo Sports\s*$/i
      ];
      
      sitePatterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
      });
      
      return cleaned.trim();
    };
    
    const cleanTitle1 = cleanTitle(title1);
    const cleanTitle2 = cleanTitle(title2);
    
    // Also clean OG titles if available, using the same site name exclusion logic
    const cleanOgTitle1 = ogTitle1 ? cleanTitle(ogTitle1) : null;
    const cleanOgTitle2 = ogTitle2 ? cleanTitle(ogTitle2) : null;
    
    // Check for exact matches between any combination of titles and OG titles
    if (cleanTitle1 === cleanTitle2) {
      return { match: true, score: 1, message: "Page titles match (excluding site names)" };
    }
    
    // Check if OG titles match each other
    if (cleanOgTitle1 && cleanOgTitle2 && cleanOgTitle1 === cleanOgTitle2) {
      return { match: true, score: 1, message: "OG titles match (excluding site names)" };
    }
    
    // Check if page title matches OG title of the other page
    if (cleanTitle1 && cleanOgTitle2 && cleanTitle1 === cleanOgTitle2) {
      return { match: true, score: 1, message: "Page title matches OG title (excluding site names)" };
    }
    
    if (cleanTitle2 && cleanOgTitle1 && cleanTitle2 === cleanOgTitle1) {
      return { match: true, score: 1, message: "Page title matches OG title (excluding site names)" };
    }
    
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
      return matchingWords / Math.min(words1.length, words2.length);
    };
    
    // Calculate similarity between all combinations of titles
    const similarities = [
      { type: "Page titles", similarity: calculateSimilarity(cleanTitle1, cleanTitle2) },
    ];
    
    // Add OG title similarities if available
    if (cleanOgTitle1 && cleanOgTitle2) {
      similarities.push({ type: "OG titles", similarity: calculateSimilarity(cleanOgTitle1, cleanOgTitle2) });
    }
    if (cleanTitle1 && cleanOgTitle2) {
      similarities.push({ type: "Page to OG", similarity: calculateSimilarity(cleanTitle1, cleanOgTitle2) });
    }
    if (cleanTitle2 && cleanOgTitle1) {
      similarities.push({ type: "OG to Page", similarity: calculateSimilarity(cleanTitle2, cleanOgTitle1) });
    }
    
    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Use the highest similarity score
    const bestMatch = similarities[0];
    
    if (bestMatch.similarity >= 0.7) {
      // High similarity (70% or more matching words)
      return { 
        match: true, 
        score: 0.9, 
        message: `${bestMatch.type}: High similarity (${Math.round(bestMatch.similarity * 100)}%)` 
      };
    } else if (bestMatch.similarity >= 0.5) {
      // Moderate similarity (50-70% matching words)
      return { 
        match: 'partial', 
        score: 0.7, 
        message: `${bestMatch.type}: Moderate similarity (${Math.round(bestMatch.similarity * 100)}%)` 
      };
    } else if (cleanTitle1.includes(cleanTitle2) || cleanTitle2.includes(cleanTitle1) || 
              (cleanOgTitle1 && cleanOgTitle1.includes(cleanTitle2)) || 
              (cleanOgTitle2 && cleanOgTitle2.includes(cleanTitle1))) {
      // One title contains the other but low word similarity
      return { match: 'partial', score: 0.5, message: "One title contains the other" };
    }
    
    // Low similarity - use the more sophisticated text comparison as fallback
    const textComparison = compareTexts(cleanTitle1, cleanTitle2, cleanOgTitle1, cleanOgTitle2);
    if (textComparison.match === 'partial' && textComparison.score < 0.5) {
      // Override low partial matches to be mismatches
      return { match: false, score: textComparison.score, message: `Low similarity (${Math.round(bestMatch.similarity * 100)}%)` };
    }
    
    return textComparison;
  }
  
  // Helper function to compare image URLs
  function compareImageUrls(url1, url2) {
    // If both are missing, it's a match
    if (!url1 && !url2) return { match: true, message: "Both images missing" };
    
    // If original has image but canonical doesn't, consider it a match (per requirement #2)
    if (url1 && !url2) return { match: true, message: "Canonical image missing (ignored)" };
    
    // Only case we consider a mismatch is if canonical has image but original doesn't
    if (!url1 && url2) return { match: false, message: "Original image missing" };
    
    // Always return true for now, as we're acknowledging 
    // that images come from different domains and will have different names
    // In a real implementation, this is where you'd call an AI-based 
    // image comparison service
    
    try {
      // Check if either URL contains typical image transformation parameters
      const isThumb1 = url1.includes('thumb') || url1.includes('thumbnails') || url1.includes('/t_');
      const isThumb2 = url2.includes('thumb') || url2.includes('thumbnails') || url2.includes('/t_');
      
      // If one is a thumb and one is not, don't penalize that
      if (isThumb1 !== isThumb2) return { match: true, message: "Image variants (thumbnail vs. full)" };
      
      // Add a note to the UI
      return {
        match: true,
        message: "Image comparison limited (different domains use different image files)"
      };
    } catch (e) {
      return { match: false, message: "Image comparison error" };
    }
  }
  
  // Special display function for Yahoo Finance URLs
  function showFinanceResult(data) {
    // Simple UI to just show the canonical URL for Yahoo Finance
    
    // Reset UI first
    resetUI();
    
    // Create a simplified result card
    errorSection.classList.remove('hidden');
    const errorCard = errorSection.querySelector('.error-card');
    errorCard.style.background = 'rgba(52, 152, 219, 0.15)';
    errorCard.style.borderLeftColor = '#3498db';
    
    // Update the header
    const header = errorCard.querySelector('h2');
    header.style.color = '#3498db';
    header.textContent = 'Yahoo Finance URL Processed';
    
    // Set the message with both URLs
    errorMessage.innerHTML = `
      <p><strong>This URL is from Yahoo Finance, which requires special handling.</strong></p>
      <p style="margin-top:10px"><strong>Original URL:</strong><br>
      <a href="${data.originalUrl}" target="_blank">${data.originalUrl}</a></p>
      <p style="margin-top:10px"><strong>Canonical URL:</strong><br>
      <a href="${data.canonicalUrl}" target="_blank">${data.canonicalUrl}</a></p>
      <p style="margin-top:15px">We've found the canonical URL but can't perform a full analysis due to technical limitations with Yahoo Finance pages.</p>
    `;
    
    // Add fade in effect
    fadeIn(errorSection);
    
    // Scroll to the error section
    window.scrollTo({
      top: errorSection.offsetTop - 50,
      behavior: 'smooth'
    });
  }
  
  // Display results function
  function displayResults(data) {
    // Show results section with fade effect
    fadeIn(resultsSection);
    
    // Set score with animation
    animateScore(data.fidelityScore);
    
    // Set URLs
    originalUrl.textContent = data.originalUrl;
    originalUrl.href = data.originalUrl;
    canonicalUrl.textContent = data.canonicalUrl;
    canonicalUrl.href = data.canonicalUrl;
    
    // Populate schema stats
    populateSchemaStats(originalStats, data.originalSchema);
    populateSchemaStats(canonicalStats, data.canonicalSchema);
    
    // Populate comparison table first to get date comparison results
    populateComparisonTable(data);
    
    // Set comparison details
    setComparisonResult(titleMatch, compareTitles(data.originalSchema.title, data.canonicalSchema.title, data.originalSchema.openGraph?.title, data.canonicalSchema.openGraph?.title));
    setComparisonResult(descriptionMatch, compareTexts(data.originalSchema.description, data.canonicalSchema.description, data.originalSchema.openGraph?.description, data.canonicalSchema.openGraph?.description));
    
    // Use the date comparison results from the table for the date card
    let dateMatchStatus = data.fidelityDetails.comparisons.date;
    
    // Initialize dateComparisonResults if not already done
    if (!window.dateComparisonResults) {
      window.dateComparisonResults = {
        publishedDate: false,
        modifiedDate: false
      };
    }
    
    if (window.dateComparisonResults) {
      if (window.dateComparisonResults.publishedDate === true && 
          window.dateComparisonResults.modifiedDate === true) {
        // If both dates have exact matches in the table, override the server's date match status
        dateMatchStatus = true;
      } else if (window.dateComparisonResults.publishedDate === 'partial' || 
                window.dateComparisonResults.modifiedDate === 'partial') {
        // If either date has a partial match, show partial match in the summary
        dateMatchStatus = 'partial';
      } else if (window.dateComparisonResults.publishedDate === true || 
                window.dateComparisonResults.modifiedDate === true) {
        // If at least one date has an exact match and none are partial, consider it a match
        dateMatchStatus = true;
      }
    }
    
    // Create a detailed message for the date tooltip
    let dateTooltip = '';
    if (window.dateComparisonResults) {
      if (window.dateComparisonResults.publishedDate === true) {
        dateTooltip += 'Published Date: Match\n';
      } else if (window.dateComparisonResults.publishedDate === 'partial') {
        dateTooltip += 'Published Date: Partial Match\n';
      } else if (window.dateComparisonResults.publishedDate === false) {
        dateTooltip += 'Published Date: Mismatch\n';
      }
      
      if (window.dateComparisonResults.modifiedDate === true) {
        dateTooltip += 'Modified Date: Match';
      } else if (window.dateComparisonResults.modifiedDate === 'partial') {
        dateTooltip += 'Modified Date: Partial Match';
      } else if (window.dateComparisonResults.modifiedDate === false) {
        dateTooltip += 'Modified Date: Mismatch';
      }
    }
    
    // Set the date comparison result with tooltip
    setComparisonResult(dateMatch, dateMatchStatus);
    if (dateTooltip) {
      dateMatch.setAttribute('title', dateTooltip);
      dateMatch.style.cursor = 'help';
    }
    
    setComparisonResult(authorMatch, data.fidelityDetails.comparisons.author);
    
    // Content volume is a ratio, so we need a different approach
    const contentRatio = data.fidelityDetails.comparisons.contentVolume;
    if (contentRatio === 1) {
      setComparisonResult(contentMatch, true);
      contentMatch.textContent = 'Match';
    } else if (contentRatio >= 0.8) {
      contentMatch.classList.add('partial');
      contentMatch.textContent = 'Partial Match';
    } else {
      setComparisonResult(contentMatch, false);
      contentMatch.textContent = 'Mismatch';
    }
    
    // Scroll to results
    setTimeout(() => {
      window.scrollTo({
        top: resultsSection.offsetTop - 50,
        behavior: 'smooth'
      });
    }, 300);
  }
  
  // Animate score counter
  function animateScore(targetScore) {
    const duration = 1500;
    const step = 30;
    let currentScore = 0;
    const scoreElement = document.getElementById('fidelity-score');
    const scoreCircle = document.querySelector('.score-circle');
    const increment = targetScore / (duration / step);
    
    // Reset score text and circle percentage
    scoreElement.textContent = '0';
    scoreCircle.style.setProperty('--percentage', '0%');
    scoreCircle.setAttribute('aria-valuenow', '0');
    
    const timer = setInterval(() => {
      currentScore += increment;
      if (currentScore >= targetScore) {
        currentScore = targetScore;
        clearInterval(timer);
      }
      
      const roundedScore = Math.round(currentScore);
      scoreElement.textContent = roundedScore;
      scoreCircle.style.setProperty('--percentage', `${roundedScore}%`);
      scoreCircle.setAttribute('aria-valuenow', roundedScore.toString());
    }, step);
  }
  
  // Set comparison result helper
  function setComparisonResult(element, isMatch) {
    element.className = 'comparison-result';
    
    // Handle when isMatch is an object (from compareTitles or compareTexts)
    if (isMatch && typeof isMatch === 'object') {
      if (isMatch.match === true) {
        element.classList.add('match');
        element.textContent = 'Match';
        
        // Add tooltip with more details if available
        if (isMatch.message) {
          element.setAttribute('title', isMatch.message);
          element.style.cursor = 'help';
        }
      } else if (isMatch.match === 'partial') {
        element.classList.add('partial');
        element.textContent = 'Partial Match';
        
        // Add tooltip with more details if available
        if (isMatch.message) {
          element.setAttribute('title', isMatch.message);
          element.style.cursor = 'help';
        }
      } else {
        element.classList.add('mismatch');
        element.textContent = 'Mismatch';
        
        // Add tooltip with more details if available
        if (isMatch.message) {
          element.setAttribute('title', isMatch.message);
          element.style.cursor = 'help';
        }
      }
    }
    // Handle when isMatch is a boolean or string
    else if (isMatch === true) {
      element.classList.add('match');
      element.textContent = 'Match';
    } else if (isMatch === 'partial') {
      element.classList.add('partial');
      element.textContent = 'Partial Match';
    } else {
      element.classList.add('mismatch');
      element.textContent = 'Mismatch';
    }
  }
  
  // Populate schema stats
  function populateSchemaStats(container, schema) {
    container.innerHTML = '';
    
    // Add basic stats
    addStatItem(container, 'Title Length', schema.title ? schema.title.length : 0);
    addStatItem(container, 'Description', schema.description ? 'Present' : 'Missing');
    addStatItem(container, 'H1 Tags', schema.h1Tags);
    addStatItem(container, 'Paragraphs', schema.paragraphs);
    addStatItem(container, 'Links', schema.links);
    addStatItem(container, 'Images', schema.images);
    
    // Add date stats
    if (schema.publishedDate) {
      addStatItem(container, 'Published Date', new Date(schema.publishedDate).toLocaleString());
    }
    if (schema.modifiedDate) {
      addStatItem(container, 'Modified Date', new Date(schema.modifiedDate).toLocaleString());
    }
    
    // Add author stats if available
    if (schema.schemaProperties?.authors && schema.schemaProperties.authors.length > 0) {
      addStatItem(container, 'Authors', schema.schemaProperties.authors.join(', '));
    }
    
    // Add schema type if available
    if (schema.schemaProperties?.type) {
      const type = Array.isArray(schema.schemaProperties.type) 
        ? schema.schemaProperties.type.join(', ') 
        : schema.schemaProperties.type;
      addStatItem(container, 'Schema Type', type);
    }
  }
  
  // Add stat item helper
  function addStatItem(container, label, value) {
    const item = document.createElement('li');
    item.innerHTML = `<span>${label}:</span> <strong>${value}</strong>`;
    container.appendChild(item);
    
    // Add a small animation delay to each item
    const delay = container.children.length * 50;
    item.style.opacity = 0;
    item.style.transform = 'translateY(10px)';
    item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    
    setTimeout(() => {
      item.style.opacity = 1;
      item.style.transform = 'translateY(0)';
    }, delay);
  }
  
  // Populate detailed comparison table
  function populateComparisonTable(data) {
    const tableBody = contentComparisonTable.querySelector('tbody');
    tableBody.innerHTML = '';
    
    const originalSchema = data.originalSchema;
    const canonicalSchema = data.canonicalSchema;
    
    // Track date comparison results for summary card
    window.dateComparisonResults = {
      publishedDate: null,
      modifiedDate: null
    };
    
    // Add Title comparison
    addTitleComparisonRow();
    
    // Add H1 Heading comparison
    addTextComparisonRow('Main Heading (H1)', originalSchema.h1Content, canonicalSchema.h1Content);
    
    // Add Meta Description comparison
    addTextComparisonRow('Meta Description', originalSchema.description, canonicalSchema.description, null, originalSchema.openGraph?.description, canonicalSchema.openGraph?.description);
    
    // Modified code - only show regular published and modified dates
    addDateComparisonRow('Published Date', originalSchema.publishedDate, canonicalSchema.publishedDate);
    
    addDateComparisonRow('Modified Date', originalSchema.modifiedDate, canonicalSchema.modifiedDate);

    // Add First Paragraph comparison
    addTextComparisonRow('First Paragraph', originalSchema.firstParagraph, canonicalSchema.firstParagraph, true);
    
    // Add Article Text Sample comparison
    addTextComparisonRow('Article Text Sample', originalSchema.articleText, canonicalSchema.articleText, true);
    
    // Add Image comparison
    addImageComparisonRow();
    
    // Add Schema Property comparisons
    addSchemaPropertyComparisons();
    
    // Add Open Graph metadata comparison
    addOpenGraphComparison();
    
    // Helper function to add a text comparison row
    function addTextComparisonRow(element, originalContent, canonicalContent, isLongText = false, ogOriginalContent, ogCanonicalContent) {
      if (!originalContent && !canonicalContent) return;
      
      const row = document.createElement('tr');
      
      // Use the enhanced text comparison function
      const textComparison = compareTexts(originalContent, canonicalContent, ogOriginalContent, ogCanonicalContent);
      
      // Create cells with width constraints
      const elementCell = document.createElement('td');
      elementCell.textContent = element;
      elementCell.style.width = "20%";
      elementCell.style.maxWidth = "150px";
      
      const originalCell = document.createElement('td');
      originalCell.style.width = "35%";
      if (isLongText) {
        originalCell.className = 'truncate expand-content';
        originalCell.addEventListener('click', function() {
          row.classList.toggle('expanded');
        });
      }
      originalCell.textContent = originalContent || 'Not found';
      
      const canonicalCell = document.createElement('td');
      canonicalCell.style.width = "35%";
      if (isLongText) {
        canonicalCell.className = 'truncate expand-content';
        canonicalCell.addEventListener('click', function() {
          row.classList.toggle('expanded');
        });
      }
      canonicalCell.textContent = canonicalContent || 'Not found';
      
      const statusCell = document.createElement('td');
      statusCell.style.width = "10%";
      statusCell.className = 
        textComparison.match === true ? 'status-match' : 
        textComparison.match === 'partial' ? 'status-partial' : 
        'status-mismatch';
      statusCell.textContent = textComparison.message || 
        (textComparison.match === true ? 'Match' : 
         textComparison.match === 'partial' ? 'Partial Match' : 
         'Mismatch');
      
      // Append cells to row
      row.appendChild(elementCell);
      row.appendChild(originalCell);
      row.appendChild(canonicalCell);
      row.appendChild(statusCell);
      
      // Add fade-in effect with delay
      row.style.opacity = 0;
      row.style.transition = 'opacity 0.5s ease';
      
      const delay = tableBody.children.length * 50;
      setTimeout(() => {
        row.style.opacity = 1;
      }, delay);
      
      // Append row to table
      tableBody.appendChild(row);
    }
    
    // Title comparison function
    function addTitleComparisonRow() {
      const originalTitle = originalSchema.title;
      const canonicalTitle = canonicalSchema.title;
      
      const titleComparison = compareTitles(originalTitle, canonicalTitle, originalSchema.openGraph?.title, canonicalSchema.openGraph?.title);
      
      const row = document.createElement('tr');
      
      const elementCell = document.createElement('td');
      elementCell.textContent = 'Page Title';
      elementCell.style.width = "20%";
      elementCell.style.maxWidth = "150px";
      
      const originalCell = document.createElement('td');
      originalCell.style.width = "35%";
      originalCell.className = 'truncate expand-content';
      if (originalTitle) {
        originalCell.textContent = originalTitle;
        originalCell.addEventListener('click', function() {
          row.classList.toggle('expanded');
        });
      } else {
        originalCell.textContent = 'Not found';
      }
      
      const canonicalCell = document.createElement('td');
      canonicalCell.style.width = "35%";
      canonicalCell.className = 'truncate expand-content';
      if (canonicalTitle) {
        canonicalCell.textContent = canonicalTitle;
        canonicalCell.addEventListener('click', function() {
          row.classList.toggle('expanded');
        });
      } else {
        canonicalCell.textContent = 'Not found';
      }
      
      const statusCell = document.createElement('td');
      statusCell.style.width = "10%";
      
      statusCell.className = 
        titleComparison.match === true ? 'status-match' : 
        titleComparison.match === 'partial' ? 'status-partial' : 
        'status-mismatch';
      
      // Update status message to be more descriptive
      if (titleComparison.match === true && titleComparison.message && titleComparison.message.includes('excluding site names')) {
        statusCell.textContent = 'Match (excluding site names)';
      } else {
        statusCell.textContent = titleComparison.message || 
          (titleComparison.match === true ? 'Match' : 
           titleComparison.match === 'partial' ? 'Partial Match' : 
           'Mismatch');
      }
      
      row.appendChild(elementCell);
      row.appendChild(originalCell);
      row.appendChild(canonicalCell);
      row.appendChild(statusCell);
      
      // Add fade-in effect
      row.style.opacity = 0;
      row.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        row.style.opacity = 1;
      }, 50);
      
      tableBody.appendChild(row);
    }
    
    // Date comparison function
    function addDateComparisonRow(label, originalDate, canonicalDate) {
      if (!originalDate && !canonicalDate) return;
      
      const row = document.createElement('tr');
      
      const elementCell = document.createElement('td');
      elementCell.textContent = label;
      elementCell.style.width = "20%";
      elementCell.style.maxWidth = "150px";
      
      const originalCell = document.createElement('td');
      originalCell.style.width = "35%";
      const formattedOriginalDate = originalDate ? new Date(originalDate).toLocaleString() : 'Not found';
      originalCell.textContent = formattedOriginalDate;
      
      const canonicalCell = document.createElement('td');
      canonicalCell.style.width = "35%";
      const formattedCanonicalDate = canonicalDate ? new Date(canonicalDate).toLocaleString() : 'Not found';
      canonicalCell.textContent = formattedCanonicalDate;
      
      const statusCell = document.createElement('td');
      statusCell.style.width = "10%";
      
      let matchStatus = false;
      
      // If original has date but canonical doesn't, consider it a match (per requirement #2)
      if (originalDate && !canonicalDate) {
        statusCell.className = 'status-match';
        statusCell.textContent = 'Canonical missing (ignored)';
        matchStatus = true;
      }
      // Only case we consider a mismatch is if canonical has date but original doesn't
      else if (!originalDate && canonicalDate) {
        statusCell.className = 'status-mismatch';
        statusCell.textContent = 'Original missing';
        matchStatus = false;
      }
      else if (!originalDate || !canonicalDate) {
        statusCell.className = 'status-mismatch';
        statusCell.textContent = 'Missing Date';
        matchStatus = false;
      } else {
        try {
          const date1 = new Date(originalDate);
          const date2 = new Date(canonicalDate);
          
          if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
            statusCell.className = 'status-mismatch';
            statusCell.textContent = 'Invalid Date';
            matchStatus = false;
          } else if (date1.toISOString() === date2.toISOString()) {
            // Exact match (including time)
            statusCell.className = 'status-match';
            statusCell.textContent = 'Exact Match';
            matchStatus = true;
          } else if (date1.toDateString() === date2.toDateString()) {
            // Same day match
            const timeDiff = Math.abs(date1 - date2) / (1000 * 60); // difference in minutes
            
            if (timeDiff < 1) {
              statusCell.className = 'status-match';
              statusCell.textContent = 'Exact Match';
              matchStatus = true;
            } else if (timeDiff < 60) {
              statusCell.className = 'status-partial';
              statusCell.textContent = `Same Day (${Math.round(timeDiff)}min diff)`;
              matchStatus = 'partial';
            } else {
              statusCell.className = 'status-partial';
              statusCell.textContent = `Same Day (${Math.round(timeDiff/60)}hr diff)`;
              matchStatus = 'partial';
            }
          } else {
            // Different days
            const diffTime = Math.abs(date2 - date1);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            statusCell.className = 'status-mismatch';
            statusCell.textContent = `${diffDays} day(s) difference`;
            matchStatus = false;
          }
          
          // Store the match status for the summary card
          if (label === 'Published Date') {
            window.dateComparisonResults.publishedDate = matchStatus;
          } else if (label === 'Modified Date') {
            window.dateComparisonResults.modifiedDate = matchStatus;
          }
          
        } catch (e) {
          statusCell.className = 'status-mismatch';
          statusCell.textContent = 'Date Comparison Error';
          matchStatus = false;
        }
      }
      
      row.appendChild(elementCell);
      row.appendChild(originalCell);
      row.appendChild(canonicalCell);
      row.appendChild(statusCell);
      
      // Add fade-in effect with delay
      row.style.opacity = 0;
      row.style.transition = 'opacity 0.5s ease';
      
      const delay = tableBody.children.length * 50;
      setTimeout(() => {
        row.style.opacity = 1;
      }, delay);
      
      tableBody.appendChild(row);
    }
    
    // Image comparison function
    function addImageComparisonRow() {
      const originalImage = originalSchema.mainImageUrl;
      const canonicalImage = canonicalSchema.mainImageUrl;
      
      if (!originalImage && !canonicalImage) return;
      
      const row = document.createElement('tr');
      
      const elementCell = document.createElement('td');
      elementCell.textContent = 'Main Image';
      elementCell.style.width = "20%";
      elementCell.style.maxWidth = "150px";
      
      const originalCell = document.createElement('td');
      originalCell.style.width = "35%";
      originalCell.className = 'truncate expand-content';
      if (originalImage) {
        try {
          const imgContainer = document.createElement('div');
          imgContainer.style.marginBottom = '10px';
          
          // Create a clickable image with larger dimensions
          const imgLink = document.createElement('a');
          imgLink.href = originalImage;
          imgLink.target = "_blank";
          imgLink.rel = "noopener noreferrer";
          imgLink.title = "Click to open image in new tab";
          
          const img = document.createElement('img');
          img.src = originalImage;
          img.alt = "Preview";
          img.style.maxWidth = "200px"; 
          img.style.maxHeight = "120px"; 
          img.style.cursor = "pointer";
          img.style.borderRadius = "4px";
          img.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.2)";
          
          imgLink.appendChild(img);
          imgContainer.appendChild(imgLink);
          originalCell.appendChild(imgContainer);
          originalCell.appendChild(document.createTextNode(originalImage));
        } catch (e) {
          originalCell.textContent = originalImage;
        }
      } else {
        originalCell.textContent = 'Not found';
      }
      
      const canonicalCell = document.createElement('td');
      canonicalCell.style.width = "35%";
      canonicalCell.className = 'truncate expand-content';
      if (canonicalImage) {
        try {
          const imgContainer = document.createElement('div');
          imgContainer.style.marginBottom = '10px';
          
          // Create a clickable image with larger dimensions
          const imgLink = document.createElement('a');
          imgLink.href = canonicalImage;
          imgLink.target = "_blank";
          imgLink.rel = "noopener noreferrer";
          imgLink.title = "Click to open image in new tab";
          
          const img = document.createElement('img');
          img.src = canonicalImage;
          img.alt = "Preview";
          img.style.maxWidth = "200px"; 
          img.style.maxHeight = "120px"; 
          img.style.cursor = "pointer";
          img.style.borderRadius = "4px";
          img.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.2)";
          
          imgLink.appendChild(img);
          imgContainer.appendChild(imgLink);
          canonicalCell.appendChild(imgContainer);
          canonicalCell.appendChild(document.createTextNode(canonicalImage));
        } catch (e) {
          canonicalCell.textContent = canonicalImage;
        }
      } else {
        canonicalCell.textContent = 'Not found';
      }
      
      const imageComparison = compareImageUrls(originalImage, canonicalImage);
      
      const statusCell = document.createElement('td');
      statusCell.style.width = "10%";
      statusCell.className = imageComparison.match ? 'status-match' : 'status-mismatch';
      statusCell.textContent = imageComparison.message || (imageComparison.match ? 'Similar Images' : 'Different Images');
      
      row.appendChild(elementCell);
      row.appendChild(originalCell);
      row.appendChild(canonicalCell);
      row.appendChild(statusCell);
      
      // Add fade-in effect with delay
      row.style.opacity = 0;
      row.style.transition = 'opacity 0.5s ease';
      
      const delay = tableBody.children.length * 50;
      setTimeout(() => {
        row.style.opacity = 1;
      }, delay);
      
      tableBody.appendChild(row);
    }
    
    // Schema property comparisons
    function addSchemaPropertyComparisons() {
      // Skip if schema properties are missing
      if (!originalSchema.schemaProperties || !canonicalSchema.schemaProperties) return;
      
      // Add a header row
      const headerRow = document.createElement('tr');
      const headerCell = document.createElement('td');
      headerCell.colSpan = 4;
      headerCell.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
      headerCell.style.color = 'rgba(255, 255, 255, 0.9)';
      headerCell.style.fontWeight = 'bold';
      headerCell.style.textAlign = 'center';
      headerCell.textContent = 'Structured Data Comparison (Schema.org)';
      headerRow.appendChild(headerCell);
      
      // Add simple animation
      headerRow.style.opacity = 0;
      headerRow.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        headerRow.style.opacity = 1;
      }, 100);
      
      tableBody.appendChild(headerRow);
      
      // Define properties to compare
      const props = [
        { name: 'Schema Type', key: 'type' },
        { name: 'Schema Headline', key: 'headline' },
        { name: 'Schema Published Date', key: 'datePublished', isDate: true },
        { name: 'Schema Modified Date', key: 'dateModified', isDate: true },
        { name: 'Schema Description', key: 'description' },
        { name: 'Schema Authors', key: 'authors', isArray: true }
      ];
      
      // Process each property
      props.forEach((prop, index) => {
        let originalValue = originalSchema.schemaProperties[prop.key];
        let canonicalValue = canonicalSchema.schemaProperties[prop.key];
        
        // Skip if both are empty
        if (!originalValue && !canonicalValue) return;
        
        // Format array values
        if (prop.isArray && Array.isArray(originalValue)) {
          originalValue = originalValue.join(', ');
        }
        
        if (prop.isArray && Array.isArray(canonicalValue)) {
          canonicalValue = canonicalValue.join(', ');
        }
        
        // Handle different property types
        if (prop.isDate) {
          // Date comparison
          addDateComparisonRow(prop.name, originalValue, canonicalValue);
        } else {
          // Regular text comparison
          addTextComparisonRow(prop.name, originalValue, canonicalValue);
        }
      });
    }
    
    // Add Open Graph metadata comparison
    function addOpenGraphComparison() {
      // Skip if both don't have any OG data
      if ((!originalSchema.openGraph || Object.keys(originalSchema.openGraph).length === 0) && 
          (!canonicalSchema.openGraph || Object.keys(canonicalSchema.openGraph).length === 0)) {
        return;
      }
      
      // Add a header row for Open Graph data
      const headerRow = document.createElement('tr');
      const headerCell = document.createElement('td');
      headerCell.colSpan = 4;
      headerCell.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
      headerCell.style.color = 'rgba(255, 255, 255, 0.9)';
      headerCell.style.fontWeight = 'bold';
      headerCell.style.textAlign = 'center';
      headerCell.textContent = 'Open Graph Metadata Comparison';
      headerRow.appendChild(headerCell);
      
      // Add simple animation
      headerRow.style.opacity = 0;
      headerRow.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        headerRow.style.opacity = 1;
      }, 100);
      
      tableBody.appendChild(headerRow);
      
      // Define Open Graph properties to compare
      const ogProps = [
        { name: 'OG Title', key: 'title' },
        { name: 'OG Description', key: 'description' },
        { name: 'OG Image', key: 'image', isImage: true },
        { name: 'OG Type', key: 'type' }
      ];
      
      // Process each Open Graph property
      ogProps.forEach((prop) => {
        const originalValue = originalSchema.openGraph ? originalSchema.openGraph[prop.key] : '';
        const canonicalValue = canonicalSchema.openGraph ? canonicalSchema.openGraph[prop.key] : '';
        
        // Skip if both are empty
        if (!originalValue && !canonicalValue) return;
        
        if (prop.isImage) {
          // Handle image properties
          addOpenGraphImageRow(prop.name, originalValue, canonicalValue);
        } else {
          // Handle text properties
          const originalCell = document.createElement('td');
          originalCell.style.width = "35%";
          originalCell.textContent = originalValue || 'Not found';
          
          const canonicalCell = document.createElement('td');
          canonicalCell.style.width = "35%";
          canonicalCell.textContent = canonicalValue || 'Not found';
          
          const statusCell = document.createElement('td');
          statusCell.style.width = "10%";
          
          // If original has property but canonical doesn't, consider it a match (per requirement #2)
          if (originalValue && !canonicalValue) {
            statusCell.className = 'status-match';
            statusCell.textContent = 'Canonical missing (ignored)';
          }
          // Only case we consider a mismatch is if canonical has property but original doesn't
          else if (!originalValue && canonicalValue) {
            statusCell.className = 'status-mismatch';
            statusCell.textContent = 'Original missing';
          }
          // If both have values, compare them
          else if (originalValue && canonicalValue) {
            if (prop.key === 'title' || prop.key === 'description') {
              // Use the enhanced text comparison for title and description
              const textComparison = prop.key === 'title' 
                ? compareTitles(originalValue, canonicalValue) 
                : compareTexts(originalValue, canonicalValue);
              
              statusCell.textContent = textComparison.message;
              statusCell.className = textComparison.match === true ? 'status-match' : 
                                     textComparison.match === 'partial' ? 'status-partial' : 
                                     'status-mismatch';
            } else {
              // Simple comparison for other properties
              const isMatch = originalValue === canonicalValue;
              statusCell.textContent = isMatch ? 'Match' : 'Mismatch';
              statusCell.className = isMatch ? 'status-match' : 'status-mismatch';
            }
          }
          
          const elementCell = document.createElement('td');
          elementCell.textContent = prop.name;
          elementCell.style.width = "20%";
          elementCell.style.maxWidth = "150px";
          
          const row = document.createElement('tr');
          row.appendChild(elementCell);
          row.appendChild(originalCell);
          row.appendChild(canonicalCell);
          row.appendChild(statusCell);
          
          // Add fade-in effect with delay
          row.style.opacity = 0;
          row.style.transition = 'opacity 0.5s ease';
          
          const delay = tableBody.children.length * 50;
          setTimeout(() => {
            row.style.opacity = 1;
          }, delay);
          
          tableBody.appendChild(row);
        }
      });
    }
    
    // Add Open Graph image comparison
    function addOpenGraphImageRow(label, originalImage, canonicalImage) {
      if (!originalImage && !canonicalImage) return;
      
      const row = document.createElement('tr');
      
      const elementCell = document.createElement('td');
      elementCell.textContent = label;
      elementCell.style.width = "20%";
      elementCell.style.maxWidth = "150px";
      
      const originalCell = document.createElement('td');
      originalCell.style.width = "35%";
      originalCell.className = 'truncate expand-content';
      if (originalImage) {
        try {
          const imgContainer = document.createElement('div');
          imgContainer.style.marginBottom = '10px';
          
          // Create a clickable image with larger dimensions
          const imgLink = document.createElement('a');
          imgLink.href = originalImage;
          imgLink.target = "_blank";
          imgLink.rel = "noopener noreferrer";
          imgLink.title = "Click to open image in new tab";
          
          const img = document.createElement('img');
          img.src = originalImage;
          img.alt = "Preview";
          img.style.maxWidth = "200px"; 
          img.style.maxHeight = "120px"; 
          img.style.cursor = "pointer";
          img.style.borderRadius = "4px";
          img.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.2)";
          
          imgLink.appendChild(img);
          imgContainer.appendChild(imgLink);
          originalCell.appendChild(imgContainer);
          originalCell.appendChild(document.createTextNode(originalImage));
        } catch (e) {
          originalCell.textContent = originalImage;
        }
      } else {
        originalCell.textContent = 'Not found';
      }
      
      const canonicalCell = document.createElement('td');
      canonicalCell.style.width = "35%";
      canonicalCell.className = 'truncate expand-content';
      if (canonicalImage) {
        try {
          const imgContainer = document.createElement('div');
          imgContainer.style.marginBottom = '10px';
          
          // Create a clickable image with larger dimensions
          const imgLink = document.createElement('a');
          imgLink.href = canonicalImage;
          imgLink.target = "_blank";
          imgLink.rel = "noopener noreferrer";
          imgLink.title = "Click to open image in new tab";
          
          const img = document.createElement('img');
          img.src = canonicalImage;
          img.alt = "Preview";
          img.style.maxWidth = "200px"; 
          img.style.maxHeight = "120px"; 
          img.style.cursor = "pointer";
          img.style.borderRadius = "4px";
          img.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.2)";
          
          imgLink.appendChild(img);
          imgContainer.appendChild(imgLink);
          canonicalCell.appendChild(imgContainer);
          canonicalCell.appendChild(document.createTextNode(canonicalImage));
        } catch (e) {
          canonicalCell.textContent = canonicalImage;
        }
      } else {
        canonicalCell.textContent = 'Not found';
      }
      
      const imageComparison = compareImageUrls(originalImage, canonicalImage);
      
      const statusCell = document.createElement('td');
      statusCell.style.width = "10%";
      statusCell.className = imageComparison.match ? 'status-match' : 'status-mismatch';
      statusCell.textContent = imageComparison.message || (imageComparison.match ? 'Similar Images' : 'Different Images');
      
      row.appendChild(elementCell);
      row.appendChild(originalCell);
      row.appendChild(canonicalCell);
      row.appendChild(statusCell);
      
      // Add fade-in effect with delay
      row.style.opacity = 0;
      row.style.transition = 'opacity 0.5s ease';
      
      const delay = tableBody.children.length * 50;
      setTimeout(() => {
        row.style.opacity = 1;
      }, delay);
      
      tableBody.appendChild(row);
    }
  }
});