const fs = require('fs');
const path = require('path');

const themeScript = `  <script>
    (function () {
      const savedTheme = localStorage.getItem('siteTheme') || 'minimal';
      if (savedTheme !== 'default') {
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
      const themeColors = {
        'default': '#B45309',
        'green': '#047857',
        'blue': '#1E40AF',
        'golden': '#AA8A2E',
        'black': '#0A0A0A',
        'frost': '#E0F2FE',
        'minimal': '#000000'
      };
      document.write('<meta name="theme-color" content="' + (themeColors[savedTheme] || '#B45309') + '">');
    })();
  </script>`;

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('dist') && !file.includes('.git')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.html')) results.push(file);
        }
    });
    return results;
}

const htmlFiles = walk('.');

htmlFiles.forEach(filepath => {
    let content = fs.readFileSync(filepath, 'utf8');

    // Clean up any existing versions of the script to avoid duplication
    content = content.replace(/<script>\s*\(function\s*\(\)\s*\{[\s\S]*?themeColors[\s\S]*?\}\)\(\);\s*<\/script>/g, '');
    content = content.replace(/<meta name="theme-color" content=".*?">/g, '');

    // Inject the new script at the top of <head>
    if (content.includes('<head>')) {
        content = content.replace('<head>', '<head>\n' + themeScript);
        fs.writeFileSync(filepath, content);
        console.log(`Updated ${filepath}`);
    }
});
