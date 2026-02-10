# Notes Markdown Writing Guide

This guide explains how to write revision notes in Markdown so they render correctly on the platform. The system supports standard Markdown plus special callout boxes for educational content.

---

## How Notes Are Displayed

Notes are **automatically split into separate cards** at every `## Heading`. Each `## ` heading starts a new visual card/section on the page, creating the clean card-per-topic layout similar to ZNotes and SaveMyExams.

**Key rules:**
- `# Title` — Use for the main topic title (rendered at the top, very large)
- `## Section` — Each `## ` heading creates a **new card**. This is how you split content into visual sections. The first `##` heading appears much larger (topic name).
- `### Sub-heading` — Rendered inside the current card as a sub-section
- `#### Sub-sub-heading` — Smaller heading inside the current card

**Visual hierarchy:**
- First `##` heading: `text-3xl sm:text-4xl` (much larger, centered)
- Subsequent `##` headings: `text-xl sm:text-2xl` (standard section size)
- `###` headings: `text-lg sm:text-xl`
- `####` headings: `text-base sm:text-lg`

**Example structure:**
```markdown
# Encryption

Some intro text about encryption...

## Types of Encryption

- **Caesar Cipher:** A special type of algorithm...
- **Symmetric Encryption:** Requires both sender and recipient...
- **Asymmetric Encryption:** Uses a public key and private key...

## Applications of Encryption

- **Hard Disk:** Every bit of stored data is encrypted...
- **HTTPS:** Uses SSL or TLS to encrypt web pages...
- **Email Encryption:** Uses asymmetric encryption...

## Worked Example on Encryption

> **Worked Example**
>
> Explain two differences between symmetric and asymmetric encryption. [4]
>
> Answer
>
> Symmetric uses one shared key for both encryption and decryption [1]
> while asymmetric uses a public key to encrypt and a private key to decrypt [1]
>
> In symmetric encryption, the key must be shared securely between parties [1]
> while in asymmetric encryption, only the public key needs to be shared [1]
```

This would render as **4 separate cards** on the page:
1. "Encryption" intro card
2. "Types of Encryption" card
3. "Applications of Encryption" card
4. "Worked Example on Encryption" card

If your markdown has **no `## ` headings**, it renders as a single card.

---

## Basic Formatting

| Syntax | Result |
|--------|--------|
| `**bold text**` | **bold text** |
| `*italic text*` | *italic text* |
| `***bold italic***` | ***bold italic*** |
| `` `inline code` `` | `inline code` |
| `~~strikethrough~~` | ~~strikethrough~~ |

---

## Centered Content

Wrap any content in `<center>` tags to center it:

```markdown
<center>

### This heading is centered

Some centered text here.

</center>
```

This works for headings, paragraphs, images, or any content you want centered on the page.

---

## Keyword Highlighting

Use `<mark>` tags to highlight important keywords with color emphasis:

```markdown
A <mark>NIC</mark> is needed to allow a device to connect to a <mark>network</mark>.
```

This renders the highlighted words with:
- **Light mode**: Bold black text with light green background
- **Dark mode**: Emerald green text with dark green background

This provides color emphasis rather than yellow highlighting, making key terms stand out professionally.

---

## Lists

### Bullet List
```markdown
- First item
- Second item
  - Nested item
  - Another nested item
- Third item
```

**Note:** Bullet lists use round bullets (•) not dashes (-), matching SaveMyExams style.

### Numbered List
```markdown
1. First step
2. Second step
3. Third step
```

### Mixed (definition-style, like ZNotes)
```markdown
- **Caesar Cipher:** A special type of algorithm that defines a set of rules to follow to encrypt.
- **Symmetric Encryption:** This encryption requires both the sender and recipient to possess a key known as a private key.
- **Asymmetric Encryption:** This encryption has a public key for the sender to encrypt and a private key for the recipient to decrypt.
```

This format is perfect for definitions and key concepts, with the term in bold followed by its explanation.

---

## Images

Insert images using the toolbar's image upload button, or paste/drag-and-drop images into the editor. The syntax is:

```markdown
![Description of the image](https://your-image-url.com/image.png)
```

