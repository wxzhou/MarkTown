// 引入marked库
const markedScript = document.createElement('script');
markedScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
document.head.appendChild(markedScript);

// 引入highlight.js
const hlScript = document.createElement('script');
hlScript.src = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js';
document.head.appendChild(hlScript);

// 引入highlight.js样式表 - 使用与当前主题匹配的样式
const hlCss = document.createElement('link');
hlCss.rel = 'stylesheet';
hlCss.href = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css';
hlCss.id = 'highlight-style';
document.head.appendChild(hlCss);

// 直接使用CDN引入KaTeX
document.write(`
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js" onload="initKaTeX()"></script>
`);

// 初始化KaTeX
window.initKaTeX = function() {
  console.log('KaTeX 已加载');
  if (document.getElementById('preview')) {
    renderMathInElement(document.getElementById('preview'), {
      delimiters: [
        {left: "$$", right: "$$", display: true},
        {left: "$", right: "$", display: false},
        {left: "\\[", right: "\\]", display: true},
        {left: "\\(", right: "\\)", display: false}
      ],
      throwOnError: false,
      output: 'html'  // 使用HTML输出
    });
  }
};

// 等待库加载完成
window.onload = function() {
  // 初始化CodeMirror编辑器
  const editorWrapper = document.getElementById('editor-wrapper');
  const cmEditor = CodeMirror(editorWrapper, {
    mode: 'markdown',
    lineNumbers: true,
    lineWrapping: true,
    theme: 'default',
    extraKeys: {"Enter": "newlineAndIndentContinueMarkdownList"},
    styleActiveLine: true,
    placeholder: "在此输入Markdown内容...",
  });
  
  const preview = document.getElementById('preview');
  const openBtn = document.getElementById('open-btn');
  const saveBtn = document.getElementById('save-btn');
  const themeBtn = document.getElementById('theme-btn');
  const themeContent = document.querySelector('.theme-content');
  const themeLinks = document.querySelectorAll('.theme-content a');
  const themeStyle = document.getElementById('theme-style');
  
  // 添加文件内容跟踪
  let originalContent = '';
  let isFileModified = false;
  let currentFilePath = null;
  
  // 添加分隔条拖动功能
  const resizer = document.getElementById('resizer');
  const container = document.querySelector('.container');
  const editorContainer = document.querySelector('.editor-container');
  const previewContainer = document.querySelector('.preview-container');
  
  // 简化的拖动处理
  let isResizing = false;
  
  resizer.addEventListener('mousedown', function(e) {
    // 阻止默认行为和文本选择
    e.preventDefault();
    isResizing = true;
    
    // 添加活动状态样式
    resizer.classList.add('active');
    document.body.style.cursor = 'col-resize';
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isResizing) return;
    
    // 获取容器位置信息
    const containerRect = container.getBoundingClientRect();
    
    // 计算鼠标在容器内的相对位置
    const mouseX = e.clientX - containerRect.left;
    
    // 计算百分比位置（限制在20%-80%之间）
    const percentage = Math.min(Math.max(
      (mouseX / containerRect.width) * 100, 
      20
    ), 80);
    
    // 设置编辑器和预览区的宽度
    editorContainer.style.width = percentage + '%';
    previewContainer.style.width = (100 - percentage) + '%';
  });
  
  document.addEventListener('mouseup', function() {
    if (isResizing) {
      isResizing = false;
      resizer.classList.remove('active');
      document.body.style.cursor = '';
    }
  });
  
  let currentTheme = 'github-light';
  
  // 监听主题设置
  window.electronAPI.onSetTheme((theme) => {
    setTheme(theme);
  });
  
  // 设置主题
  function setTheme(theme) {
    currentTheme = theme;
    themeStyle.href = `styles/${theme}.css`;
    
    // 更新主题按钮文本为当前主题名称
    const themeNames = {
      'github-light': 'GitHub Light',
      'github-dark': 'GitHub Dark',
      'solarized-light': 'Solarized Light',
      'solarized-dark': 'Solarized Dark',
      'dracula': 'Dracula'
    };
    themeBtn.textContent = themeNames[theme] || theme;
    
    // 更新CodeMirror主题
    if (theme === 'github-dark' || theme === 'dracula') {
      cmEditor.setOption('theme', 'dracula');
    } else if (theme === 'solarized-light') {
      cmEditor.setOption('theme', 'solarized');
    } else if (theme === 'solarized-dark') {
      cmEditor.setOption('theme', 'solarized dark');
    } else {
      cmEditor.setOption('theme', 'default');
    }
    
    // 同时更新代码高亮样式
    const hlStyle = document.getElementById('highlight-style');
    if (theme === 'github-dark' || theme === 'solarized-dark' || theme === 'dracula') {
      hlStyle.href = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github-dark.min.css';
      document.body.classList.add('dark-mode');
    } else {
      hlStyle.href = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css';
      document.body.classList.remove('dark-mode');
    }
    
    // 保存主题设置
    window.electronAPI.saveTheme(theme);
  }
  
  // 设置文件修改状态
  function setModifiedState(modified) {
    if (isFileModified !== modified) {
      isFileModified = modified;
      if (modified) {
        saveBtn.textContent = "*保存";
        saveBtn.classList.add('modified');
      } else {
        saveBtn.textContent = "保存";
        saveBtn.classList.remove('modified');
      }
    }
  }
  
  // 检查文件是否被修改
  function checkFileModified() {
    if (currentFilePath) {
      const currentContent = cmEditor.getValue();
      setModifiedState(currentContent !== originalContent);
    }
  }
  
  // 实时渲染Markdown
  function renderMarkdown() {
    const markdownText = cmEditor.getValue();
    
    // 使用marked渲染Markdown
    if (window.marked) {
      // 确保highlight.js已加载
      if (!window.hljs) {
        console.warn('highlight.js 尚未加载，等待加载...');
      }
      
      // 保护数学公式不被marked处理
      const mathBlocks = [];
      let protectedText = markdownText.replace(/\$\$([\s\S]*?)\$\$/g, function(match) {
        mathBlocks.push(match);
        return `MATHBLOCK${mathBlocks.length - 1}ENDMATHBLOCK`;
      });
      
      // 使用简单配置
      marked.setOptions({
        highlight: function(code, lang) {
          if (window.hljs && lang && hljs.getLanguage(lang)) {
            try {
              console.log(`尝试高亮 ${lang} 代码`);
              return hljs.highlight(lang, code).value;
            } catch (e) {
              console.error('高亮错误:', e);
              try {
                // 尝试新版API
                return hljs.highlight(code, { language: lang }).value;
              } catch (e2) {
                console.error('新版API高亮错误:', e2);
              }
            }
          }
          return code;
        },
        langPrefix: 'hljs language-',
        gfm: true,
        breaks: true
      });
      
      // 渲染Markdown
      let renderedHtml = marked.parse(protectedText);
      
      // 恢复数学公式
      renderedHtml = renderedHtml.replace(/MATHBLOCK(\d+)ENDMATHBLOCK/g, function(match, index) {
        return mathBlocks[parseInt(index)];
      });
      
      preview.innerHTML = renderedHtml;
      
      // 手动应用highlight.js
      if (window.hljs) {
        const codeBlocks = preview.querySelectorAll('pre code');
        codeBlocks.forEach((block) => {
          hljs.highlightBlock(block);
        });
      }
      
      // 渲染数学公式
      if (typeof window.renderMathInElement === 'function') {
        console.log('尝试渲染数学公式');
        window.renderMathInElement(preview, {
          delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "$", right: "$", display: false},
            {left: "\\[", right: "\\]", display: true},
            {left: "\\(", right: "\\)", display: false}
          ],
          throwOnError: false,
          output: 'html'  // 使用HTML输出
        });
      } else {
        console.warn('renderMathInElement 函数不可用，等待加载...');
        // 如果KaTeX尚未加载，设置一个检查器
        let checkCount = 0;
        const checkInterval = setInterval(() => {
          checkCount++;
          if (typeof window.renderMathInElement === 'function') {
            console.log('KaTeX 现在可用，渲染数学公式');
            window.renderMathInElement(preview, {
              delimiters: [
                {left: "$$", right: "$$", display: true},
                {left: "$", right: "$", display: false}
              ],
              throwOnError: false
            });
            clearInterval(checkInterval);
          } else if (checkCount > 20) {
            console.error('KaTeX 加载超时');
            clearInterval(checkInterval);
          }
        }, 200);
      }
    }
  }
  
  // 打开文件函数
  async function openFile() {
    const result = await window.electronAPI.openFile();
    if (!result.canceled && !result.error) {
      cmEditor.setValue(result.content);
      currentFilePath = result.filePath;
      originalContent = result.content;
      setModifiedState(false);
    }
  }
  
  // 保存文件函数
  async function saveFile() {
    const content = cmEditor.getValue();
    const result = await window.electronAPI.saveFile(content);
    
    if (result.success) {
      currentFilePath = result.filePath;
      originalContent = content;
      setModifiedState(false);
      console.log('文件已保存:', result.filePath);
    } else if (result.error) {
      console.error('保存失败:', result.error);
    }
  }
  
  // 编辑器内容变化时渲染预览并检查修改状态
  cmEditor.on('change', () => {
    renderMarkdown();
    checkFileModified();
  });
  
  // 打开按钮点击事件
  openBtn.addEventListener('click', openFile);
  
  // 保存按钮点击事件
  saveBtn.addEventListener('click', saveFile);
  
  // 主题按钮点击事件
  themeBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // 阻止事件冒泡
    themeContent.classList.toggle('show');
  });
  
  // 点击其他地方关闭主题下拉菜单
  document.addEventListener('click', (event) => {
    if (!themeBtn.contains(event.target)) {
      themeContent.classList.remove('show');
    }
  });
  
  // 主题选择
  themeLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const theme = e.target.getAttribute('data-theme');
      setTheme(theme);
      themeContent.classList.remove('show');
    });
  });
  
  // 监听来自主进程的菜单事件
  window.electronAPI.onMenuOpenFile(() => {
    console.log('收到打开文件菜单事件');
    openFile();
  });

  window.electronAPI.onMenuSaveFile(() => {
    console.log('收到保存文件菜单事件');
    saveFile();
  });
  
  // 初始化渲染
  renderMarkdown();
  
  // 设置初始宽度
  editorContainer.style.width = '50%';
  previewContainer.style.width = '50%';
  editorContainer.style.flex = '0 0 auto';
  previewContainer.style.flex = '0 0 auto';
};