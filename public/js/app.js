document.addEventListener('DOMContentLoaded', () => {
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
  
  // Form submission
  urlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset UI
    resetUI();
    
    // Focus effect when submitting
    urlInput.blur();
    
    // Validate input first
    const url = urlInput.value.trim();
    if (!isValidURL(url)) {
      showError('Please enter a valid URL including http:// or https://');
      return;
    }
    
    // Show loading with fade effect
    fadeIn(loadingSection);
    
    try {
      // Call the API
      const response = await fetch('/api/check-fidelity', {
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
    try {
      new URL(url);
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
    
    // Check if cleaned titles match
    if (cleanTitle1 === cleanTitle2) return { match: true, score: 1, message: "Matches (excluding site names)" };
    
    // Check if one is contained in the other
    if (cleanTitle1.includes(cleanTitle2) || cleanTitle2.includes(cleanTitle1)) {
      return { match: 'partial', score: 0.8, message: "One title contains the other" };
    }
    
    // Use the more sophisticated text comparison
    return compareTexts(cleanTitle1, cleanTitle2);
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
    
    // Set comparison details
    setComparisonResult(titleMatch, data.fidelityDetails.comparisons.title);
    setComparisonResult(descriptionMatch, data.fidelityDetails.comparisons.description);
    setComparisonResult(headingsMatch, data.fidelityDetails.comparisons.headings);
    
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
    
    // Populate schema stats
    populateSchemaStats(originalStats, data.originalSchema);
    populateSchemaStats(canonicalStats, data.canonicalSchema);
    
    // Populate comparison table
    populateComparisonTable(data);
    
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
    const increment = targetScore / (duration / step);
    
    // Reset score text and circle percentage
    scoreElement.textContent = '0';
    document.querySelector('.score-circle').style.setProperty('--percentage', '0%');
    
    const timer = setInterval(() => {
      currentScore += increment;
      if (currentScore >= targetScore) {
        currentScore = targetScore;
        clearInterval(timer);
      }
      
      scoreElement.textContent = Math.round(currentScore);
      document.querySelector('.score-circle').style.setProperty('--percentage', `${Math.round(currentScore)}%`);
    }, step);
  }
  
  // Set comparison result helper
  function setComparisonResult(element, isMatch) {
    element.className = 'comparison-result';
    
    if (isMatch) {
      element.classList.add('match');
      element.textContent = 'Match';
    } else {
      element.classList.add('mismatch');
      element.textContent = 'Mismatch';
    }
  }
  
  // Populate schema stats
  function populateSchemaStats(container, schema) {
    // Create stat items
    addStatItem(container, 'Title Length', schema.title ? schema.title.length : 0);
    addStatItem(container, 'Description', schema.description ? 'Present' : 'Missing');
    addStatItem(container, 'H1 Tags', schema.h1Tags);
    addStatItem(container, 'H2 Tags', schema.h2Tags);
    addStatItem(container, 'Paragraphs', schema.paragraphs);
    addStatItem(container, 'Links', schema.links);
    addStatItem(container, 'Images', schema.images);
    addStatItem(container, 'Meta Tags', schema.metaTags);
    addStatItem(container, 'Structured Data', schema.jsonLdData.length ? 'Present' : 'Missing');
    
    // Add date info
    if (schema.publishedDate) {
      const date = new Date(schema.publishedDate);
      if (!isNaN(date)) {
        addStatItem(container, 'Published Date', date.toLocaleString());
      }
    }
    
    if (schema.modifiedDate) {
      const date = new Date(schema.modifiedDate);
      if (!isNaN(date)) {
        addStatItem(container, 'Modified Date', date.toLocaleString());
      }
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
    
    // Add Title comparison
    addTitleComparisonRow();
    
    // Add Meta Description comparison
    addTextComparisonRow('Meta Description', originalSchema.description, canonicalSchema.description);
    
    // Modified code - only show regular published and modified dates
    addDateComparisonRow('Published Date', originalSchema.publishedDate, canonicalSchema.publishedDate);
    
    addDateComparisonRow('Modified Date', originalSchema.modifiedDate, canonicalSchema.modifiedDate);

    // Add Main Heading comparison
    addTextComparisonRow('Main Heading (H1)', originalSchema.h1Content, canonicalSchema.h1Content);
    
    // Add Subheadings comparisons
    for (let i = 0; i < Math.max(originalSchema.h2Contents?.length || 0, canonicalSchema.h2Contents?.length || 0); i++) {
      const originalH2 = originalSchema.h2Contents?.[i] || '';
      const canonicalH2 = canonicalSchema.h2Contents?.[i] || '';
      addTextComparisonRow(`Subheading ${i+1} (H2)`, originalH2, canonicalH2);
    }
    
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
      statusCell.textContent = titleComparison.message || 
        (titleComparison.match === true ? 'Match' : 
         titleComparison.match === 'partial' ? 'Partial Match' : 
         'Mismatch');
      
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
      
      if (!originalDate || !canonicalDate) {
        statusCell.className = 'status-mismatch';
        statusCell.textContent = 'Missing Date';
      } else {
        try {
          const date1 = new Date(originalDate);
          const date2 = new Date(canonicalDate);
          
          if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
            statusCell.className = 'status-mismatch';
            statusCell.textContent = 'Invalid Date';
          } else if (date1.toISOString() === date2.toISOString()) {
            // Exact match (including time)
            statusCell.className = 'status-match';
            statusCell.textContent = 'Exact Match';
          } else if (date1.toDateString() === date2.toDateString()) {
            // Same day match
            const timeDiff = Math.abs(date1 - date2) / (1000 * 60); // difference in minutes
            
            if (timeDiff < 1) {
              statusCell.className = 'status-match';
              statusCell.textContent = 'Exact Match';
            } else if (timeDiff < 60) {
              statusCell.className = 'status-partial';
              statusCell.textContent = `Same Day (${Math.round(timeDiff)}min diff)`;
            } else {
              statusCell.className = 'status-partial';
              statusCell.textContent = `Same Day (${Math.round(timeDiff/60)}hr diff)`;
            }
          } else {
            // Different days
            const diffTime = Math.abs(date2 - date1);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            statusCell.className = 'status-mismatch';
            statusCell.textContent = `${diffDays} day(s) difference`;
          }
        } catch (e) {
          statusCell.className = 'status-mismatch';
          statusCell.textContent = 'Date Comparison Error';
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
          // Image comparison (simple text for now)
          addTextComparisonRow(prop.name, originalValue || 'No image', canonicalValue || 'No image');
        } else {
          // Regular text comparison
          addTextComparisonRow(prop.name, originalValue, canonicalValue);
        }
      });
    }
  }
});