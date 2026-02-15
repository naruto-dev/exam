/**
 * Mock Exam System — Single JS library (CDN-deployable)
 * Features: Proctoring, MF-style highlighting, Welcome (name + password), PDF on submit
 * Built from scratch. Use only proctoring-system.js and MF.html as reference.
 */
(function (root) {
  'use strict';

  const JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

  function decodeIfEncoded(str) {
    if (typeof str !== 'string') return str;
    if (str.slice(0, 7) === 'base64:') {
      try { return root.atob(str.slice(7)); } catch (e) { return str; }
    }
    return str;
  }

  // ======================================================================
  //  1. PROCTORING SYSTEM (from proctoring-system.js)
  // ======================================================================

  class ProctoringSystem {
    constructor(options = {}) {
      this.reactivationCode = options.reactivationCode || '1234';
      this.codeTimeout = options.codeTimeout || 60000;
      this.onViolation = options.onViolation || null;
      this.onReactivated = options.onReactivated || null;
      this.onTimeout = options.onTimeout || null;
      this.violations = [];
      this.isViolated = false;
      this.isFullScreen = false;
      this.violationStartTime = null;
      this.timeoutTimer = null;
      this.isActive = false;
      this.violationOverlay = null;
      this.init();
    }

    init() {
      this.createViolationOverlay();
      this.attachEventListeners();
    }

    start() {
      this.isActive = true;
      this.enterFullScreen();
    }

    stop() {
      this.isActive = false;
      this.exitFullScreen();
    }

    enterFullScreen() {
      const elem = document.documentElement;
      if (elem.requestFullscreen) elem.requestFullscreen().catch(function () {});
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
      else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
    }

    exitFullScreen() {
      if (document.exitFullscreen) document.exitFullscreen().catch(function () {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    }

    isInFullScreen() {
      return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
    }

    attachEventListeners() {
      window.addEventListener('blur', this.handleWindowBlur.bind(this));
      window.addEventListener('focus', this.handleWindowFocus.bind(this));
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      document.addEventListener('fullscreenchange', this.handleFullScreenChange.bind(this));
      document.addEventListener('webkitfullscreenchange', this.handleFullScreenChange.bind(this));
      document.addEventListener('msfullscreenchange', this.handleFullScreenChange.bind(this));
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
      document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
      document.addEventListener('copy', this.handleCopy.bind(this));
      document.addEventListener('paste', this.handlePaste.bind(this));
      document.addEventListener('cut', this.handleCut.bind(this));
    }

    handleWindowBlur() {
      if (!this.isActive || this.isViolated) return;
      this.recordViolation('Window focus lost');
      this.showViolation('Window Focus Lost', 'You switched to another window or application');
    }

    handleWindowFocus() {}

    handleVisibilityChange() {
      if (!this.isActive || this.isViolated) return;
      if (document.hidden) {
        this.recordViolation('Tab switched');
        this.showViolation('Tab Switch Detected', 'You switched to another browser tab');
      }
    }

    handleFullScreenChange() {
      if (!this.isActive) return;
      const isFullScreen = this.isInFullScreen();
      if (!isFullScreen && !this.isViolated) {
        this.recordViolation('Exited full screen');
        this.showViolation('Full Screen Exited', 'You exited full screen mode');
      }
      this.isFullScreen = isFullScreen;
    }

    handleKeyDown(e) {
      if (!this.isActive) return;
      const forbidden = [
        e.altKey && e.key === 'Tab',
        e.ctrlKey && e.shiftKey && e.key === 'Escape',
        e.metaKey && e.key === 'Tab',
        e.key === 'F11',
        e.key === 'F12',
        e.ctrlKey && e.key === 'w',
        e.ctrlKey && e.key === 't',
        e.ctrlKey && e.shiftKey && e.key === 'N',
        e.altKey && e.key === 'F4',
        e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'),
        e.ctrlKey && (e.key === 'u' || e.key === 'U'),
        e.metaKey && e.altKey && (e.key === 'I' || e.key === 'J' || e.key === 'U' || e.key === 'C')
      ];
      if (forbidden.some(function (c) { return c; })) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }

    handleContextMenu(e) {
      if (this.isActive) { e.preventDefault(); return false; }
    }
    handleCopy(e) {
      if (this.isActive) { e.preventDefault(); return false; }
    }
    handlePaste(e) {
      if (this.isActive) { e.preventDefault(); return false; }
    }
    handleCut(e) {
      if (this.isActive) { e.preventDefault(); return false; }
    }

    recordViolation(type) {
      const v = { type: type, timestamp: new Date().toISOString(), timeString: new Date().toLocaleString() };
      this.violations.push(v);
      if (this.onViolation) this.onViolation(v, this.violations);
    }

    showViolation(title, message) {
      if (this.isViolated) return;
      this.isViolated = true;
      this.violationStartTime = Date.now();
      document.body.style.backgroundColor = '#000';
      document.body.style.color = '#fff';
      this.violationOverlay.style.display = 'flex';
      var titleEl = this.violationOverlay.querySelector('.violation-title');
      var messageEl = this.violationOverlay.querySelector('.violation-message');
      var inputEl = this.violationOverlay.querySelector('.violation-code-input');
      var timerEl = this.violationOverlay.querySelector('.violation-timer');
      titleEl.textContent = title;
      messageEl.textContent = message;
      inputEl.value = '';
      inputEl.focus();
      this.startCountdown(timerEl);
    }

    hideViolation() {
      this.isViolated = false;
      this.violationStartTime = null;
      if (this.timeoutTimer) { clearInterval(this.timeoutTimer); this.timeoutTimer = null; }
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      this.violationOverlay.style.display = 'none';
      if (this.isActive) this.enterFullScreen();
    }

    startCountdown(timerEl) {
      var self = this;
      function update() {
        if (!self.isViolated) {
          if (self.timeoutTimer) { clearInterval(self.timeoutTimer); self.timeoutTimer = null; }
          return;
        }
        var remaining = Math.max(0, self.codeTimeout - (Date.now() - self.violationStartTime));
        timerEl.textContent = 'Time remaining: ' + Math.ceil(remaining / 1000) + 's';
        if (remaining <= 0) {
          clearInterval(self.timeoutTimer);
          self.handleTimeout();
        }
      }
      update();
      this.timeoutTimer = setInterval(update, 100);
    }

    handleTimeout() {
      var errorEl = this.violationOverlay.querySelector('.violation-error');
      var inputEl = this.violationOverlay.querySelector('.violation-code-input');
      var submitBtn = this.violationOverlay.querySelector('.violation-submit-btn');
      errorEl.textContent = 'Time expired! Test session terminated.';
      errorEl.style.display = 'block';
      inputEl.disabled = true;
      submitBtn.disabled = true;
      this.isActive = false;
      if (this.onTimeout) this.onTimeout(this.violations);
    }

    verifyCode(inputCode) {
      return inputCode === this.reactivationCode;
    }

    handleCodeSubmit() {
      var inputEl = this.violationOverlay.querySelector('.violation-code-input');
      var errorEl = this.violationOverlay.querySelector('.violation-error');
      var code = (inputEl.value || '').trim();
      if (this.verifyCode(code)) {
        errorEl.style.display = 'none';
        this.hideViolation();
        if (this.onReactivated) this.onReactivated(this.violations);
      } else {
        errorEl.textContent = 'Invalid reactivation code. Please try again.';
        errorEl.style.display = 'block';
        inputEl.value = '';
        inputEl.focus();
      }
    }

    createViolationOverlay() {
      var overlay = document.createElement('div');
      overlay.className = 'proctoring-violation-overlay';
      overlay.innerHTML = '<div class="violation-container">' +
        '<div class="violation-icon">!</div>' +
        '<h2 class="violation-title">Violation Detected</h2>' +
        '<p class="violation-message">A proctoring violation has been detected.</p>' +
        '<div class="violation-details">' +
        '<p class="violation-timer">Time remaining: 60s</p>' +
        '<p class="violation-instruction">Enter the reactivation code to continue:</p>' +
        '</div>' +
        '<div class="violation-input-group">' +
        '<input type="password" class="violation-code-input" placeholder="Enter reactivation code" maxlength="20" autocomplete="off" />' +
        '<button class="violation-submit-btn">Submit</button>' +
        '</div>' +
        '<p class="violation-error"></p>' +
        '<div class="violation-warning"><p>All violations are being recorded.</p></div>' +
        '</div>';
      this.addProctoringStyles();
      var submitBtn = overlay.querySelector('.violation-submit-btn');
      var inputEl = overlay.querySelector('.violation-code-input');
      submitBtn.addEventListener('click', this.handleCodeSubmit.bind(this));
      inputEl.addEventListener('keypress', function (e) { if (e.key === 'Enter') this.handleCodeSubmit(); }.bind(this));
      overlay.addEventListener('click', function (e) { if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); } });
      document.body.appendChild(overlay);
      this.violationOverlay = overlay;
    }

    addProctoringStyles() {
      var styleId = 'mock-exam-proctoring-styles';
      if (document.getElementById(styleId)) return;
      var style = document.createElement('style');
      style.id = styleId;
      style.textContent = '.proctoring-violation-overlay{display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;z-index:999999;justify-content:center;align-items:center;font-family:sans-serif}.violation-container{background:#1a1a1a;border:2px solid #f44;border-radius:12px;padding:40px;max-width:500px;width:90%;text-align:center;color:#fff}.violation-icon{font-size:64px;margin-bottom:20px}.violation-title{color:#f44;font-size:28px;margin:0 0 15px}.violation-message{color:#ccc;margin:0 0 30px}.violation-details{background:#0a0a0a;border-radius:8px;padding:20px;margin-bottom:25px}.violation-timer{color:#f44;font-size:20px;font-weight:700;margin:0 0 15px}.violation-instruction{color:#fff;margin:0}.violation-input-group{display:flex;gap:10px;margin-bottom:20px}.violation-code-input{flex:1;padding:15px;font-size:16px;border:2px solid #333;border-radius:8px;background:#0a0a0a;color:#fff;outline:0}.violation-code-input:focus{border-color:#f44}.violation-code-input:disabled{opacity:.5;cursor:not-allowed}.violation-submit-btn{padding:15px 30px;font-size:16px;font-weight:600;background:#f44;color:#fff;border:none;border-radius:8px;cursor:pointer}.violation-submit-btn:hover:not(:disabled){background:#f66}.violation-submit-btn:disabled{opacity:.5;cursor:not-allowed}.violation-error{display:none;color:#f66;font-size:14px;margin:10px 0;padding:12px;background:rgba(255,68,68,.1);border-radius:6px}.violation-warning{margin-top:25px;padding-top:25px;border-top:1px solid #333}.violation-warning p{color:#888;font-size:12px;margin:5px 0}';
      document.head.appendChild(style);
    }

    getViolationCount() {
      return this.violations.length;
    }

    exportViolationsReport() {
      return { totalViolations: this.violations.length, violations: this.violations, exportTime: new Date().toISOString(), exportTimeString: new Date().toLocaleString() };
    }
  }

  // ======================================================================
  //  2. MF-STYLE HIGHLIGHTER
  // ======================================================================

  function addHighlightStyles() {
    var styleId = 'mock-exam-highlight-styles';
    if (document.getElementById(styleId)) return;
    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = '.highlight{background-color:#ffeb3b;cursor:pointer}';
    document.head.appendChild(style);
  }

  function initHighlighting(container) {
    if (!container) return;
    addHighlightStyles();
    container.addEventListener('mouseup', function () {
      var sel = window.getSelection();
      var text = (sel.toString() || '').trim();
      if (text.length === 0) return;
      try {
        var range = sel.getRangeAt(0);
        var span = document.createElement('span');
        span.className = 'highlight';
        range.surroundContents(span);
        sel.removeAllRanges();
      } catch (err) {
        // Cross-element selection: ignore
      }
    });
    container.addEventListener('click', function (e) {
      if (e.target.classList && e.target.classList.contains('highlight')) {
        var parent = e.target.parentNode;
        while (e.target.firstChild) parent.insertBefore(e.target.firstChild, e.target);
        parent.removeChild(e.target);
      }
    });
  }

  // ======================================================================
  //  3. JSPDF LOADER
  // ======================================================================

  function loadJsPDF() {
    return new Promise(function (resolve, reject) {
      if (typeof root.jspdf !== 'undefined') {
        resolve();
        return;
      }
      var script = document.createElement('script');
      script.src = JSPDF_CDN;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Failed to load jsPDF')); };
      document.head.appendChild(script);
    });
  }

  // ======================================================================
  //  4. ANSWER COLLECTION (convention-based)
  // ======================================================================

  function collectAnswers(studentName, proctoringSystem, opts) {
    var options = opts || {};
    var answers = {};
    var allQuestionNums = [];
    document.querySelectorAll('.question-number').forEach(function (el) {
      var num = (el.textContent || '').trim().replace(/^\D+/, '');
      if (num && allQuestionNums.indexOf(num) === -1) allQuestionNums.push(num);
    });
    document.querySelectorAll('[data-question]').forEach(function (el) {
      var q = el.getAttribute('data-question');
      if (q && allQuestionNums.indexOf(q) === -1) allQuestionNums.push(q);
    });
    allQuestionNums.forEach(function (q) { answers[q] = '(not answered)'; });

    var questionItems = document.querySelectorAll('.question-item');
    questionItems.forEach(function (item) {
      var numEl = item.querySelector('.question-number');
      var selected = item.querySelector('.tf-option.selected');
      if (numEl && selected) {
        var num = (numEl.textContent || '').trim().replace(/^\D+/, '');
        if (num) answers[num] = (selected.textContent || '').trim() || '(not answered)';
      }
    });
    questionItems.forEach(function (item) {
      var numEl = item.querySelector('.question-number');
      var selected = item.querySelector('.mc-option.selected');
      if (numEl && selected) {
        var num = (numEl.textContent || '').trim().replace(/^\D+/, '');
        if (num) answers[num] = (selected.textContent || '').trim() || '(not answered)';
      }
    });
    var checkboxGroups = {};
    document.querySelectorAll('input[type="checkbox"][data-question]:checked').forEach(function (el) {
      var q = el.getAttribute('data-question');
      if (q) checkboxGroups[q] = (checkboxGroups[q] || []).concat(el.value || '');
    });
    Object.keys(checkboxGroups).forEach(function (q) {
      answers[q] = checkboxGroups[q].sort().join(', ') || '(not answered)';
    });
    document.querySelectorAll('input[data-question]:not([type="checkbox"])').forEach(function (el) {
      var q = el.getAttribute('data-question');
      if (q) answers[q] = (el.value || '').trim() || '(not answered)';
    });
    document.querySelectorAll('select[data-question]').forEach(function (el) {
      var q = el.getAttribute('data-question');
      if (q) answers[q] = (el.value || '').trim() || '(not answered)';
    });

    if (options.questionCount) {
      for (var i = 1; i <= options.questionCount; i++) {
        var key = String(i);
        if (!(key in answers)) answers[key] = '(not answered)';
      }
    }

    var violationCount = proctoringSystem ? proctoringSystem.getViolationCount() : 0;
    return { studentName: studentName || 'Student', answers: answers, violationCount: violationCount };
  }

  // ======================================================================
  //  5. PDF GENERATION
  // ======================================================================

  function buildAndSavePDF(data, opts) {
    var jspdf = root.jspdf;
    if (!jspdf || !jspdf.jsPDF) return Promise.reject(new Error('jsPDF not loaded'));
    var JsPDF = jspdf.jsPDF;
    var doc = new JsPDF();
    var pw = doc.internal.pageSize.getWidth();
    var m = 20;
    var y = 20;

    doc.setFontSize(20);
    doc.setTextColor(220, 38, 38);
    doc.text(opts.testTitle || 'Mock Exam', pw / 2, y, { align: 'center' });
    y += 12;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Answer Sheet', pw / 2, y, { align: 'center' });
    y += 15;

    doc.text('Student: ' + (data.studentName || '—'), m, y);
    y += 7;
    doc.text('Date: ' + new Date().toLocaleDateString(), m, y);
    y += 7;
    doc.text('Time: ' + new Date().toLocaleTimeString(), m, y);
    y += 7;
    if (opts.testCode) {
      doc.text('Test Code: ' + opts.testCode, m, y);
      y += 7;
    }
    doc.text('Violations: ' + (data.violationCount || 0), m, y);
    y += 12;

    var keys = Object.keys(data.answers).filter(function (k) { return k !== ''; }).sort(function (a, b) { return Number(a) - Number(b) || String(a).localeCompare(String(b)); });
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    doc.text('Answers', m, y);
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    keys.forEach(function (k) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(k + '. ' + (data.answers[k] || '(not answered)'), m + 5, y);
      y += 6;
    });

    var safeName = (data.studentName || 'Student').replace(/\s+/g, '_').replace(/[^\w\-_]/g, '');
    var filename = (opts.pdfFileNamePrefix || 'MockExam_AnswerSheet') + '_' + safeName + '_' + Date.now() + '.pdf';
    doc.save(filename);
    return doc;
  }

  // ======================================================================
  //  6. MOCK EXAM SYSTEM — ORCHESTRATOR
  // ======================================================================

  var MockExamSystem = {
    _opts: null,
    _proctoring: null,
    _studentName: null,

    init: function (opts) {
      var self = this;
      self._opts = opts || {};
      var o = self._opts;

      var welcomeScreenId = o.welcomeScreenId || 'welcomeScreen';
      var examContainerId = o.examContainerId || 'examContainer';
      var studentNameInputId = o.studentNameInputId || 'studentName';
      var passwordInputId = o.passwordInputId || 'examPassword';
      var welcomeErrorId = o.welcomeErrorId || 'welcomeError';
      var startButtonSelector = o.startButtonSelector || '.start-button';
      var studentInfoId = o.studentInfoId || 'studentInfo';
      var passageContentId = o.passageContentId || 'passageContent';
      var submitButtonId = o.submitButtonId || 'submitBtn';

      var welcomeScreen = document.getElementById(welcomeScreenId);
      var examContainer = document.getElementById(examContainerId);
      var studentNameInput = document.getElementById(studentNameInputId);
      var passwordInput = document.getElementById(passwordInputId);
      var welcomeError = document.getElementById(welcomeErrorId);
      var studentInfoEl = document.getElementById(studentInfoId);
      var passageContent = document.getElementById(passageContentId);
      var submitBtn = document.getElementById(submitButtonId);

      if (!welcomeScreen || !examContainer) return self;

      var decodedPassword = o.password != null ? decodeIfEncoded(o.password) : undefined;
      var decodedReactivationCode = decodeIfEncoded(o.reactivationCode !== undefined ? o.reactivationCode : '1234');

      self._proctoring = new ProctoringSystem({
        reactivationCode: decodedReactivationCode,
        codeTimeout: o.codeTimeout || 60000,
        onViolation: o.onViolation || null,
        onReactivated: o.onReactivated || null,
        onTimeout: o.onProctoringTimeout || null
      });

      function showWelcomeError(msg) {
        if (welcomeError) {
          welcomeError.textContent = msg;
          welcomeError.style.display = 'block';
        }
        if (o.invalidPasswordAlert !== false) {
          root.alert(msg);
        }
      }

      function hideWelcomeError() {
        if (welcomeError) {
          welcomeError.textContent = '';
          welcomeError.style.display = 'none';
        }
      }

      function onStartClick() {
        hideWelcomeError();
        var name = studentNameInput ? (studentNameInput.value || '').trim() : '';
        var password = passwordInput ? (passwordInput.value || '').trim() : '';
        var expectedPassword = decodedPassword;

        if (!name) {
          showWelcomeError('Please enter your name.');
          if (studentNameInput) studentNameInput.focus();
          return;
        }
        if (name.length < 2) {
          showWelcomeError('Name must be at least 2 characters.');
          if (studentNameInput) studentNameInput.focus();
          return;
        }
        if (expectedPassword !== undefined && expectedPassword !== null && String(expectedPassword).trim() !== '') {
          if (password !== String(expectedPassword).trim()) {
            showWelcomeError('Invalid password. You cannot start the exam.');
            if (passwordInput) { passwordInput.value = ''; passwordInput.focus(); }
            return;
          }
        }
        hideWelcomeError();

        self._studentName = name;
        welcomeScreen.style.display = 'none';
        examContainer.style.display = 'flex';
        if (studentInfoEl) studentInfoEl.textContent = 'Student: ' + name;

        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(function () {});
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen();
        }

        self._proctoring.start();
        initHighlighting(passageContent || document.body);

        if (typeof o.onExamStart === 'function') o.onExamStart({ studentName: name, timestamp: new Date().toISOString() });
      }

      var startBtn = welcomeScreen.querySelector(startButtonSelector);
      if (startBtn) startBtn.addEventListener('click', onStartClick);

      function onSubmitClick() {
        var data = collectAnswers(self._studentName, self._proctoring, self._opts);
        var resultsModal = document.getElementById('resultsModal');
        var answerSheetEl = document.getElementById('answerSheet');
        if (resultsModal && answerSheetEl) {
          var lines = ['Student: ' + data.studentName, 'Date: ' + new Date().toLocaleDateString(), 'Time: ' + new Date().toLocaleTimeString(), 'Violations: ' + data.violationCount, '', 'Answers:'];
          var keys = Object.keys(data.answers).sort(function (a, b) { return Number(a) - Number(b) || String(a).localeCompare(String(b)); });
          keys.forEach(function (k) { lines.push(k + '. ' + (data.answers[k] || '(not answered)')); });
          answerSheetEl.textContent = lines.join('\n');
          resultsModal.style.display = 'flex';
        }

        loadJsPDF().then(function () {
          buildAndSavePDF(data, {
            testTitle: o.testTitle || 'Mock Exam',
            testCode: o.testCode || '',
            pdfFileNamePrefix: o.pdfFileNamePrefix || 'MockExam_AnswerSheet'
          });
          if (self._proctoring.isActive) self._proctoring.stop();
          if (typeof o.onPDFGenerated === 'function') {
            o.onPDFGenerated({ studentName: data.studentName, violationCount: data.violationCount, answers: data.answers, timestamp: new Date().toISOString() });
          }
        }).catch(function (err) {
          console.error('PDF generation failed:', err);
          if (self._proctoring.isActive) self._proctoring.stop();
        });
      }

      if (submitBtn) {
        submitBtn.addEventListener('click', function (e) {
          e.preventDefault();
          onSubmitClick();
        });
      }

      root.MockExamSystem = MockExamSystem;
      root.ProctoringSystem = ProctoringSystem;
      return self;
    }
  };

  root.MockExamSystem = MockExamSystem;
  root.ProctoringSystem = ProctoringSystem;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MockExamSystem: MockExamSystem, ProctoringSystem: ProctoringSystem };
  }
})(typeof window !== 'undefined' ? window : globalThis);