**Important notes about images:**
- Images render **without captions** - the alt text is used for accessibility only
- Images are automatically centered and have rounded corners with shadow
- **You can paste images directly** (Ctrl+V) — they auto-upload to Supabase storage
- **You can drag and drop** image files into the editor
- Images are optimized for web and lazy-loaded for performance

No caption text will appear below images, keeping the layout clean and focused on the content.

---

## Tables

```markdown
| Feature | Hub | Switch |
|---------|-----|--------|
| Sends data to | All devices | Specific device |
| Uses | Broadcasting | MAC address table |
| Efficiency | Low | High |
| Security | Low | Higher |
```

**Table styling:**
- Tables have clear borders with shaded headers
- Responsive design - horizontal scroll on mobile
- Clean, professional appearance matching SaveMyExams style
- Left-aligned text for readability

---

## Horizontal Rule (Section Divider)

Use `---` on its own line to create a horizontal divider within a card:

```markdown
Some content above the line.

---

Some content below the line.
```

---

## Links

```markdown
[Click here for more info](https://example.com)
```

---

## Code Blocks

For showing code or technical examples:

````markdown
```python
def encrypt(text, key):
    result = ""
    for char in text:
        result += chr(ord(char) + key)
    return result
```
````

Inline code: `` Use the `print()` function ``

---

## LaTeX / Math (if enabled)

If the note has "Has LaTeX" enabled in the admin editor:

Inline math: `$E = mc^2$`

Block math:
```markdown
$$
\sum_{i=1}^{n} x_i = x_1 + x_2 + \cdots + x_n
$$
```

---

## Special Callout Boxes

These are the educational callout boxes that render with colored borders, icons, and special styling. They use blockquote syntax (`> `).

### Exam Tip (amber/yellow)
```markdown
> **Exam Tip:** Always mention MAC addresses when discussing switches vs hubs. The examiner is looking for specific technical terminology.
```

### Key Definition (blue)
```markdown
> **Key Definition:** A **hub** is a networking device that broadcasts incoming data to all connected devices on the network.
```

### Common Mistake / Warning (red)
```markdown
> **Common Mistake:** Students often confuse switches and routers. A switch operates at the data link layer using MAC addresses, while a router operates at the network layer using IP addresses.
```

### Note / Info (violet)
```markdown
> **Note:** This topic frequently appears in Paper 1, Section A. Make sure you can explain at least 3 differences between hubs and switches.
```

### Worked Example (green, SaveMyExams style)

This is the most complex callout. It renders with a green border, pencil icon, the question, marks, and a green-colored answer section.

```markdown
> **Worked Example**
>
> Explain the difference between a hub and a switch. [2]
>
> Answer
>
> A hub broadcasts data to all connected devices [1]
>
> A switch only sends data to the intended recipient using a MAC address table [1]
```

**Structure:**
1. First line must be `> **Worked Example**`
2. Question text follows
3. Marks in square brackets like `[2]` or `[4 marks]`
4. The word `Answer` on its own line separates question from answer
5. Answer text renders in green

**Multi-part worked example:**
```markdown
> **Worked Example**
>
> (a) Define the term "encryption". [2]
>
> (b) State one reason why encryption is used for online banking. [1]
>
> [3]
>
> Answer
>
> (a) Encryption is the process of converting plaintext into ciphertext [1] so that it cannot be understood without a decryption key [1]
>
> (b) To protect sensitive financial data from being intercepted by hackers during transmission [1]
```

---

## Styling Features & Best Practices

### Typography & Spacing
- **Line spacing**: Automatically set to 1.5x for better readability
- **Font hierarchy**: Clear visual hierarchy with different heading sizes
- **Responsive text**: Headings scale appropriately on mobile devices

### Color Scheme
- **Light mode**: Clean, professional appearance with subtle colors
- **Dark mode**: Optimized contrast with emerald green accents for keywords
- **Consistent styling**: Matches SaveMyExams/ZNotes aesthetic

### Layout Tips
- **Card-based design**: Each `##` heading creates a new visual card
- **Mobile responsive**: Tables scroll horizontally on small screens
- **Clean spacing**: Generous margins and padding for readability
- **Professional appearance**: Subtle shadows, rounded corners, and borders

