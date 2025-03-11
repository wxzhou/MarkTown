# Markdown Syntax Guide

## Basic Syntax

### Headings
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

### Emphasis
*This text is italicized*
_This is also italicized_
**This text is bold**
__This is also bold__
***This text is bold and italicized***
~~This text is strikethrough~~

$a=b^2$ is a formula.

$$\begin{bmatrix}
a & b \\
c & d
\end{bmatrix}$$

### Lists

#### Unordered List
* Item 1
* Item 2
  * Subitem 2.1
  * Subitem 2.2
- Item 3
- Item 4
  - Subitem 4.1
  - Subitem 4.2

#### Ordered List
1. First item
2. Second item
   1. Subitem 2.1
   2. Subitem 2.2
3. Third item

### Links
[Visit GitHub](https://github.com)
[Link with Title](https://www.google.com "Google's Homepage")

### Images
![Markdown Logo](https://markdown-here.com/img/icon256.png)
![Alt Text](https://example.com/image.jpg "Image Title")

### Blockquotes
> This is a blockquote
> 
> This is the second line of the blockquote
>> This is a nested blockquote

### Code

#### Inline Code
Use `console.log()` to print to the console

#### Code Blocks
```python
def foo(name):
    print('Hello,', name)
```