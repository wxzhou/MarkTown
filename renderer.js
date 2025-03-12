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
  // 移除顶部按钮引用
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
    
    // 设置 body 的 data-theme 属性，用于特定主题的 CSS 选择器
    document.body.setAttribute('data-theme', theme);
    
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
  
  // 移除文件修改状态相关函数
  
  // 检查文件是否被修改 - 保留此函数但不再更新UI
  function checkFileModified() {
    if (currentFilePath) {
      const currentContent = cmEditor.getValue();
      isFileModified = (currentContent !== originalContent);
      // 不再更新保存按钮UI
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
      
      // 处理 [TOC] 标记
      let hasToc = false;
      let tocHtml = '';
      
      if (protectedText.includes('[TOC]')) {
        hasToc = true;
        // 提取所有标题
        const headings = [];
        const headingRegex = /^(#{1,6})\s+(.+)$/gm;
        let match;
        
        while ((match = headingRegex.exec(protectedText)) !== null) {
          const level = match[1].length;
          const text = match[2].trim();
          const slug = text.toLowerCase()
            .replace(/[^\w\u4e00-\u9fa5\- ]/g, '') // 保留中文字符
            .replace(/\s+/g, '-');
          
          headings.push({ level, text, slug });
        }
        
        // 生成目录HTML
        if (headings.length > 0) {
          tocHtml = '<div class="markdown-toc"><h3>目录</h3><ul>';
          let lastLevel = 0;
          
          headings.forEach(heading => {
            if (heading.level > lastLevel) {
              // 增加嵌套
              for (let i = 0; i < heading.level - lastLevel; i++) {
                tocHtml += '<ul>';
              }
            } else if (heading.level < lastLevel) {
              // 减少嵌套
              for (let i = 0; i < lastLevel - heading.level; i++) {
                tocHtml += '</ul>';
              }
            }
            
            tocHtml += `<li><a href="#${heading.slug}">${heading.text}</a></li>`;
            lastLevel = heading.level;
          });
          
          // 关闭所有嵌套的ul
          for (let i = 0; i < lastLevel; i++) {
            tocHtml += '</ul>';
          }
          
          tocHtml += '</ul></div>';
        }
        
        // 替换 [TOC] 标记
        protectedText = protectedText.replace('[TOC]', tocHtml);
      }
      
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
      
      // 添加ID到标题元素，以便TOC链接可以正常工作
      if (hasToc) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = renderedHtml;
        
        const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(heading => {
          const text = heading.textContent;
          const slug = text.toLowerCase()
            .replace(/[^\w\u4e00-\u9fa5\- ]/g, '')
            .replace(/\s+/g, '-');
          
          heading.id = slug;
        });
        
        renderedHtml = tempDiv.innerHTML;
      }
      
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
      isFileModified = false;
    }
  }
  
  // 保存文件函数
  async function saveFile() {
    const content = cmEditor.getValue();
    const result = await window.electronAPI.saveFile(content);
    
    if (result.success) {
      currentFilePath = result.filePath;
      originalContent = content;
      isFileModified = false;
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
  
  // 移除顶部按钮事件监听
  
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