### Content Organization
1. **Start with a clear topic title** using `#` or first `##` heading
2. **Use `##` headings** to break content into digestible cards
3. **Include callout boxes** for important information
4. **Add worked examples** with the special callout format
5. **Use tables** for comparisons and structured data
6. **Highlight keywords** with `<mark>` for emphasis

### Accessibility
- **Semantic HTML**: Proper heading structure (h1 → h2 → h3)
- **Image alt text**: Always provide descriptive alt text for images
- **Color contrast**: High contrast in both light and dark modes
- **Screen reader friendly**: Proper markup for assistive technologies

---

## Complete Example Note

Here's a full example of how a topic note should be structured:

```markdown
# Network Hardware

## Hub

### What is a hub?

- A hub is a networking device which is used to **connect multiple devices** in a network
- Hubs are "**dumb**" devices that pass on anything received on **one connection** to all other connections
- **All data is sent to all devices**, this can lead to network inefficiencies and security issues

> **Key Definition:** A **hub** is a device that connects multiple devices in a network and broadcasts all received data to every connected device.

## Switch

### What is a switch?

- A network switch is a device that **connects multiple devices** on a network together
- Unlike a hub, a switch **only sends data to the device it was intended for**, which improves network efficiency
- This is done by a switch having a **lookup table**
- When a switch receives a data packet, it examines the destination **MAC address** of the packet and looks up that address in the lookup table
- Once it has found the matching MAC address it will then **forward the data packet** to the corresponding device

> **Exam Tip:** When comparing hubs and switches, always mention that switches use MAC address tables to direct traffic, while hubs broadcast to all ports.

## Comparison Table

| Feature | Hub | Switch |
|---------|-----|--------|
| Data sending | Broadcasts to all | Sends to specific device |
| Uses MAC addresses | No | Yes |
| Network efficiency | Low | High |
| Security | Low | Higher |
| Cost | Cheaper | More expensive |

## Worked Examples

> **Worked Example**
>
> Explain two differences between a hub and a switch. [4]
>
> Answer
>
> A hub sends data to all connected devices [1] whereas a switch only sends data to the intended recipient [1]
>
> A hub does not use MAC addresses [1] whereas a switch maintains a MAC address table to direct traffic [1]

> **Common Mistake:** Don't confuse a switch with a router. A switch connects devices within the same network (LAN) using MAC addresses, while a router connects different networks using IP addresses.
```

---

## Copy-Paste Workflow

**Yes, you can copy-paste existing markdown directly into the editor.** Here's the recommended workflow:

1. **Write or generate** your markdown content anywhere (ChatGPT, Google Docs, VS Code, Notion, etc.)
2. **Copy** the entire markdown text
3. **Paste** it into the markdown editor on the admin page
4. **Add images** using the toolbar's image upload button — click where you want the image, then click the image icon
5. **Preview** your content using the "Preview" tab in the editor
6. **Save** as draft or publish

**Tips:**
- Make sure your content uses `## ` headings to split into cards
- You can paste images directly (Ctrl+V) — they auto-upload without captions
- You can drag and drop image files into the editor
- The preview tab shows exactly how the note will look to students
- Use the callout toolbar buttons to insert callout templates at the cursor position
- Line spacing is automatically set to 1.5x for better readability
- Use `<mark>` for keyword emphasis instead of yellow highlighting
- Tables have professional borders and styling automatically applied

---

## Toolbar Quick Reference

The editor toolbar provides buttons for:

| Button | Action |
|--------|--------|
| **B** | Bold text |
| *I* | Italic text |
| H1 | Heading 1 |
| H2 | Heading 2 (creates new card) |
| H3 | Heading 3 |
| • | Bullet list |
| 1. | Numbered list |
| > | Blockquote |
| `<>` | Code block |
| Table | Insert table template |
| 🔗 | Insert link |
| — | Horizontal rule |
| 📷 | Upload image |
| ✏️ | Worked Example callout |
| 💡 | Exam Tip callout |
| 📖 | Key Definition callout |
| ⚠️ | Common Mistake callout |
