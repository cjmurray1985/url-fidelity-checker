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
  // Fidelity dimensions
  const structureMatch = document.getElementById('structure-match');
  const mediaMatch = document.getElementById('media-match');
  const embedMatch = document.getElementById('embed-match');
  const styleMatch = document.getElementById('style-match');
  const contentMatch = document.getElementById('content-match');
  const metadataMatch = document.getElementById('metadata-match');
  // Other elements
  const originalStats = document.getElementById('original-stats');
  const canonicalStats = document.getElementById('canonical-stats');
  const contentComparisonTable = document.getElementById('content-comparison-table');
  const recommendationsList = document.getElementById('recommendations-list');
  const systemInsightsSection = document.getElementById('system-insights');
  
  // Add focus styles to input
  urlInput.addEventListener('focus', () => {
    urlInput.parentElement.classList.add('focused');
  });
  
  urlInput.addEventListener('blur', () => {
    urlInput.parentElement.classList.remove('focused');
  });
  
  // Animate score when displayed
  function animateScore(targetScore) {
    const duration = 1500;
    const frameDuration = 1000 / 60;
    const totalFrames = Math.round(duration / frameDuration);
    let frame = 0;
    const counter = document.getElementById('fidelity-score');
    const scoreCircle = document.querySelector('.score-circle');
    
    // Starting from 0
    let count = 0;
    
    const animate = () => {
      frame++;
      // Calculate progress based on easing function
      const progress = easeOutQuad(frame / totalFrames);
      count = Math.floor(targetScore * progress);
      
      // Update the count
      counter.textContent = count;
      
      // Update the circle percentage
      const percentage = Math.floor(count);
      scoreCircle.style.setProperty('--percentage', `${percentage}%`);
      
      // Set color based on the score
      if (percentage >= 80) {
        scoreCircle.style.setProperty('--color', 'var(--secondary-color)');
      } else if (percentage >= 50) {
        scoreCircle.style.setProperty('--color', 'var(--warning-color)');
      } else {
        scoreCircle.style.setProperty('--color', 'var(--danger-color)');
      }
      
      // Continue the animation until we reach the target
      if (frame < totalFrames) {
        requestAnimationFrame(animate);
      }
    };
    
    // Simple ease out function for smooth animation
    function easeOutQuad(x) {
      return 1 - (1 - x) * (1 - x);
    }
    
    requestAnimationFrame(animate);
  }
  
  // Form submission
  urlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset UI
    resetUI();
    
    // Get the URL
    const url = urlInput.value.trim();
    
    // Disable form while loading
    checkButton.disabled = true;
    urlInput.disabled = true;
    checkButton.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i>Analyzing...';
    
    try {
      // Validate URL
      if (!isValidURL(url)) {
        throw new Error('Please enter a valid URL starting with http:// or https://');
      }
      
      // Show loading with slight delay for UX
      setTimeout(() => {
        loadingSection.classList.remove('hidden');
      }, 300);
      
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
      loadingSection.classList.add('hidden');
      
      // Re-enable form
      checkButton.disabled = false;
      urlInput.disabled = false;
      checkButton.innerHTML = '<i class="fas fa-search" style="margin-right: 8px;"></i>Analyze Fidelity';
      
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
      
      // Display results with a slight delay for better UX
      setTimeout(() => {
        displayResults(data);
        
        // Scroll to results smoothly
        setTimeout(() => {
          resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }, 300);
      
    } catch (error) {
      // Hide loading
      loadingSection.classList.add('hidden');
      
      // Re-enable form
      checkButton.disabled = false;
      urlInput.disabled = false;
      checkButton.innerHTML = '<i class="fas fa-search" style="margin-right: 8px;"></i>Analyze Fidelity';
      
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
    recommendationsList.innerHTML = '';
    systemInsightsSection.innerHTML = '';
    
    // Reset fidelity dimensions
    structureMatch.className = 'comparison-result';
    mediaMatch.className = 'comparison-result';
    embedMatch.className = 'comparison-result'; 
    styleMatch.className = 'comparison-result';
    contentMatch.className = 'comparison-result';
    metadataMatch.className = 'comparison-result';
    
    if (contentComparisonTable) {
      contentComparisonTable.querySelector('tbody').innerHTML = '';
    }
  }
  
  // Show error function
  function showError(message, isError = true) {
    errorSection.classList.remove('hidden');
    errorMessage.textContent = message;
    
    if (!isError) {
      errorSection.querySelector('.error-card').style.backgroundColor = '#f0f9ff';
      errorSection.querySelector('.error-card').style.borderLeftColor = '#5f01d1';
      errorSection.querySelector('h2').style.color = '#5f01d1';
      errorSection.querySelector('h2 i').classList.remove('fa-exclamation-triangle');
      errorSection.querySelector('h2 i').classList.add('fa-info-circle');
    }
    
    // Scroll to error
    setTimeout(() => {
      errorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  }
  
  // Helper function to compare texts with word overlap
  function compareTexts(text1, text2) {
    if (!text1 || !text2) return { match: false, score: 0, message: "Missing Content" };
    
    // Check for exact match
    if (text1 === text2) return { match: true, score: 1, message: "Exact Match" };
    
    // Normalize both texts (lowercase, remove extra whitespace)
    const normalize = (text) => {
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
  
  // Calculate fidelity dimensions
  function calculateFidelityDimensions(originalSchema, canonicalSchema) {
    const dimensions = {
      // 1. Structural Integrity: headings, paragraphs, content hierarchy
      structuralIntegrity: {
        score: calculateStructuralIntegrityScore(originalSchema, canonicalSchema),
        issues: []
      },
      
      // 2. Rich Media Preservation: images, videos, interactive elements
      richMediaPreservation: {
        score: calculateMediaScore(originalSchema, canonicalSchema),
        issues: []
      },
      
      // 3. Embed Support: social embeds, interactive charts, third-party widgets
      embedSupport: {
        score: calculateEmbedScore(originalSchema, canonicalSchema),
        issues: []
      },
      
      // 4. Styling Consistency: publisher styling intent
      stylingConsistency: {
        score: calculateStylingScore(originalSchema, canonicalSchema),
        issues: []
      },
      
      // 5. Content Completeness: all publisher content without truncation
      contentCompleteness: {
        score: calculateCompletenessScore(originalSchema, canonicalSchema),
        issues: []
      },
      
      // 6. Metadata Fidelity: author info, dates, categories, SEO metadata, structured data
      metadataFidelity: {
        score: calculateMetadataScore(originalSchema, canonicalSchema),
        issues: []
      }
    };
    
    // Overall score (weighted average)
    const weights = {
      structuralIntegrity: 0.2,
      richMediaPreservation: 0.2,
      embedSupport: 0.1,
      stylingConsistency: 0.1,
      contentCompleteness: 0.2,
      metadataFidelity: 0.2
    };
    
    let totalScore = 0;
    for (const dimension in dimensions) {
      totalScore += dimensions[dimension].score * weights[dimension];
    }
    
    // Round to nearest integer
    totalScore = Math.round(totalScore * 100);
    
    return {
      dimensions,
      totalScore
    };
  }
  
  // Calculate Structural Integrity score
  function calculateStructuralIntegrityScore(originalSchema, canonicalSchema) {
    let score = 1; // Start with perfect score
    const issues = [];
    
    // Compare H1 tags count
    const h1Difference = Math.abs(originalSchema.h1Tags - canonicalSchema.h1Tags);
    if (h1Difference > 0) {
      score -= 0.2 * Math.min(1, h1Difference / Math.max(1, canonicalSchema.h1Tags));
      issues.push("H1 tag count mismatch");
    }
    
    // Compare H2 tags count
    const h2Difference = Math.abs(originalSchema.h2Tags - canonicalSchema.h2Tags);
    if (h2Difference > 0) {
      score -= 0.2 * Math.min(1, h2Difference / Math.max(1, canonicalSchema.h2Tags));
      issues.push("H2 tag count mismatch");
    }
    
    // Compare paragraph count
    const paragraphDifference = Math.abs(originalSchema.paragraphs - canonicalSchema.paragraphs);
    const paragraphRatio = Math.min(originalSchema.paragraphs, canonicalSchema.paragraphs) / 
                          Math.max(originalSchema.paragraphs, canonicalSchema.paragraphs);
    
    if (paragraphRatio < 0.9) {
      score -= 0.3 * (1 - paragraphRatio);
      issues.push("Paragraph count mismatch");
    }
    
    // Compare H1 content
    if (originalSchema.h1Content && canonicalSchema.h1Content) {
      const h1Comparison = compareTexts(originalSchema.h1Content, canonicalSchema.h1Content);
      if (h1Comparison.score < 0.8) {
        score -= 0.3 * (1 - h1Comparison.score);
        issues.push("H1 content mismatch");
      }
    }
    
    return Math.max(0, score);
  }
  
  // Calculate Rich Media score
  function calculateMediaScore(originalSchema, canonicalSchema) {
    let score = 1; // Start with perfect score
    const issues = [];
    
    // Compare image count
    const imageRatio = Math.min(originalSchema.images, canonicalSchema.images) / 
                      Math.max(originalSchema.images, canonicalSchema.images);
    
    if (imageRatio < 1) {
      score -= 0.5 * (1 - imageRatio);
      issues.push("Image count mismatch");
    }
    
    // Compare main image
    if (originalSchema.mainImageUrl && canonicalSchema.mainImageUrl) {
      const imageComparison = compareImageUrls(originalSchema.mainImageUrl, canonicalSchema.mainImageUrl);
      if (!imageComparison.match) {
        score -= 0.5;
        issues.push("Main image mismatch");
      }
    } else if (canonicalSchema.mainImageUrl && !originalSchema.mainImageUrl) {
      score -= 0.5;
      issues.push("Missing main image");
    }
    
    return Math.max(0, score);
  }
  
  // Calculate Embed Support score
  function calculateEmbedScore(originalSchema, canonicalSchema) {
    // This is a simplified version since we don't have direct embed detection
    // In a real implementation, this would check for iframes, social embeds, etc.
    return 0.85; // Default to 85% since we can't fully verify
  }
  
  // Calculate Styling Consistency score
  function calculateStylingScore(originalSchema, canonicalSchema) {
    // This is a simplified version since we don't have direct styling comparison
    // In a real implementation, this would compare CSS classes, inline styles, etc.
    return 0.9; // Default to 90% since we can't fully verify
  }
  
  // Calculate Content Completeness score
  function calculateCompletenessScore(originalSchema, canonicalSchema) {
    let score = 1; // Start with perfect score
    const issues = [];
    
    // Compare paragraph count
    const paragraphRatio = Math.min(originalSchema.paragraphs, canonicalSchema.paragraphs) / 
                          Math.max(originalSchema.paragraphs, canonicalSchema.paragraphs);
    
    if (paragraphRatio < 0.9) {
      score -= 0.4 * (1 - paragraphRatio);
      issues.push("Content length mismatch");
    }
    
    // Compare first paragraph
    if (originalSchema.firstParagraph && canonicalSchema.firstParagraph) {
      const paragraphComparison = compareTexts(originalSchema.firstParagraph, canonicalSchema.firstParagraph);
      if (paragraphComparison.score < 0.8) {
        score -= 0.3 * (1 - paragraphComparison.score);
        issues.push("Introduction content mismatch");
      }
    }
    
    // Compare article text sample
    if (originalSchema.articleText && canonicalSchema.articleText) {
      const textComparison = compareTexts(originalSchema.articleText, canonicalSchema.articleText);
      if (textComparison.score < 0.8) {
        score -= 0.3 * (1 - textComparison.score);
        issues.push("Body content mismatch");
      }
    }
    
    return Math.max(0, score);
  }
  
  // Calculate Metadata Fidelity score
  function calculateMetadataScore(originalSchema, canonicalSchema) {
    let score = 1; // Start with perfect score
    const issues = [];
    
    // Compare title
    if (originalSchema.title && canonicalSchema.title) {
      const titleComparison = compareTitles(originalSchema.title, canonicalSchema.title);
      if (titleComparison.score < 0.8) {
        score -= 0.2 * (1 - titleComparison.score);
        issues.push("Title mismatch");
      }
    }
    
    // Compare description
    if (originalSchema.description && canonicalSchema.description) {
      const descriptionComparison = compareTexts(originalSchema.description, canonicalSchema.description);
      if (descriptionComparison.score < 0.8) {
        score -= 0.2 * (1 - descriptionComparison.score);
        issues.push("Description mismatch");
      }
    }
    
    // Compare dates
    if (canonicalSchema.publishedDate && originalSchema.publishedDate) {
      try {
        const date1 = new Date(originalSchema.publishedDate);
        const date2 = new Date(canonicalSchema.publishedDate);
        
        if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
          score -= 0.1;
          issues.push("Invalid date format");
        } else if (date1.toDateString() !== date2.toDateString()) {
          score -= 0.2;
          issues.push("Published date mismatch");
        }
      } catch (e) {
        score -= 0.1;
        issues.push("Date comparison error");
      }
    } else if (canonicalSchema.publishedDate && !originalSchema.publishedDate) {
      score -= 0.2;
      issues.push("Missing published date");
    }
    
    // Compare schema data presence
    if (canonicalSchema.jsonLdData.length > 0 && originalSchema.jsonLdData.length === 0) {
      score -= 0.3;
      issues.push("Missing structured data");
    } else if (canonicalSchema.jsonLdData.length > 0 && originalSchema.jsonLdData.length > 0) {
      // Compare schema types
      const canonicalTypes = new Set(canonicalSchema.jsonLdData.map(item => item['@type']).flat());
      const originalTypes = new Set(originalSchema.jsonLdData.map(item => item['@type']).flat());
      
      let matchedTypes = 0;
      canonicalTypes.forEach(type => {
        if (originalTypes.has(type)) matchedTypes++;
      });
      
      if (matchedTypes < canonicalTypes.size) {
        score -= 0.2 * (1 - (matchedTypes / canonicalTypes.size));
        issues.push("Incomplete structured data types");
      }
    }
    
    return Math.max(0, score);
  }
  
  // Generate publisher recommendations based on fidelity dimensions
  function generateRecommendations(dimensions) {
    const recommendations = [];
    
    // Check structural integrity
    if (dimensions.structuralIntegrity.score < 0.8) {
      recommendations.push({
        dimension: 'Structural Integrity',
        issue: 'Heading structure and content hierarchy issues detected',
        recommendation: 'Ensure all headings (H1, H2) maintain proper hierarchy in syndicated content. Preserve the same heading structure as the canonical source.',
        severity: dimensions.structuralIntegrity.score < 0.5 ? 'high' : 'medium'
      });
    }
    
    // Check media preservation
    if (dimensions.richMediaPreservation.score < 0.8) {
      recommendations.push({
        dimension: 'Rich Media Preservation',
        issue: 'Image count or quality issues detected',
        recommendation: 'Verify all images from canonical content are properly included in syndicated content. Check image dimensions and quality settings.',
        severity: dimensions.richMediaPreservation.score < 0.5 ? 'high' : 'medium'
      });
    }
    
    // Check embed support
    if (dimensions.embedSupport.score < 0.8) {
      recommendations.push({
        dimension: 'Embed Support',
        issue: 'Potential issues with embedded content',
        recommendation: 'Ensure all social media embeds, interactive charts, and third-party widgets are properly rendered in syndicated content.',
        severity: 'medium'
      });
    }
    
    // Check styling consistency
    if (dimensions.stylingConsistency.score < 0.8) {
      recommendations.push({
        dimension: 'Styling Consistency',
        issue: 'Publisher styling intent may not be fully preserved',
        recommendation: 'Review syndicated content to ensure key styling elements (bold text, italics, lists, blockquotes) are preserved where appropriate.',
        severity: 'low'
      });
    }
    
    // Check content completeness
    if (dimensions.contentCompleteness.score < 0.8) {
      recommendations.push({
        dimension: 'Content Completeness',
        issue: 'Content truncation or missing elements detected',
        recommendation: 'Verify that all paragraphs and content sections from the canonical source are included in syndicated content without truncation.',
        severity: dimensions.contentCompleteness.score < 0.5 ? 'high' : 'medium'
      });
    }
    
    // Check metadata fidelity
    if (dimensions.metadataFidelity.score < 0.8) {
      recommendations.push({
        dimension: 'Metadata Fidelity',
        issue: 'Metadata inconsistencies detected',
        recommendation: 'Ensure accurate preservation of author information, publication dates, categories, and structured data from the canonical source.',
        severity: dimensions.metadataFidelity.score < 0.5 ? 'high' : 'medium'
      });
    }
    
    return recommendations;
  }
  
  // Generate system insights
  function generateSystemInsights(data, dimensions) {
    const insights = [];
    
    // Check for common patterns across dimensions
    const lowScoreDimensions = Object.entries(dimensions)
      .filter(([_, dim]) => dim.score < 0.7)
      .map(([name, _]) => name);
    
    if (lowScoreDimensions.length >= 3) {
      insights.push({
        title: "Multiple Fidelity Issues Detected",
        description: `This URL shows significant issues across ${lowScoreDimensions.length} dimensions. Consider reviewing the content syndication process for this publisher domain.`
      });
    }
    
    // Check structured data specifically
    if (dimensions.metadataFidelity.score < 0.7) {
      insights.push({
        title: "Structured Data Inconsistency",
        description: "Structured data (Schema.org) elements are not properly preserved, which may impact search visibility and rich result opportunities."
      });
    }
    
    // Add publisher domain insight
    const publisherDomain = new URL(data.canonicalUrl).hostname;
    insights.push({
      title: "Publisher Domain Analysis",
      description: `The canonical content is from ${publisherDomain}. Consider adding this domain to regular fidelity monitoring if not already tracked.`
    });
    
    // Add syndication lag insight if dates are available
    if (data.originalSchema.publishedDate && data.canonicalSchema.publishedDate) {
      try {
        const syndicatedDate = new Date(data.originalSchema.publishedDate);
        const canonicalDate = new Date(data.canonicalSchema.publishedDate);
        
        if (!isNaN(syndicatedDate.getTime()) && !isNaN(canonicalDate.getTime())) {
          const diffTime = Math.abs(syndicatedDate - canonicalDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > 0) {
            insights.push({
              title: "Syndication Lag Detected",
              description: `Content was syndicated ${diffDays} day(s) after publication. Consider optimizing syndication workflow for faster content processing.`
            });
          }
        }
      } catch (e) {
        // Skip this insight if date parsing fails
      }
    }
    
    return insights;
  }
  
  // Display results function
  function displayResults(data) {
    // Show results section
    resultsSection.classList.remove('hidden');
    
    // Calculate fidelity dimensions
    const fidelityResults = calculateFidelityDimensions(data.originalSchema, data.canonicalSchema);
    
    // Animate the score (use our new total score)
    animateScore(fidelityResults.totalScore);
    
    // Set URLs (swap them - Canonical first, then Syndicated)
    canonicalUrl.textContent = data.canonicalUrl;
    canonicalUrl.href = data.canonicalUrl;
    originalUrl.textContent = data.originalUrl;
    originalUrl.href = data.originalUrl;
    
    // Set fidelity dimensions
    setDimensionResult(structureMatch, fidelityResults.dimensions.structuralIntegrity.score);
    setDimensionResult(mediaMatch, fidelityResults.dimensions.richMediaPreservation.score);
    setDimensionResult(embedMatch, fidelityResults.dimensions.embedSupport.score);
    setDimensionResult(styleMatch, fidelityResults.dimensions.stylingConsistency.score);
    setDimensionResult(contentMatch, fidelityResults.dimensions.contentCompleteness.score);
    setDimensionResult(metadataMatch, fidelityResults.dimensions.metadataFidelity.score);
    
    // Populate schema stats (swapped - canonical first, then syndicated)
    populateSchemaStats(canonicalStats, data.canonicalSchema);
    populateSchemaStats(originalStats, data.originalSchema);
    
    // Populate comparison table
    populateComparisonTable(data);
    
    // Generate and display recommendations
    const recommendations = generateRecommendations(fidelityResults.dimensions);
    displayRecommendations(recommendations);
    
    // Generate and display system insights
    const insights = generateSystemInsights(data, fidelityResults.dimensions);
    displaySystemInsights(insights);
  }
  
  // Set dimension result helper
  function setDimensionResult(element, score) {
    element.textContent = `${Math.round(score * 100)}%`;
    
    if (score >= 0.8) {
      element.classList.add('match');
    } else if (score >= 0.5) {
      element.classList.add('partial');
    } else {
      element.classList.add('mismatch');
    }
  }
  
  // Display recommendations
  function displayRecommendations(recommendations) {
    if (recommendations.length === 0) {
      recommendationsList.innerHTML = '<p>No specific recommendations at this time. Content fidelity is good across all dimensions.</p>';
      return;
    }
    
    recommendations.forEach(rec => {
      const recItem = document.createElement('div');
      recItem.className = `recommendation-item ${rec.severity}`;
      
      const header = document.createElement('div');
      header.className = 'recommendation-header';
      header.innerHTML = `<i class="fas fa-${rec.severity === 'high' ? 'exclamation-circle' : rec.severity === 'medium' ? 'exclamation-triangle' : 'info-circle'}" style="margin-right: 8px;"></i>${rec.dimension}: ${rec.issue}`;
      
      const body = document.createElement('div');
      body.className = 'recommendation-body';
      body.textContent = rec.recommendation;
      
      recItem.appendChild(header);
      recItem.appendChild(body);
      recommendationsList.appendChild(recItem);
    });
  }
  
  // Display system insights
  function displaySystemInsights(insights) {
    if (insights.length === 0) {
      systemInsightsSection.innerHTML = '<p>No system insights available for this analysis.</p>';
      return;
    }
    
    insights.forEach(insight => {
      const insightItem = document.createElement('div');
      insightItem.className = 'insight-item';
      
      const title = document.createElement('div');
      title.className = 'insight-title';
      title.innerHTML = `<i class="fas fa-chart-line" style="margin-right: 8px;"></i>${insight.title}`;
      
      const description = document.createElement('div');
      description.className = 'insight-description';
      description.textContent = insight.description;
      
      insightItem.appendChild(title);
      insightItem.appendChild(description);
      systemInsightsSection.appendChild(insightItem);
    });
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
    
    // Add schema dates if available
    if (schema.schemaProperties?.datePublished) {
      const date = new Date(schema.schemaProperties.datePublished);
      if (!isNaN(date)) {
        addStatItem(container, 'Schema Published Date', date.toLocaleString());
      }
    }
  }
  
  // Add stat item helper
  function addStatItem(container, label, value) {
    const item = document.createElement('li');
    
    // Add appropriate icons based on the label
    let icon = '';
    if (label.includes('Title')) icon = '<i class="fas fa-heading" style="margin-right: 8px;"></i>';
    else if (label.includes('Description')) icon = '<i class="fas fa-align-left" style="margin-right: 8px;"></i>';
    else if (label.includes('H1')) icon = '<i class="fas fa-h1" style="margin-right: 8px;"></i>';
    else if (label.includes('H2')) icon = '<i class="fas fa-h2" style="margin-right: 8px;"></i>';
    else if (label.includes('Paragraphs')) icon = '<i class="fas fa-paragraph" style="margin-right: 8px;"></i>';
    else if (label.includes('Links')) icon = '<i class="fas fa-link" style="margin-right: 8px;"></i>';
    else if (label.includes('Images')) icon = '<i class="fas fa-image" style="margin-right: 8px;"></i>';
    else if (label.includes('Meta')) icon = '<i class="fas fa-code" style="margin-right: 8px;"></i>';
    else if (label.includes('Structured')) icon = '<i class="fas fa-sitemap" style="margin-right: 8px;"></i>';
    else if (label.includes('Date')) icon = '<i class="fas fa-calendar-alt" style="margin-right: 8px;"></i>';
    
    item.innerHTML = `<span>${icon}${label}:</span> <strong>${value}</strong>`;
    container.appendChild(item);
    
    // Add fade-in animation
    item.style.opacity = '0';
    item.style.transform = 'translateY(10px)';
    item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    setTimeout(() => {
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    }, 100);
  }
  
  // Populate detailed comparison table
  function populateComparisonTable(data) {
    const tableBody = contentComparisonTable.querySelector('tbody');
    tableBody.innerHTML = '';
    
    const canonicalSchema = data.canonicalSchema;
    const originalSchema = data.originalSchema;
    
    // Add section header
    addComparisonSectionHeader('Core Content Elements');
    
    // Add Title comparison
    addTitleComparisonRow();
    
    // Add Meta Description comparison
    addTextComparisonRow('Meta Description', canonicalSchema.description, originalSchema.description);
    
    // Add Date comparisons - prioritize schema dates
    if (canonicalSchema.schemaProperties?.datePublished || originalSchema.schemaProperties?.datePublished) {
      addDateComparisonRow('Schema Published Date', 
                          canonicalSchema.schemaProperties?.datePublished, 
                          originalSchema.schemaProperties?.datePublished);
    } else {
      addDateComparisonRow('Published Date', canonicalSchema.publishedDate, originalSchema.publishedDate);
    }
    
    if (canonicalSchema.modifiedDate || originalSchema.modifiedDate) {
      addDateComparisonRow('Modified Date', canonicalSchema.modifiedDate, originalSchema.modifiedDate);
    }
    
    // Add Main Heading comparison
    addTextComparisonRow('Main Heading (H1)', canonicalSchema.h1Content, originalSchema.h1Content);
    
    // Add Subheadings comparisons
    for (let i = 0; i < Math.max(canonicalSchema.h2Contents?.length || 0, originalSchema.h2Contents?.length || 0); i++) {
      const canonicalH2 = canonicalSchema.h2Contents?.[i] || '';
      const originalH2 = originalSchema.h2Contents?.[i] || '';
      addTextComparisonRow(`Subheading ${i+1} (H2)`, canonicalH2, originalH2);
    }
    
    // Add section header for content
    addComparisonSectionHeader('Article Content');
  
    // Add First Paragraph comparison
    addTextComparisonRow('First Paragraph', canonicalSchema.firstParagraph, originalSchema.firstParagraph, true);
    
    // Add Article Text Sample comparison
    addTextComparisonRow('Article Text Sample', canonicalSchema.articleText, originalSchema.articleText, true);
    
    // Add Meta Keywords comparison
    addTextComparisonRow('Meta Keywords', canonicalSchema.metaKeywords, originalSchema.metaKeywords);
    
    // Add Image comparison
    addImageComparisonRow();
    
    // Add Schema Property comparisons
    addSchemaPropertyComparisons();
    
    // Add section header helper
    function addComparisonSectionHeader(title) {
      const headerRow = document.createElement('tr');
      const headerCell = document.createElement('td');
      headerCell.colSpan = 4;
      headerCell.style.backgroundColor = 'rgba(95, 1, 209, 0.05)';
      headerCell.style.color = '#5f01d1';
      headerCell.style.fontWeight = 'bold';
      headerCell.style.textAlign = 'center';
      headerCell.style.padding = '10px';
      headerCell.innerHTML = `<i class="fas fa-layer-group" style="margin-right: 8px;"></i>${title}`;
      headerRow.appendChild(headerCell);
      tableBody.appendChild(headerRow);
    }
    
    // Helper function to add a text comparison row
    function addTextComparisonRow(element, canonicalContent, originalContent, isLongText = false) {
      if (!canonicalContent && !originalContent) return;
      
      const row = document.createElement('tr');
      
      // Use the enhanced text comparison function
      const textComparison = compareTexts(canonicalContent, originalContent);
      
      // Create cells
      const elementCell = document.createElement('td');
      elementCell.textContent = element;
      
      const canonicalCell = document.createElement('td');
      if (isLongText) {
        canonicalCell.className = 'truncate expand-content';
        canonicalCell.addEventListener('click', function() {
          row.classList.toggle('expanded');
        });
      }
      canonicalCell.textContent = canonicalContent || 'Not found';
      
      const originalCell = document.createElement('td');
      if (isLongText) {
        originalCell.className = 'truncate expand-content';
        originalCell.addEventListener('click', function() {
          row.classList.toggle('expanded');
        });
      }
      originalCell.textContent = originalContent || 'Not found';
      
      const statusCell = document.createElement('td');
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
      row.appendChild(canonicalCell);
      row.appendChild(originalCell);
      row.appendChild(statusCell);
      
      // Append row to table
      tableBody.appendChild(row);
    }
    
    // Title comparison function
    function addTitleComparisonRow() {
      const canonicalTitle = canonicalSchema.title;
      const originalTitle = originalSchema.title;
      
      const titleComparison = compareTitles(canonicalTitle, originalTitle);
      
      const row = document.createElement('tr');
      
      const elementCell = document.createElement('td');
      elementCell.textContent = 'Page Title';
      
      const canonicalCell = document.createElement('td');
      canonicalCell.className = 'truncate expand-content';
      canonicalCell.textContent = canonicalTitle || 'Not found';
      canonicalCell.addEventListener('click', function() {
        row.classList.toggle('expanded');
      });
      
      const originalCell = document.createElement('td');
      originalCell.className = 'truncate expand-content';
      originalCell.textContent = originalTitle || 'Not found';
      originalCell.addEventListener('click', function() {
        row.classList.toggle('expanded');
      });
      
      const statusCell = document.createElement('td');
      
      statusCell.className = 
        titleComparison.match === true ? 'status-match' : 
        titleComparison.match === 'partial' ? 'status-partial' : 
        'status-mismatch';
      statusCell.textContent = titleComparison.message || 
        (titleComparison.match === true ? 'Match' : 
         titleComparison.match === 'partial' ? 'Partial Match' : 
         'Mismatch');
      
      row.appendChild(elementCell);
      row.appendChild(canonicalCell);
      row.appendChild(originalCell);
      row.appendChild(statusCell);
      
      tableBody.appendChild(row);
    }
    
    // Date comparison function
    function addDateComparisonRow(label, canonicalDate, originalDate) {
      if (!canonicalDate && !originalDate) return;
      
      const row = document.createElement('tr');
      
      const elementCell = document.createElement('td');
      elementCell.textContent = label;
      
      const canonicalCell = document.createElement('td');
      const formattedCanonicalDate = canonicalDate ? new Date(canonicalDate).toLocaleString() : 'Not found';
      canonicalCell.textContent = formattedCanonicalDate;
      
      const originalCell = document.createElement('td');
      const formattedOriginalDate = originalDate ? new Date(originalDate).toLocaleString() : 'Not found';
      originalCell.textContent = formattedOriginalDate;
      
      const statusCell = document.createElement('td');
      
      if (!canonicalDate || !originalDate) {
        statusCell.className = 'status-mismatch';
        statusCell.textContent = 'Missing Date';
      } else {
        try {
          const date1 = new Date(canonicalDate);
          const date2 = new Date(originalDate);
          
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
      row.appendChild(canonicalCell);
      row.appendChild(originalCell);
      row.appendChild(statusCell);
      
      tableBody.appendChild(row);
    }
    
    // Image comparison function
    function addImageComparisonRow() {
      const canonicalImage = canonicalSchema.mainImageUrl;
      const originalImage = originalSchema.mainImageUrl;
      
      if (!canonicalImage && !originalImage) return;
      
      const row = document.createElement('tr');
      
      const elementCell = document.createElement('td');
      elementCell.textContent = 'Main Image';
      
      const canonicalCell = document.createElement('td');
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
      
      const originalCell = document.createElement('td');
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
      
      const imageComparison = compareImageUrls(canonicalImage, originalImage);
      
      const statusCell = document.createElement('td');
      statusCell.className = imageComparison.match ? 'status-match' : 'status-mismatch';
      statusCell.textContent = imageComparison.message || (imageComparison.match ? 'Similar Images' : 'Different Images');
      
      row.appendChild(elementCell);
      row.appendChild(canonicalCell);
      row.appendChild(originalCell);
      row.appendChild(statusCell);
      
      tableBody.appendChild(row);
    }
    
    // Schema property comparisons
    function addSchemaPropertyComparisons() {
      if (!canonicalSchema.schemaProperties || !originalSchema.schemaProperties) return;
      
      // Add a header row
      addComparisonSectionHeader('Structured Data Comparison (Schema.org)');
      
      // Add each schema property (excluding publisher which will always be different)
      const props = [
        { name: 'Schema Headline', key: 'headline' },
        { name: 'Schema Authors', key: 'authors', isArray: true },
        { name: 'Schema Date Published', key: 'datePublished', isDate: true },
        // publisher removed as it will always be different
        { name: 'Schema Image', key: 'image', isImage: true },
        { name: 'Schema Article Body', key: 'articleBody', isLongText: true }
      ];
      
      props.forEach(prop => {
        let canonicalValue = canonicalSchema.schemaProperties[prop.key];
        let originalValue = originalSchema.schemaProperties[prop.key];
        
        if (!canonicalValue && !originalValue) return;
        
        if (prop.isArray && Array.isArray(canonicalValue)) {
          canonicalValue = canonicalValue.join(', ');
        }
        
        if (prop.isArray && Array.isArray(originalValue)) {
          originalValue = originalValue.join(', ');
        }
        
        // For image URLs, use the image comparison function
        if (prop.isImage) {
          const imageComparison = compareImageUrls(canonicalValue, originalValue);
          
          const row = document.createElement('tr');
          
          const elementCell = document.createElement('td');
          elementCell.textContent = prop.name;
          
          const canonicalCell = document.createElement('td');
          canonicalCell.className = 'truncate expand-content';
          canonicalCell.textContent = canonicalValue || 'Not found';
          
          const originalCell = document.createElement('td');
          originalCell.className = 'truncate expand-content';
          originalCell.textContent = originalValue || 'Not found';
          
          const statusCell = document.createElement('td');
          statusCell.className = imageComparison.match ? 'status-match' : 'status-mismatch';
          statusCell.textContent = imageComparison.message || (imageComparison.match ? 'Similar Images' : 'Different Images');
          
          row.appendChild(elementCell);
          row.appendChild(canonicalCell);
          row.appendChild(originalCell);
          row.appendChild(statusCell);
          
          tableBody.appendChild(row);
        }
        // For dates
        else if (prop.isDate) {
          if (canonicalValue || originalValue) {
            addDateComparisonRow(prop.name, canonicalValue, originalValue);
          }
        }
        // Regular text comparison
        else {
          addTextComparisonRow(prop.name, canonicalValue, originalValue, prop.isLongText);
        }
      });
    }
  }
});