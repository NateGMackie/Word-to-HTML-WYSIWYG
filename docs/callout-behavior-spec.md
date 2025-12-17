# **Callout Behavior Specification**
### *WYSIWYG Editor — Current Behavior (2025-11-29)*

This document describes the expected behaviors of callouts within the WYSIWYG editor. These behaviors apply to all callout types (**note**, **example**, **warning**, **blockquote**) unless otherwise specified.

The logic reflects the current implementation in:

- `CalloutNode.js`
- `CalloutBridgePlugin.jsx`
- `InitialParagraphPlugin.jsx`

---

## **1. Overview**

Callouts are block-level containers used to provide semantic emphasis.  
Applying a callout triggers one of several behaviors depending on editor context:

- Create a new blank callout  
- Wrap existing content in a callout  
- Insert a callout inside list items  
- Wrap multiple selected blocks  
- Insert labels (`Note:` / `Example:`) when appropriate  
- Position the caret in predictable ways  

---

## **2. Behaviors**

### **2.1 Empty Line → Create Callout**

**Trigger:**  
Selection is on a completely empty line at the root.

**Behavior:**  
- Create a new callout block.  
- For **note** and **example**:  
  - Insert label: `<strong>Note:&nbsp;</strong>` or `<strong>Example:&nbsp;</strong>`  
  - Place caret after the label.  
- For other callout types:  
  - Insert empty paragraph inside the callout and place caret inside it.

**Status:** Implemented and verified.

---

### **2.2 Single Paragraph → Wrap Paragraph in Callout**

**Trigger:**  
Caret is inside a paragraph that contains text.

**Behavior:**  
- Wrap the paragraph node in the chosen callout.  
- For note/example: insert the label at the beginning of the paragraph.  
- **Caret remains where it originally was.**

**Status:** Implemented and verified.

---

### **2.3 Single List Item → Insert Step-level Callout**

**Trigger:**  
Selection is **collapsed** inside a single list item (`<li>`).

**Behavior:**  
- Insert a *new blank* callout **inside the list item**, directly after the line/paragraph containing the caret.  
- For note/example:  
  - Add label and move caret after the label.
- For other types:  
  - Insert blank `<p>` and place caret inside it.

**Status:** Implemented and verified.

**Notes:**  
- Only occurs on **collapsed** selection inside one list item.  
- Prevents accidental wrapping when multiple list items are selected.

---

### **2.4 Multiple List Items Selected → Wrap Entire List in Callout**

**Trigger:**  
Selection spans **two or more list items** inside the same list.

**Behavior:**  
- The **entire list (`<ul>` / `<ol>`)** is wrapped in a single callout.  
- For note/example:  
  - Insert label paragraph at top of the callout.  
- Caret remains in its original position.

**Status:** Implemented and verified.

---

### **2.5 Multi-select at Root → Wrap Selected Blocks**

**Trigger:**  
Selection spans multiple **top-level sibling** blocks whose parent is the root.

This includes:
- Multiple paragraphs  
- Paragraphs + lists  
- Several lists  

**Behavior:**  
- Create one callout.  
- Insert it before the first selected block.  
- Move all selected blocks inside the callout in order.  
- Insert label for note/example.  
- Preserve caret position.

**Status:** Implemented and verified.

---

## **3. Label Behavior (Note/Example)**

### **3.1 When Labels Are Added**

A label is added when applying **note** or **example** and:

- The callout is newly created and empty, **or**
- Wrapping existing content that does not already begin with a label.

### **3.2 Label Format**

```css
<strong>Note:\u00A0</strong>
```
or
```css
<strong>Example:\u00A0</strong>
```

### **3.3 Caret Placement Rules**

| Situation | Caret Move? | Reason |
|----------|--------------|--------|
| Blank callout (root or list) | ✔ Yes | Writer is starting fresh content |
| Step-level callout | ✔ Yes | Always a blank callout |
| Wrapping paragraph with existing text | ✘ No | Avoid disorienting jump |
| Wrapping entire list | ✘ No | Existing text should retain caret |
| Multi-select at root | ✘ No | Preserves user intent |

---

## **4. Caret Summary Table**

| Action | Caret Behavior |
|--------|----------------|
| Create note/example callout on blank line | Moves after label |
| Create step-level callout | Moves after label |
| Wrap existing paragraph | Stays where it was |
| Wrap entire list | Stays where it was |
| Wrap multiple selected blocks | Stays where it was |

---

## **5. Current Limitations**

These are intentional or inherent to the current implementation:

- Callouts cannot be nested (adding one inside another is prevented).  
- Step-level callouts cannot wrap list items—only blank callouts can be inserted under them.  
- Some edge cases may surface when lists contain mixed paragraphs or nested lists.  

---

## **6. Future Enhancements (Not Yet Implemented)**

Potential improvements for later versions:

- Ability to split or merge callouts.  
- Buttons for moving callouts up/down in the document.  
- Adding icons or visual headers instead of text labels.  
- Collapsible callouts for long notes.  
- Keyboard shortcuts (e.g., `Ctrl+Shift+N` for note).  

---

## **7. Regression Test Matrix**

Use this table to verify behavior after future changes.

### **7.1 Single-caret Tests**

| Scenario | Steps | Expected Result |
|---------|--------|-----------------|
| Empty editor → Note | Click editor → select Note | Blank callout, label, caret after label |
| Paragraph → Note | Type text → click Note | Wrapped paragraph, label added, caret unchanged |
| List item → Note | Create list → place caret in step → click Note | Blank callout under step with label |

---

### **7.2 Selection Tests**

| Scenario | Steps | Expected Result |
|----------|--------|-----------------|
| Select multiple paragraphs | Drag select P1–P2 → Note | Both paragraphs wrapped in callout |
| Select multiple list items | Select Step 1–Step 3 → Example | Entire `<ul>` wrapped in callout |
| Mixed selection (para + list) | Drag across both → Warning | All wrapped in one callout |
| Select partial content inside one paragraph | Highlight part of text → Note | Only that paragraph wrapped; caret preserved |

---

## **8. File References**

- `CalloutNode.js` — defines callout structure, export behavior, and label insertion.  
- `CalloutBridgePlugin.jsx` — context-sensitive logic for applying callouts.  
- `InitialParagraphPlugin.jsx` — ensures the root always contains at least one paragraph.  
- `WysiwygEditor.jsx` — plugin composition and editor configuration.

---

*Document updated: 2025-11-29*
