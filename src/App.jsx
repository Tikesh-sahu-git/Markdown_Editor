import { useState, useRef, useEffect } from "react";
import { marked } from "marked";
import { motion, AnimatePresence } from "framer-motion";

// Set marked options
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: function (code, lang) {
    const language = lang || 'plaintext';
    return `<pre class="language-${language}"><code class="language-${language}">${code}</code></pre>`;
  }
});

// Custom renderer for line numbers in code blocks
const renderer = new marked.Renderer();
renderer.code = function(code, language, isEscaped) {
  const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lineCount = code.split('\n').length;
  
  let lineNumbers = '';
  for (let i = 1; i <= lineCount; i++) {
    lineNumbers += `<span class="line-number">${i}</span>\n`;
  }
  
  return `
    <div class="code-block">
      <div class="code-header">
        <span class="language-label">${language || 'text'}</span>
      </div>
      <div class="code-content">
        <div class="line-numbers">${lineNumbers}</div>
        <pre><code class="language-${language || 'text'}">${escapedCode}</code></pre>
      </div>
    </div>
  `;
};

const initialMarkdown = `# Welcome to React Markdown Editor 🚀

## Features
- **Real-time preview** - See changes instantly
- _Keyboard shortcuts_ - Work more efficiently
- 📁 **Download** your markdown files
- 🎨 **Easy formatting** with toolbar
- 📱 **Responsive design** - works on all devices

## Try These Formatting Options:
1. **Bold text** with Ctrl/Cmd+B or the toolbar
2. _Italic text_ with Ctrl/Cmd+I
3. Add [links](https://example.com)
4. Create code blocks:
\`\`\`javascript
function helloWorld() {
  console.log("Hello, Markdown Editor!");
}
\`\`\`

> This is a blockquote - great for highlighting important information

---

Start writing your own content below this line!`;

