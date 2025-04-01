// Set initial theme based on user preference or system settings
function setInitialTheme() {
  const savedTheme = localStorage.getItem('theme');
  const manuallySet = localStorage.getItem('theme_manually_set');
  
  if (savedTheme && manuallySet) {
    // Use saved preference if manually set by user
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
    // Check for system preference, default to dark if not available
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const systemTheme = prefersDarkScheme.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', systemTheme);
    
    // Save the system preference but don't mark as manually set
    localStorage.setItem('theme', systemTheme);
    // Clear the manually set flag if it exists
    if (manuallySet) {
      localStorage.removeItem('theme_manually_set');
    }
  }
}

// Call this before DOM content loaded to prevent flash of wrong theme
setInitialTheme();

document.addEventListener('DOMContentLoaded', () => {
  // Theme toggle functionality
  const themeToggle = document.querySelector('.theme-toggle');
  
  // Apply theme transition class to smooth color changes
  document.body.classList.add('theme-transition');
  document.querySelector('html').classList.add('theme-transition');
  
  // Update theme toggle button label based on current theme
  function updateThemeToggleLabel() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    themeToggle.setAttribute('aria-label', `Switch to ${newTheme} mode`);
  }
  
  // Call initially to set correct label
  updateThemeToggleLabel();
  
  // Theme toggle event listener
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Update the theme attribute
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Save preference to localStorage with a special flag to indicate manual selection
    localStorage.setItem('theme', newTheme);
    localStorage.setItem('theme_manually_set', 'true');
    
    // Update the aria-label for the toggle button
    updateThemeToggleLabel();
  });
  
  // Listen for system preference changes if the user hasn't manually set a preference
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  prefersDarkScheme.addEventListener('change', (e) => {
    // Only change the theme if the user hasn't manually set a preference
    if (!localStorage.getItem('theme_manually_set')) {
      const systemTheme = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', systemTheme);
      localStorage.setItem('theme', systemTheme);
      
      // Update toggle button label
      updateThemeToggleLabel();
    }
  });
  
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
  function compareTexts(text1, text2) {
    if (!text1 || !text2) return { match: false, score: 0, message: "Missing Content" };
    
    // Check for exact match
    if (text1 === text2) return { match: true, score: 1, message: "Exact Match" };
    
    // Normalize both texts (lowercase, remove extra whitespace)
    const normalize = (text) => {
      // Ensure text is a string
      text = String(text || '');
      return text.toLowerCase().replace(/\s+/g, ' ').trim();
    };
    
    const normalizedText1 = normalize(text1);
    const normalizedText2 = normalize(text2);
    
    // Check normalized match
    if (normalizedText1 === normalizedText2) 
      return { match: true, score: 1, message: "Normalized Match" };
    
    // Calculate word overlap
    const words1 = normalizedText1.split(' ');
    const words2 = normalizedText2.split(' ');
    
    const uniqueWords1 = new Set(words1);
    const uniqueWords2 = new Set(words2);
    
    let sharedWords = 0;
    uniqueWords1.forEach(word => {
      if (uniqueWords2.has(word)) sharedWords++;
    });
    
    const totalUniqueWords = new Set([...uniqueWords1, ...uniqueWords2]).size;
    const overlapScore = sharedWords / totalUniqueWords;
    
    // Calculate Jaccard similarity (intersection / union)
    const jaccardSimilarity = sharedWords / (uniqueWords1.size + uniqueWords2.size - sharedWords);
    
    // Check if one contains the other
    const containment = normalizedText1.includes(normalizedText2) || normalizedText2.includes(normalizedText1);
    
    if (jaccardSimilarity > 0.8 || containment) {
      return { 
        match: true, 
        score: jaccardSimilarity, 
        message: `Similar Content (${Math.round(jaccardSimilarity * 100)}%)` 
      };
    } else if (jaccardSimilarity > 0.5) {
      return { 
        match: 'partial', 
        score: jaccardSimilarity, 
        message: `Partial Match (${Math.round(jaccardSimilarity * 100)}%)` 
      };
    }
    
    return { 
      match: false, 
      score: jaccardSimilarity,
      message: `Low Similarity (${Math.round(jaccardSimilarity * 100)}%)` 
    };
  }
  
  // Helper function to compare titles with site name awareness
  function compareTitles(title1, title2) {
    if (!title1 || !title2) return { match: false, score: 0, message: "Missing Title" };
    
    // Check for exact match
    if (title1 === title2) return { match: true, score: 1, message: "Exact Match" };
    
    // Clean titles - remove common separators and site names
    const cleanTitle = (title) => {
      // Common patterns: " - Site Name", " | Site Name", ": Site Name"
      return title.replace(/(\s[-|:]\s.*$)|(\s[-|:]\s.*$)/g, '').trim();
    };
    
    const cleanTitle1 = cleanTitle(title1);
    const cleanTitle2 = cleanTitle(title2);
    
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
    
    // Check if cleaned titles match - now considered a full match per requirements
    if (cleanTitle1 === cleanTitle2) {
      return { match: true, score: 1, message: "Matches (excluding site names)" };
    }
    
    // Calculate similarity between cleaned titles
    const similarity = calculateSimilarity(cleanTitle1, cleanTitle2);
    
    if (similarity >= 0.7) {
      // High similarity (70% or more matching words)
      return { match: true, score: 0.9, message: `High similarity (${Math.round(similarity * 100)}%)` };
    } else if (similarity >= 0.5) {
      // Moderate similarity (50-70% matching words)
      return { match: 'partial', score: 0.7, message: `Moderate similarity (${Math.round(similarity * 100)}%)` };
    } else if (cleanTitle1.includes(cleanTitle2) || cleanTitle2.includes(cleanTitle1)) {
      // One title contains the other but low word similarity
      return { match: 'partial', score: 0.5, message: "One title contains the other" };
    }
    
    // Low similarity - use the more sophisticated text comparison as fallback
    const textComparison = compareTexts(cleanTitle1, cleanTitle2);
    if (textComparison.match === 'partial' && textComparison.score < 0.5) {
      // Override low partial matches to be mismatches
      return { match: false, score: textComparison.score, message: `Low similarity (${Math.round(similarity * 100)}%)` };
    }
    
    return textComparison;
  }
  
  // Helper function to compare image URLs
  function compareImageUrls(url1, url2) {
    if (!url1 || !url2) return { match: false, message: "Missing Image" };
    
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
    // Simple UI to just show the canonical URL for Yahoo Finance articles
    
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
    setComparisonResult(titleMatch, data.fidelityDetails.comparisons.title);
    setComparisonResult(descriptionMatch, data.fidelityDetails.comparisons.description);
    
    // Use the date comparison results from the table for the date card
    let dateMatchStatus = data.fidelityDetails.comparisons.date;
    if (window.dateComparisonResults && 
        window.dateComparisonResults.publishedDate === true && 
        window.dateComparisonResults.modifiedDate === true) {
      // If both dates have exact matches in the table, override the server's date match status
      dateMatchStatus = true;
    } else if (window.dateComparisonResults && 
              (window.dateComparisonResults.publishedDate === true || 
               window.dateComparisonResults.modifiedDate === true)) {
      // If at least one date has an exact match, consider it a match
      dateMatchStatus = true;
    }
    
    setComparisonResult(dateMatch, dateMatchStatus);
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
    
    if (isMatch === true) {
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
    addTextComparisonRow('Meta Description', originalSchema.description, canonicalSchema.description);
    
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
    
    // Helper function to add a text comparison row
    function addTextComparisonRow(element, originalContent, canonicalContent, isLongText = false) {
      if (!originalContent && !canonicalContent) return;
      
      const row = document.createElement('tr');
      
      // Use the enhanced text comparison function
      const textComparison = compareTexts(originalContent, canonicalContent);
      
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
      
      const titleComparison = compareTitles(originalTitle, canonicalTitle);
      
      const row = document.createElement('tr');
      
      const elementCell = document.createElement('td');
      elementCell.textContent = 'Page Title';
      elementCell.style.width = "20%";
      elementCell.style.maxWidth = "150px";
      
      const originalCell = document.createElement('td');
      originalCell.style.width = "35%";
      originalCell.className = 'truncate expand-content';
      originalCell.textContent = originalTitle || 'Not found';
      originalCell.addEventListener('click', function() {
        row.classList.toggle('expanded');
      });
      
      const canonicalCell = document.createElement('td');
      canonicalCell.style.width = "35%";
      canonicalCell.className = 'truncate expand-content';
      canonicalCell.textContent = canonicalTitle || 'Not found';
      canonicalCell.addEventListener('click', function() {
        row.classList.toggle('expanded');
      });
      
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
      
      if (!originalDate || !canonicalDate) {
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
          const imgPreview = document.createElement('div');
          imgPreview.style.marginBottom = '5px';
          imgPreview.innerHTML = `<img src="${originalImage}" alt="Preview" style="max-width: 100px; max-height: 60px;">`;
          originalCell.appendChild(imgPreview);
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
          const imgPreview = document.createElement('div');
          imgPreview.style.marginBottom = '5px';
          imgPreview.innerHTML = `<img src="${canonicalImage}" alt="Preview" style="max-width: 100px; max-height: 60px;">`;
          canonicalCell.appendChild(imgPreview);
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
        { name: 'Schema Main Entity', key: 'mainEntityOfPage' },
        { name: 'Schema Headline', key: 'headline' },
        { name: 'Schema Published Date', key: 'datePublished', isDate: true },
        { name: 'Schema Modified Date', key: 'dateModified', isDate: true },
        { name: 'Schema Description', key: 'description' },
        { name: 'Schema Authors', key: 'authors', isArray: true },
        { name: 'Schema Image', key: 'image', isImage: true }
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
        } else if (prop.isImage) {
          // Image comparison with preview
          addImageSchemaComparisonRow(prop.name, originalValue, canonicalValue);
        } else {
          // Regular text comparison
          addTextComparisonRow(prop.name, originalValue, canonicalValue);
        }
      });
    }
    
    // Add image schema comparison row with preview
    function addImageSchemaComparisonRow(label, originalImage, canonicalImage) {
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
          const imgPreview = document.createElement('div');
          imgPreview.style.marginBottom = '5px';
          imgPreview.innerHTML = `<img src="${originalImage}" alt="Preview" style="max-width: 100px; max-height: 60px;">`;
          originalCell.appendChild(imgPreview);
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
          const imgPreview = document.createElement('div');
          imgPreview.style.marginBottom = '5px';
          imgPreview.innerHTML = `<img src="${canonicalImage}" alt="Preview" style="max-width: 100px; max-height: 60px;">`;
          canonicalCell.appendChild(imgPreview);
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