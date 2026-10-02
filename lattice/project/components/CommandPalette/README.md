命令面板：⌘K / Ctrl+K 打开的模态对话框。当前行由一小群点标出，上下移动时点群流到新行；输入按子序列过滤。

## 使用
- `mountCommands([{ id, key, en, zh?, hint?, run }])` 返回 `{ open, close }`。
- `key` 用一个汉字或字母作为行首标记，不要用符号字符代替图标。