export default function App() {
  const [markdown, setMarkdown] = useState(() => {
    const saved = localStorage.getItem('markdownContent');
    return saved || initialMarkdown;
  });
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [editorWidth, setEditorWidth] = useState(50);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isSaved, setIsSaved] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    heading: false,
    list: false
  });
  const textAreaRef = useRef(null);
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const history = useRef([markdown]);
  const historyIndex = useRef(0);

  // Update word and character count
  useEffect(() => {
    const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
    const characters = markdown.length;
    setWordCount(words);
    setCharCount(characters);
    
    // Check if text is selected and update active formats
    if (textAreaRef.current) {
      const { selectionStart, selectionEnd } = textAreaRef.current;
      if (selectionStart !== selectionEnd) {
        const selectedText = markdown.substring(selectionStart, selectionEnd);
        setActiveFormats({
          bold: selectedText.startsWith('**') && selectedText.endsWith('**'),
          italic: selectedText.startsWith('_') && selectedText.endsWith('_'),
          heading: selectedText.startsWith('#'),
          list: selectedText.startsWith('-') || selectedText.startsWith('1.')
        });
      } else {
        setActiveFormats({
          bold: false,
          italic: false,
          heading: false,
          list: false
        });
      }
    }
  }, [markdown]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('markdownContent', markdown);
  }, [markdown]);

  const getMarkdownHtml = () => ({ __html: marked.parse(markdown, { renderer }) });

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.md";
    a.click();
    URL.revokeObjectURL(url);
    
    // Show saved feedback
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear the editor? This cannot be undone.")) {
      setMarkdown("");
      addToHistory("");
      setIsSaved(false);
    }
  };

  // History management for undo/redo
  const addToHistory = (content) => {
    // Remove future history if we're not at the end
    if (historyIndex.current < history.current.length - 1) {
      history.current = history.current.slice(0, historyIndex.current + 1);
    }
    
    history.current.push(content);
    historyIndex.current = history.current.length - 1;
  };

  const undo = () => {
    if (historyIndex.current > 0) {
      historyIndex.current--;
      setMarkdown(history.current[historyIndex.current]);
      setIsSaved(false);
    }
  };

  const redo = () => {
    if (historyIndex.current < history.current.length - 1) {
      historyIndex.current++;
      setMarkdown(history.current[historyIndex.current]);
      setIsSaved(false);
    }
  };

  const insertMarkdownSyntax = (syntax) => {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.substring(start, end);
    let newText = syntax.replace("text", selectedText || "text");
    const updatedMarkdown =
      markdown.substring(0, start) + newText + markdown.substring(end);
    
    setMarkdown(updatedMarkdown);
    addToHistory(updatedMarkdown);
    setIsSaved(false);

    textarea.focus();
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + newText.length;
    }, 0);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setMarkdown(newValue);
    addToHistory(newValue);
    setIsSaved(false);
  };

  const toolbarButtons = [
    { md: "**text**", icon: "B", tooltip: "Bold (Ctrl/Cmd+B)", key: "B", active: activeFormats.bold },
    { md: "_text_", icon: "I", tooltip: "Italic (Ctrl/Cmd+I)", key: "I", active: activeFormats.italic },
    { md: "# Heading", icon: "H1", tooltip: "Heading 1 (Ctrl/Cmd+1)", key: "H1" },
    { md: "## Heading", icon: "H2", tooltip: "Heading 2 (Ctrl/Cmd+2)", key: "H2" },
    { md: "### Heading", icon: "H3", tooltip: "Heading 3 (Ctrl/Cmd+3)", key: "H3" },
    { md: "[text](url)", icon: "🔗", tooltip: "Link", key: "L" },
    { md: "![alt](image.png)", icon: "🖼️", tooltip: "Image", key: "M" },
    { md: "- item", icon: "•", tooltip: "Unordered List (Ctrl/Cmd+U)", key: "U", active: activeFormats.list },
    { md: "1. item", icon: "1.", tooltip: "Ordered List (Ctrl/Cmd+O)", key: "O", active: activeFormats.list },
    { md: "> text", icon: "❝", tooltip: "Quote", key: "Q" },
    { md: "```\ncode\n```", icon: "</>", tooltip: "Code Block", key: "C" },
    { md: "---", icon: "―", tooltip: "Horizontal Rule", key: "R" },
  ];

  // Drag functionality
  const handleMouseDown = () => (isDragging.current = true);
  const handleMouseMove = (e) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let newWidth = ((e.clientX - rect.left) / rect.width) * 100;
    if (newWidth < 20) newWidth = 20;
    if (newWidth > 80) newWidth = 80;
    setEditorWidth(newWidth);
  };
  
  useEffect(() => {
    const handleMouseUp = () => (isDragging.current = false);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "TEXTAREA") {
        // Formatting shortcuts
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
          e.preventDefault();
          insertMarkdownSyntax("**text**");
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
          e.preventDefault();
          insertMarkdownSyntax("_text_");
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "1") {
          e.preventDefault();
          insertMarkdownSyntax("# text");
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "2") {
          e.preventDefault();
          insertMarkdownSyntax("## text");
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "3") {
          e.preventDefault();
          insertMarkdownSyntax("### text");
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
          e.preventDefault();
          insertMarkdownSyntax("- text");
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
          e.preventDefault();
          insertMarkdownSyntax("1. text");
        }
        
        // Action shortcuts
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          handleDownload();
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c") {
          e.preventDefault();
          handleClear();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
          e.preventDefault();
          undo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
          e.preventDefault();
          redo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h") {
          e.preventDefault();
          setShowShortcuts(prev => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [markdown]);

  useEffect(() => textAreaRef.current?.focus(), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-gray-800 flex flex-col">
      <div className="container mx-auto p-4 max-w-7xl flex flex-col gap-4 flex-grow">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-600 flex items-center gap-3">
              <span className="bg-blue-600 text-white p-2 rounded-lg shadow-md">M↓</span> Markdown Editor
            </h1>
            <p className="text-sm text-gray-500 mt-1">Create and preview markdown in real-time</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm bg-white px-3 py-1 rounded-full shadow-sm">
              <span className={`font-medium ${wordCount > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                {wordCount} words
              </span>
              <span className="text-gray-400">|</span>
              <span className={charCount > 0 ? 'text-blue-600' : 'text-gray-500'}>
                {charCount} chars
              </span>
              <AnimatePresence>
                {!isSaved && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-amber-500 text-xs flex items-center"
                  >
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse mr-1"></span>
                    Unsaved
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex gap-1">
              <button
                onClick={undo}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-md flex items-center gap-1 text-sm border border-gray-300"
                title="Undo (Ctrl/Cmd+Z)"
              >
                ↶
              </button>
              <button
                onClick={redo}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-md flex items-center gap-1 text-sm border border-gray-300"
                title="Redo (Ctrl/Cmd+Y)"
              >
                ↷
              </button>
            </div>
            
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-md flex items-center gap-1 text-sm"
              title="Keyboard Shortcuts"
            >
              ⌘
            </button>
            
            <button
              onClick={() => setIsPreviewVisible(!isPreviewVisible)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md flex items-center gap-2 md:hidden"
            >
              {isPreviewVisible ? "Hide" : "Show"}
            </button>
            
            <button
              onClick={handleDownload}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md flex items-center gap-2"
            >
              <span>Download</span>
            </button>
            
            <button
              onClick={handleClear}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md flex items-center gap-2"
            >
              <span>Clear</span>
            </button>
          </div>
        </header>

        {/* Keyboard Shortcuts Modal */}
        <AnimatePresence>
          {showShortcuts && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white p-4 rounded-lg shadow-lg border border-blue-200 mb-4"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-blue-600">Keyboard Shortcuts</h3>
                <button 
                  onClick={() => setShowShortcuts(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div><kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl/Cmd</kbd> + <kbd className="bg-gray-100 px-2 py-1 rounded">B</kbd> Bold</div>
                <div><kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl/Cmd</kbd> + <kbd className="bg-gray-100 px-2 py-1 rounded">I</kbd> Italic</div>
                <div><kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl/Cmd</kbd> + <kbd className="bg-gray-100 px-2 py-1 rounded">1</kbd> Heading 1</div>
                <div><kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl/Cmd</kbd> + <kbd className="bg-gray-100 px-2 py-1 rounded">2</kbd> Heading 2</div>
                <div><kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl/Cmd</kbd> + <kbd className="bg-gray-100 px-2 py-1 rounded">3</kbd> Heading 3</div>
                <div><kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl/Cmd</kbd> + <kbd className="bg-gray-100 px-2 py-1 rounded">U</kbd> Unordered List</div>
                <div><kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl/Cmd</kbd> + <kbd className="bg-gray-100 px-2 py-1 rounded">O</kbd> Ordered List</div>
                <div><kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl/Cmd</kbd> + <kbd className="bg-gray-100 px-2 py-1 rounded">S</kbd> Save</div>
                <div><kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl/Cmd</kbd> + <kbd className="bg-gray-100 px-2 py-1 rounded">Z</kbd> Undo</div>
                <div><kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl/Cmd</kbd> + <kbd className="bg-gray-100 px-2 py-1 rounded">Y</kbd> Redo</div>
                <div><kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl/Cmd</kbd> + <kbd className="bg-gray-100 px-2 py-1 rounded">Shift</kbd> + <kbd className="bg-gray-100 px-2 py-1 rounded">C</kbd> Clear</div>
                <div><kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl/Cmd</kbd> + <kbd className="bg-gray-100 px-2 py-1 rounded">H</kbd> Help</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor & Preview */}
        <div
          ref={containerRef}
          className="flex flex-grow h-[calc(100vh-180px)] bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200"
        >
          {/* Editor */}
          <motion.div
            style={{ width: `${editorWidth}%` }}
            className="flex flex-col bg-white overflow-hidden"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 border-b border-gray-200 flex overflow-x-auto sticky top-0 z-10">
              <div className="flex flex-nowrap gap-2">
                {toolbarButtons.map((btn) => (
                  <button
                    key={btn.key}
                    onClick={() => insertMarkdownSyntax(btn.md)}
                    title={btn.tooltip}
                    className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center shadow-sm hover:shadow-md transition-all font-semibold border ${
                      btn.active 
                        ? 'bg-blue-100 text-blue-700 border-blue-300' 
                        : 'bg-white text-blue-600 border-gray-200 hover:border-blue-300'
                    } hover:scale-105`}
                  >
                    {btn.icon}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              ref={textAreaRef}
              value={markdown}
              onChange={handleInputChange}
              placeholder="Write your Markdown here... Start with # for headings, ** for bold, _ for italic, etc."
              className="flex-grow p-5 bg-transparent text-base resize-none focus:outline-none font-mono w-full scroll-smooth leading-relaxed"
              style={{ lineHeight: '1.6' }}
            />
          </motion.div>

          {/* Splitter */}
          {isPreviewVisible && (
            <div
              onMouseDown={handleMouseDown}
              className="w-2 cursor-col-resize bg-gray-200 hover:bg-blue-400 transition-colors flex items-center justify-center group relative"
            >
              <div className="h-10 w-1 bg-gray-400 rounded-full group-hover:bg-white transition-colors"></div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-1 h-8 bg-blue-500 rounded-full"></div>
              </div>
            </div>
          )}

          {/* Preview */}
          {isPreviewVisible && (
            <motion.div
              style={{ width: `${100 - editorWidth}%` }}
              className="flex flex-col bg-white overflow-hidden"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 border-b border-gray-200 font-semibold text-blue-600 sticky top-0 z-10 flex items-center gap-2">
                <span className="bg-blue-600 text-white p-1 rounded shadow-sm">👁️</span> Preview
                <span className="text-xs font-normal text-gray-500 ml-auto">Rendering markdown...</span>
              </div>
              <div
                dangerouslySetInnerHTML={getMarkdownHtml()}
                className="flex-grow p-5 overflow-y-auto prose prose-blue max-w-none scroll-smooth 
                          prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl 
                          prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800 
                          prose-strong:font-bold prose-em:italic 
                          prose-blockquote:border-l-blue-600 prose-blockquote:bg-blue-50 prose-blockquote:py-1 
                          prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-code:font-mono 
                          prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-lg 
                          prose-img:rounded-lg prose-img:shadow-md prose-ul:list-disc prose-ol:list-decimal
                          prose-hr:border-gray-300 prose-table:border-gray-200"
              />
            </motion.div>
          )}
        </div>

        {/* Footer with shortcuts info */}
        <footer className="text-center text-sm text-gray-600 mt-4 p-3 bg-white rounded-lg shadow">
          <p>
            <strong>Tip:</strong> Use the toolbar or keyboard shortcuts for faster formatting. 
            <button 
              onClick={() => setShowShortcuts(true)}
              className="text-blue-600 hover:text-blue-800 underline ml-1"
            >
              View all shortcuts
            </button>
          </p>
        </footer>
      </div>

      <style jsx>{`
        .code-block {
          position: relative;
          margin: 1rem 0;
          border-radius: 0.5rem;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .code-header {
          background-color: #2d3748;
          color: #e2e8f0;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .code-content {
          display: flex;
          background-color: #1a202c;
        }
        
        .line-numbers {
          color: #718096;
          padding: 1rem 0.5rem;
          text-align: right;
          user-select: none;
          border-right: 1px solid #4a5568;
        }
        
        .line-number {
          display: block;
          line-height: 1.5;
        }
        
        .code-content pre {
          margin: 0;
          padding: 1rem;
          flex-grow: 1;
          overflow-x: auto;
        }
        
        .code-content code {
          color: #e2e8f0;
          background: transparent;
        }
        
        .language-label {
          font-family: monospace;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }
      `}</style>
    </div>
  );
}