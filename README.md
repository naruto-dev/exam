# Mock Exam System - CDN Library

A production-ready JavaScript library for creating proctored online exams with built-in security features, text highlighting, and PDF generation.

## 📦 CDN Deployment Options

### Option 1: GitHub Pages (Free & Easy)
1. Create a new GitHub repository
2. Upload `mock-exam-system.min.js` to the repo
3. Enable GitHub Pages in Settings
4. Your CDN URL will be: `https://yourusername.github.io/repo-name/mock-exam-system.min.js`

### Option 2: jsDelivr (Automatic CDN)
1. Upload to GitHub
2. Your CDN URL will be: `https://cdn.jsdelivr.net/gh/yourusername/repo-name@latest/mock-exam-system.min.js`
3. For specific version: `https://cdn.jsdelivr.net/gh/yourusername/repo-name@v1.0.0/mock-exam-system.min.js`

### Option 3: UNPKG (npm-based CDN)
1. Publish to npm: `npm publish`
2. Your CDN URL will be: `https://unpkg.com/your-package-name@latest/mock-exam-system.min.js`

### Option 4: Cloudflare R2 / AWS S3 (Professional)
Upload to cloud storage with public access and CDN distribution.

## 🚀 Quick Start

### Basic HTML Setup

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mock Exam</title>
    <style>
        body { margin: 0; font-family: Arial, sans-serif; }
        .highlight { background: yellow; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    </style>
</head>
<body>
    <!-- Welcome Screen -->
    <div id="welcomeScreen">
        <div class="container">
            <h1>Welcome to the Mock Exam</h1>
            <input id="studentName" type="text" placeholder="Enter your name" />
            <input id="examPassword" type="password" placeholder="Enter exam password" />
            <div id="welcomeError" style="color: red; display: none;"></div>
            <button class="start-button">Start Exam</button>
        </div>
    </div>

    <!-- Exam Container -->
    <div id="examContainer" style="display: none;">
        <div id="studentInfo"></div>
        <div id="passageContent">
            <p>Question 1: What is 2+2?</p>
            <input type="radio" name="q1" value="A"> A) 3<br>
            <input type="radio" name="q1" value="B"> B) 4<br>
            <input type="radio" name="q1" value="C"> C) 5<br>
        </div>
        <button id="submitBtn">Submit Exam</button>
    </div>

    <!-- Results Modal -->
    <div id="resultsModal" style="display: none;">
        <h2>Exam Submitted</h2>
        <pre id="answerSheet"></pre>
    </div>

    <!-- Include the library -->
    <script src="https://your-cdn-url.com/mock-exam-system.min.js"></script>
    
    <!-- Initialize -->
    <script>
        MockExamSystem.init({
            password: 'exam123',              // Optional exam password
            reactivationCode: '1234',         // Code to restore after violation
            testTitle: 'Mathematics Exam',
            testCode: 'MATH-2024-01',
            codeTimeout: 60000,               // 60 seconds to enter code
            onExamStart: function(data) {
                console.log('Exam started:', data);
            },
            onPDFGenerated: function(data) {
                console.log('PDF generated:', data);
            }
        });
    </script>
</body>
</html>
```

## 📚 API Reference

### MockExamSystem.init(options)

Initialize the exam system with configuration options.

**Options:**
```javascript
{
    // UI Element IDs
    welcomeScreenId: 'welcomeScreen',        // Welcome screen element ID
    examContainerId: 'examContainer',        // Exam content container ID
    studentNameInputId: 'studentName',       // Student name input field ID
    passwordInputId: 'examPassword',         // Password input field ID
    welcomeErrorId: 'welcomeError',          // Error message element ID
    startButtonSelector: '.start-button',    // Start button CSS selector
    studentInfoId: 'studentInfo',            // Student info display element ID
    passageContentId: 'passageContent',      // Exam content element ID
    submitButtonId: 'submitBtn',             // Submit button ID
    
    // Exam Configuration
    password: 'your-password',               // Exam access password (optional)
    reactivationCode: '1234',                // Code to restore after violation
    testTitle: 'Mock Exam',                  // Title for PDF
    testCode: '',                            // Test code for PDF
    codeTimeout: 60000,                      // Time to enter reactivation code (ms)
    pdfFileNamePrefix: 'MockExam_AnswerSheet', // PDF filename prefix
    invalidPasswordAlert: true,              // Show alert on invalid password
    
    // Event Callbacks
    onExamStart: function(data) {},          // Called when exam starts
    onPDFGenerated: function(data) {},       // Called when PDF is generated
    onViolation: function(violation, all) {}, // Called on proctoring violation
    onReactivated: function() {},            // Called when exam is reactivated
    onProctoringTimeout: function() {}       // Called on timeout
}
```

### ProctoringSystem

Can be used standalone for custom implementations:

```javascript
const proctoring = new ProctoringSystem({
    reactivationCode: '1234',
    codeTimeout: 60000,
    onViolation: (violation, allViolations) => {
        console.log('Violation detected:', violation);
    },
    onReactivated: () => {
        console.log('Exam reactivated');
    },
    onTimeout: () => {
        console.log('Timeout reached');
    }
});

proctoring.start();  // Start monitoring
proctoring.stop();   // Stop monitoring
```

## 🎨 Features

### 1. Proctoring System
- Full-screen enforcement
- Tab switch detection
- Window blur detection
- Keyboard shortcut blocking
- Right-click prevention
- Copy/paste/cut blocking
- Violation logging with timestamps

### 2. Text Highlighting
- Click and drag to highlight text
- Multiple highlight colors
- Works like major exam platforms (Mometrix, ETS, etc.)

### 3. PDF Generation
- Automatic answer sheet generation
- Includes student info, violations, and answers
- Downloads on exam submission

### 4. Welcome Screen
- Student name collection
- Optional password protection
- Input validation

## 🔒 Security Features

The library blocks:
- Alt+Tab, Cmd+Tab (window switching)
- F11, F12 (fullscreen/devtools)
- Ctrl+W, Ctrl+T (close/new tab)
- Ctrl+Shift+I/J/C (developer tools)
- Ctrl+U (view source)
- Right-click context menu
- Copy, paste, cut operations
- Tab visibility changes
- Full-screen exits

## 📝 Answer Collection

The system automatically collects answers from:
- Radio buttons: `<input type="radio" name="q1" value="A">`
- Checkboxes: `<input type="checkbox" name="q2" value="B">`
- Text inputs: `<input type="text" name="q3">`
- Textareas: `<textarea name="q4"></textarea>`
- Selects: `<select name="q5"><option value="A">A</option></select>`

## 🎯 Base64 Password Encoding

For added security, you can encode passwords:

```javascript
// Encode password
const encoded = 'base64:' + btoa('your-password');

// Use in initialization
MockExamSystem.init({
    password: 'base64:eW91ci1wYXNzd29yZA==',  // 'your-password' encoded
    reactivationCode: 'base64:MTIzNA=='        // '1234' encoded
});
```

## 📦 File Sizes

- Original: 24 KB
- Minified: 15 KB (38% smaller)
- Gzipped: ~5 KB (estimated)

## 🌐 Browser Support

- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Opera: ✅
- IE 11: ⚠️ (limited support)

## 📄 License

This library is ready for distribution. Add your license information here.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues or questions, please create an issue in the GitHub repository.
