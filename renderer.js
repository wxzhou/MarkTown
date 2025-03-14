// 加载marked库
const markedScript = document.createElement('script');
markedScript.src = 'https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js';
document.head.appendChild(markedScript);

// 加载highlight.js
const hlScript = document.createElement('script');
hlScript.src = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js';
document.head.appendChild(hlScript);

// 加载highlight.js样式
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
  // 标签页管理
  const tabsContainer = document.getElementById('tabs');
  const newTabBtn = document.getElementById('new-tab-btn');
  
  // 编辑器和文件状态数组
  const editors = [];
  let activeTabIndex = -1;
  
  // 创建新标签页
  function createNewTab(filePath = null, content = '') {
    const tabIndex = editors.length;
    
    // 创建标签元素
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.index = tabIndex;
    
    // 获取文件名
    const fileName = filePath ? filePath.split('/').pop() : '未命名';
    
    // 创建标签标题
    const tabTitle = document.createElement('div');
    tabTitle.className = 'tab-title';
    tabTitle.textContent = fileName;
    tab.appendChild(tabTitle);
    
    // 创建关闭按钮
    const closeBtn = document.createElement('div');
    closeBtn.className = 'tab-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tabIndex);
    });
    tab.appendChild(closeBtn);
    
    // 点击标签切换
    tab.addEventListener('click', () => {
      switchToTab(tabIndex);
    });
    
    // 添加标签到容器
    tabsContainer.appendChild(tab);
    
    // 创建编辑器实例
    const editorInstance = {
      filePath: filePath,
      originalContent: content,
      isModified: false,
      editor: null,
      content: content
    };
    
    // 添加到编辑器数组
    editors.push(editorInstance);
    
    // 切换到新标签
    switchToTab(tabIndex);
    
    return tabIndex;
  }
  
  // 切换到指定标签
  function switchToTab(index) {
    if (index < 0 || index >= editors.length) return;
    
    // 如果当前有活动标签，保存其内容
    if (activeTabIndex >= 0 && activeTabIndex < editors.length) {
      const activeEditor = editors[activeTabIndex];
      if (activeEditor.editor) {
        activeEditor.content = activeEditor.editor.getValue();
      }
    }
    
    // 更新标签样式
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    tabs[index].classList.add('active');
    
    // 设置新的活动标签
    activeTabIndex = index;
    
    // 获取当前编辑器实例
    const currentEditor = editors[activeTabIndex];
    
    // 清空编辑器容器
    const editorWrapper = document.getElementById('editor-wrapper');
    editorWrapper.innerHTML = '';
    
    // 获取当前主题对应的CodeMirror主题
    const theme = document.body.getAttribute('data-theme') || 'github-light';
    let cmTheme = 'default';
    if (theme === 'github-dark' || theme === 'dracula') {
      cmTheme = 'dracula';
    } else if (theme === 'solarized-light') {
      cmTheme = 'solarized';
    } else if (theme === 'solarized-dark') {
      cmTheme = 'solarized dark';
    }
    
    // 重新创建编辑器实例，确保内容正确显示
    currentEditor.editor = CodeMirror(editorWrapper, {
      mode: 'markdown',
      lineNumbers: true,
      lineWrapping: true,
      theme: cmTheme,
      extraKeys: {"Enter": "newlineAndIndentContinueMarkdownList"},
      styleActiveLine: true,
      placeholder: "在此输入Markdown内容...",
      value: currentEditor.content
    });
    
    // 添加变化监听
    currentEditor.editor.on('change', () => {
      renderMarkdown(currentEditor.editor);
      checkFileModified(currentEditor);
      
      // 更新标签标题（添加修改标记）
      updateTabTitle(activeTabIndex);
    });
    
    // 渲染预览
    renderMarkdown(currentEditor.editor);
  }
  
  // 关闭标签
  function closeTab(index) {
    if (editors.length <= 1) {
      // 至少保留一个标签
      createNewTab();
      return;
    }
    
    // 移除标签元素
    const tabToRemove = document.querySelector(`.tab[data-index="${index}"]`);
    if (tabToRemove) {
      tabToRemove.remove();
    }
    
    // 从数组中移除
    editors.splice(index, 1);
    
    // 更新剩余标签的索引
    document.querySelectorAll('.tab').forEach((tab, i) => {
      tab.dataset.index = i;
    });
    
    // 如果关闭的是当前活动标签，切换到其他标签
    if (activeTabIndex === index) {
      const newIndex = Math.min(index, editors.length - 1);
      switchToTab(newIndex);
    } else if (activeTabIndex > index) {
      // 如果关闭的标签在当前活动标签之前，更新活动标签索引
      activeTabIndex--;
    }
  }
  
  // 更新标签标题（添加修改标记）
  function updateTabTitle(index) {
    const editor = editors[index];
    if (!editor) return;
    
    const tab = document.querySelector(`.tab[data-index="${index}"]`);
    if (!tab) return;
    
    const tabTitle = tab.querySelector('.tab-title');
    if (!tabTitle) return;
    
    // 获取文件名
    let fileName = editor.filePath ? editor.filePath.split('/').pop() : '未命名';
    
    // 检查是否已修改
    const content = editor.editor ? editor.editor.getValue() : editor.content;
    editor.isModified = (content !== editor.originalContent);
    
    // 添加修改标记
    if (editor.isModified) {
      if (!fileName.endsWith('*')) {
        fileName += '*';
      }
    } else {
      fileName = fileName.replace(/\*$/, '');
    }
    
    tabTitle.textContent = fileName;
  }
  
  // 检查文件是否被修改
  function checkFileModified(editorInstance) {
    if (!editorInstance || !editorInstance.editor) return;
    
    const currentContent = editorInstance.editor.getValue();
    editorInstance.isModified = (currentContent !== editorInstance.originalContent);
  }
  
  // 实时渲染Markdown
  function renderMarkdown(editor) {
    if (!editor) return;
    
    const markdownText = editor.getValue();
    const preview = document.getElementById('preview');
    
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
              return hljs.highlight(lang, code).value;
            } catch (e) {
              try {
                // 尝试新版API
                return hljs.highlight(code, { language: lang }).value;
              } catch (e2) {
                console.error('高亮错误:', e2);
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
        window.renderMathInElement(preview, {
          delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "$", right: "$", display: false},
            {left: "\\[", right: "\\]", display: true},
            {left: "\\(", right: "\\)", display: false}
          ],
          throwOnError: false,
          output: 'html'
        });
      }
    }
  }
  
  // 设置主题
  function setTheme(theme) {
    console.log('设置主题:', theme);
    
    // 更新主题样式表
    const themeStyle = document.getElementById('theme-style');
    if (themeStyle) {
      themeStyle.href = `styles/${theme}.css`;
    }
    
    // 设置 body 的 data-theme 属
    document.body.setAttribute('data-theme', theme);
    
    // 更新高亮样式
    const hlStyle = document.getElementById('highlight-style');
    if (hlStyle) {
      if (theme === 'github-dark' || theme === 'solarized-dark' || theme === 'dracula') {
        hlStyle.href = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github-dark.min.css';
        document.body.classList.add('dark-mode');
      } else {
        hlStyle.href = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css';
        document.body.classList.remove('dark-mode');
      }
    }
    
    // 更新当前活动编辑器的主题
    if (activeTabIndex >= 0 && activeTabIndex < editors.length) {
      const activeEditor = editors[activeTabIndex];
      if (activeEditor && activeEditor.editor) {
        let cmTheme = 'default';
        if (theme === 'github-dark' || theme === 'dracula') {
          cmTheme = 'dracula';
        } else if (theme === 'solarized-light') {
          cmTheme = 'solarized';
        } else if (theme === 'solarized-dark') {
          cmTheme = 'solarized dark';
        }
        activeEditor.editor.setOption('theme', cmTheme);
      }
    }
    
    // 保存主题设置
    window.electronAPI.saveTheme(theme);
  }
  
  // 打开文件函数
  async function openFile() {
    const result = await window.electronAPI.openFile();
    if (!result.canceled && !result.error) {
      // 创建新标签并加载文件
      createNewTab(result.filePath, result.content);
    }
  }
  
  // 保存文件函数
  async function saveFile() {
    if (activeTabIndex < 0 || activeTabIndex >= editors.length) return;
    
    const currentEditor = editors[activeTabIndex];
    if (!currentEditor || !currentEditor.editor) return;
    
    const content = currentEditor.editor.getValue();
    const result = await window.electronAPI.saveFile(content, currentEditor.filePath);
    
    if (result.success) {
      currentEditor.filePath = result.filePath;
      currentEditor.originalContent = content;
      currentEditor.isModified = false;
      
      // 更新标签标题
      updateTabTitle(activeTabIndex);
      
      console.log('文件已保存:', result.filePath);
    } else if (result.canceled) {
      console.log('用户取消了保存操作');
    } else if (result.error) {
      console.error('保存失败:', result.error);
    }
  }
  
  // 另存为函数
  async function saveFileAs() {
    if (activeTabIndex < 0 || activeTabIndex >= editors.length) return;
    
    const currentEditor = editors[activeTabIndex];
    if (!currentEditor || !currentEditor.editor) return;
    
    const content = currentEditor.editor.getValue();
    const result = await window.electronAPI.saveFileAs(content);
    
    if (result.success) {
      currentEditor.filePath = result.filePath;
      currentEditor.originalContent = content;
      currentEditor.isModified = false;
      
      // 更新标签标题
      updateTabTitle(activeTabIndex);
      
      console.log('文件已另存为:', result.filePath);
    } else if (result.canceled) {
      console.log('用户取消了另存为操作');
    } else if (result.error) {
      console.error('另存为失败:', result.error);
    }
  }
  
  // 新建标签按钮事件
  newTabBtn.addEventListener('click', () => {
    createNewTab();
  });
  
  // 将新建标签按钮移到最右边标签页的右侧
  try {
    // 获取父元素
    const parentElement = newTabBtn.parentElement;
    
    // 如果新建按钮不在tabsContainer中，则移动它
    if (parentElement && parentElement !== tabsContainer) {
      // 从当前父元素中移除按钮
      parentElement.removeChild(newTabBtn);
      
      // 将按钮添加到tabsContainer中
      tabsContainer.appendChild(newTabBtn);
    }
    
    // 调整样式，确保按钮紧贴着最右边的标签页
    newTabBtn.style.order = '999'; // 使用较大的order值确保它在最右边
    newTabBtn.style.marginLeft = '0';
    newTabBtn.style.borderLeft = 'none'; // 移除左边框，使其紧贴标签页
  } catch (error) {
    console.error('移动新建标签按钮时出错:', error);
    // 出错时不影响其他功能
  }
  
  // 初始化第一个标签
  createNewTab();
  
  // 设置初始宽度
  const editorContainer = document.querySelector('.editor-container');
  const previewContainer = document.querySelector('.preview-container');
  editorContainer.style.width = '50%';
  previewContainer.style.width = '50%';
  editorContainer.style.flex = '0 0 auto';
  previewContainer.style.flex = '0 0 auto';
  
  // 监听主题设置事件
  window.electronAPI.onSetTheme((theme) => {
    console.log('收到主题设置事件:', theme);
    setTheme(theme);
  });
  
  // 监听菜单事件
  window.electronAPI.onMenuNewFile(() => {
    console.log('收到新建文件菜单事件');
    createNewTab();
  });
  
  window.electronAPI.onMenuOpenFile(() => {
    console.log('收到打开文件菜单事件');
    openFile();
  });
  
  window.electronAPI.onMenuSaveFile(() => {
    console.log('收到保存文件菜单事件');
    saveFile();
  });
  
  window.electronAPI.onMenuSaveAsFile(() => {
    console.log('收到另存为菜单事件');
    saveFileAs();
  });
  
  // 加载保存的主题
  window.electronAPI.getTheme()
    .then(savedTheme => {
      console.log('加载保存的主题:', savedTheme);
      if (savedTheme) {
        setTheme(savedTheme);
      }
    })
    .catch(err => {
      console.error('加载主题出错:', err);
    });
};