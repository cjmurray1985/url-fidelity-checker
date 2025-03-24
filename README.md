# URL Fidelity Checker

A powerful tool that checks the fidelity of a URL against its canonical version. This application helps news aggregators and content syndicators verify how faithfully syndicated content maintains the structure and key elements of the original source.

## 🌟 Features

- Extracts canonical URLs from any webpage
- Compares content structure between original and canonical versions
- Calculates a fidelity score based on multiple factors:
  - Title matching (with awareness of site name appending)
  - Meta description comparison
  - Heading structure analysis
  - Content volume evaluation
  - Date publishing verification
  - Schema markup comparison
  - Image analysis
- Presents detailed analysis of similarities and differences in an easy-to-read format
- Special handling for Yahoo URLs and other news aggregators

## 📋 Use Cases

- News aggregators verifying content syndication fidelity
- Publishers checking how their content appears on syndication partners
- Content auditors reviewing cross-domain content consistency
- Digital publishers ensuring proper attribution and content integrity

## 🛠️ Installation

1. Clone this repository:
```bash
git clone https://github.com/cjmurray1985/url-fidelity-checker.git
cd url-fidelity-checker
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
node server.js
```

4. Open your browser and visit:
```
http://localhost:3000
```

## 📊 How It Works

1. Enter a URL to check in the input field
2. The application extracts the canonical URL from the provided webpage
3. If the canonical URL is on a different domain, the application:
   - Extracts schema data from both URLs
   - Compares the content structure
   - Calculates a fidelity score
   - Displays detailed comparison results
4. The comparison includes:
   - Page title comparison (with site name awareness)
   - Meta description analysis
   - Date fidelity checking
   - Heading structure comparison
   - Content volume analysis
   - Image comparison
   - Schema markup verification

## 🧪 Technical Details

- **Backend**: Node.js with Express
- **HTTP Client**: Axios for fetching web pages
- **HTML Parsing**: Cheerio for DOM manipulation and content extraction
- **Frontend**: Vanilla JavaScript, HTML, and CSS

## 🔍 Special Features

- **Smart Text Comparison**: Uses Jaccard similarity to measure content overlap, providing more nuanced comparison than simple match/mismatch
- **Title Comparison Intelligence**: Recognizes and handles site name appending patterns in page titles
- **Yahoo URL Special Handling**: For Yahoo URLs, focuses only on content within the article tag, ignoring navigation and recirculation modules
- **Schema Date Prioritization**: Prioritizes schema dates over meta dates for more accurate date comparison
- **Image Comparison**: Acknowledges cross-domain image hosting realities while still performing basic filename analysis

## 🔮 Future Enhancements

- AI-based image comparison to verify visual similarity despite different filenames
- Support for batch processing multiple URLs
- Historical tracking to monitor changes over time
- Export functionality for reports
- Browser extension for quick checks

## 📝 License

MIT

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/cjmurray1985/url-fidelity-checker/issues).

## 📬 Contact

Created by [@cjmurray1985](https://github.com/cjmurray1985)
