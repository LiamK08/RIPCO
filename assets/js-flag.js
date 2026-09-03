document.documentElement.className += ' js';
window.addEventListener('error', function (e) {
  var t = e.target;
  if (t && t.tagName === 'SCRIPT' && t.src && t.src.indexOf('script.js') !== -1) {
    document.documentElement.className = document.documentElement.className.replace(/\bjs\b/, '');
  }
}, true);
